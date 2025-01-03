import React, { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import { Dropdown } from "react-native-element-dropdown";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const TripBooking = () => {
  // Form state
  const [bookingType, setBookingType] = useState("Round-trip");
  const [bookingDate, setBookingDate] = useState(new Date());
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  // Error states
  const [errors, setErrors] = useState({
    bookingDate: "",
    expirationDate: "",
    pickupLocation: "",
    dropoffLocation: "",
    capacity: "",
  });

  // Modal states
  const [showBookingDatePicker, setShowBookingDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeLocationField, setActiveLocationField] = useState(null);

  const data = [
    { label: "Round-trip", value: "Round-trip" },
    { label: "One-way", value: "One-way" },
  ];

  // Validation functions
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      bookingDate: "",
      expirationDate: "",
      pickupLocation: "",
      dropoffLocation: "",
      capacity: "",
    };

    // Validate booking date
    if (!bookingDate) {
      newErrors.bookingDate = "Booking date is required";
      isValid = false;
    } else if (bookingDate < new Date()) {
      newErrors.bookingDate = "Booking date cannot be in the past";
      isValid = false;
    }

    // Validate expiration date
    if (!expirationDate) {
      newErrors.expirationDate = "Expiration date is required";
      isValid = false;
    } else if (expirationDate <= bookingDate) {
      newErrors.expirationDate = "Expiration date must be after booking date";
      isValid = false;
    }

    // Validate pickup location
    if (!pickupLocation) {
      newErrors.pickupLocation = "Pickup location is required";
      isValid = false;
    }

    // Validate dropoff location
    if (!dropoffLocation) {
      newErrors.dropoffLocation = "Dropoff location is required";
      isValid = false;
    }

    // Validate capacity
    if (!capacity) {
      newErrors.capacity = "Capacity is required";
      isValid = false;
    } else if (isNaN(capacity) || parseInt(capacity) <= 0) {
      newErrors.capacity = "Capacity must be a positive number";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Date picker handlers with unified approach for both platforms
  const showDatePicker = (type) => {
    if (type === 'booking') {
      setShowBookingDatePicker(true);
    } else {
      setShowExpirationDatePicker(true);
    }
  };

  const onDateChange = (type) => (event, selectedDate) => {
    const isBooking = type === 'booking';
    if (Platform.OS === 'android') {
      isBooking ? setShowBookingDatePicker(false) : setShowExpirationDatePicker(false);
    }
    
    if (selectedDate) {
      if (isBooking) {
        setBookingDate(selectedDate);
        setErrors(prev => ({ ...prev, bookingDate: "" }));
      } else {
        setExpirationDate(selectedDate);
        setErrors(prev => ({ ...prev, expirationDate: "" }));
      }
    }
  };

  // Location picker handlers
  const openLocationPicker = (type) => {
    setActiveLocationField(type);
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (coordinate) => {
    if (activeLocationField === "pickup") {
      setPickupLocation({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      setErrors(prev => ({ ...prev, pickupLocation: "" }));
    } else {
      setDropoffLocation({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      setErrors(prev => ({ ...prev, dropoffLocation: "" }));
    }
    setShowLocationPicker(false);
  };

  const getLocationDisplayText = (location) => {
    if (!location) return "Select location";
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  // Render date picker based on platform
  const renderDatePicker = (type) => {
    const isBooking = type === 'booking';
    const show = isBooking ? showBookingDatePicker : showExpirationDatePicker;
    const date = isBooking ? bookingDate : expirationDate;
    const onChange = onDateChange(type);

    if (!show) return null;

    if (Platform.OS === 'ios') {
      return (
        <Modal transparent={true} visible={show} animationType="slide">
          <View style={styles.modalView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isBooking ? "Select Booking Date" : "Select Expiration Date"}
              </Text>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={onChange}
                minimumDate={isBooking ? new Date() : bookingDate}
              />
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => isBooking ? setShowBookingDatePicker(false) : setShowExpirationDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={() => isBooking ? setShowBookingDatePicker(false) : setShowExpirationDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="default"
        onChange={onChange}
        minimumDate={isBooking ? new Date() : bookingDate}
      />
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please check all fields");
      return;
    }

    let token = await AsyncStorage.getItem("token");

    try {
      const dropoffLocationString = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
      const pickupLocationString = `${pickupLocation.latitude},${pickupLocation.longitude}`;
      
      const res = await axios.post(
        `${BASE_URl}/api/tripBookings/create`,
        {
          bookingType,
          bookingDate,
          expirationDate,
          pickupLocation: pickupLocationString,
          dropoffLocation: dropoffLocationString,
          capacity: parseInt(capacity),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.data.code === 200) {
        Alert.alert("Success", res.data.message);
        // Reset form here if needed
      }
    } catch (error) {
      console.log(error);
      const responseData = error.response?.data;
      if (responseData?.code === 200 && responseData?.message === "Validation failed") {
        const validationMessages = Object.values(responseData.data).join("\n");
        Alert.alert("Validation Error", validationMessages);
      } else {
        Alert.alert("Error", error.response?.data?.message || "An error occurred!");
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Booking Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Booking Type</Text>
              <Dropdown
                style={[styles.dropdown, styles.input]}
                data={data}
                labelField="label"
                valueField="value"
                placeholder="Select a type"
                value={bookingType}
                onChange={(item) => setBookingType(item.value)}
              />
            </View>

            {/* Booking Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Booking Date</Text>
              <TouchableOpacity
                style={[styles.input, errors.bookingDate && styles.inputError]}
                onPress={() => showDatePicker('booking')}
              >
                <Text>{bookingDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {errors.bookingDate && (
                <Text style={styles.errorText}>{errors.bookingDate}</Text>
              )}
              {renderDatePicker('booking')}
            </View>

            {/* Expiration Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Expiration Date</Text>
              <TouchableOpacity
                style={[styles.input, errors.expirationDate && styles.inputError]}
                onPress={() => showDatePicker('expiration')}
              >
                <Text>{expirationDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {errors.expirationDate && (
                <Text style={styles.errorText}>{errors.expirationDate}</Text>
              )}
              {renderDatePicker('expiration')}
            </View>

            {/* Pickup Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pickup Location</Text>
              <TouchableOpacity
                style={[styles.locationButton, errors.pickupLocation && styles.inputError]}
                onPress={() => openLocationPicker("pickup")}
              >
                <Text>{getLocationDisplayText(pickupLocation)}</Text>
              </TouchableOpacity>
              {errors.pickupLocation && (
                <Text style={styles.errorText}>{errors.pickupLocation}</Text>
              )}
            </View>

            {/* Dropoff Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dropoff Location</Text>
              <TouchableOpacity
                style={[styles.locationButton, errors.dropoffLocation && styles.inputError]}
                onPress={() => openLocationPicker("dropoff")}
              >
                <Text>{getLocationDisplayText(dropoffLocation)}</Text>
              </TouchableOpacity>
              {errors.dropoffLocation && (
                <Text style={styles.errorText}>{errors.dropoffLocation}</Text>
              )}
            </View>

            {/* Capacity */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={[styles.input, errors.capacity && styles.inputError]}
                value={capacity}
                onChangeText={(text) => {
                  setCapacity(text);
                  setErrors(prev => ({ ...prev, capacity: "" }));
                }}
                keyboardType="numeric"
                placeholder="Enter capacity"
              />
              {errors.capacity && (
                <Text style={styles.errorText}>{errors.capacity}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Book Trip</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Location Picker Modal */}
        <Modal
          visible={showLocationPicker}
          animationType="slide"
          onRequestClose={() => setShowLocationPicker(false)}
        >
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: 21.0285,
                longitude: 105.8542,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(e) => handleLocationSelect(e.nativeEvent.coordinate)}
            >
              {activeLocationField === "pickup" && pickupLocation && (
                <Marker coordinate={pickupLocation} title="Pickup Location" />
              )}
              {activeLocationField === "dropoff" && dropoffLocation && (
                <Marker coordinate={dropoffLocation} title="Dropoff Location" />
              )}
            </MapView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#ff0000",
  },
  errorText: {
    color: "#ff0000",
    fontSize: 12,
    marginTop: 5,
  },
  dropdown: {
    backgroundColor: "#fafafa",
    borderColor: "#ccc",
    borderborderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  locationButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  modalView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f2f2f2",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#000",
    textAlign: "center",
    fontSize: 16,
  },
  confirmButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TripBooking;