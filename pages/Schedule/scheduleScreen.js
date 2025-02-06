import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  FlatList,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

const ScheduleScreen = () => {
  const [locations, setLocations] = useState({
    startLocation: null,
    endLocation: null,
  });

  const [startDay, setStartDay] = useState(new Date());
  const [endDay, setEndDay] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState(null); // 'start' or 'end'
  const [availableCapacity, setAvailableCapacity] = useState("");
  const [initialRegion, setInitialRegion] = useState(null);


  const [locationState, setLocationState] = useState(null);
  const [titlePickup, setTitlePickup] = useState("");
  const [titleDropoff, setTitleDropoff] = useState("");
  const [startLocationAddress, setStartLocationAddress] = useState("");
  const [endLocationAddress, setEndLocationAddress] = useState("");


  const [touched, setTouched] = useState({
    startLocation: false,
    endLocation: false,
    startDay: false,
    endDay: false,
    capacity: false,
  });

  const [errors, setErrors] = useState({
    startLocation: "",
    endLocation: "",
    startDay: "",
    endDay: "",
    capacity: "",
  });

  const [isMapVisible, setIsMapVisible] = useState(false);
  const [selectingPoint, setSelectingPoint] = useState(null);
  const bottomSheetRef = useRef(null);

  // Platform specific date picker handling
  const showPicker = (type) => {
    setDateType(type);
    setShowDatePicker(true);
  };

  const showLocationPicker = (type) => {
    setSelectingPoint(type);
    setIsMapVisible(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      if (dateType === "start") {
        setStartDay(selectedDate);
      } else {
        setEndDay(selectedDate);
      }
      setShowDatePicker(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!locations.startLocation) {
      newErrors.startLocation = "Vui lòng chọn điểm bắt đầu";
    }
    if (!locations.endLocation) {
      newErrors.endLocation = "Vui lòng chọn điểm kết thúc";
    }

    if (!startDay) {
      newErrors.startDay = "Vui lòng chọn ngày bắt đầu";
    }
    if (!endDay) {
      newErrors.endDay = "Vui lòng chọn ngày kết thúc";
    }
    if (startDay && endDay && startDay > endDay) {
      newErrors.endDay = "Ngày kết thúc phải sau ngày bắt đầu";
    }

    if (!availableCapacity) {
      newErrors.capacity = "Vui lòng nhập trọng tải";
    } else if (isNaN(availableCapacity) || parseInt(availableCapacity) <= 0) {
      newErrors.capacity = "Trọng tải phải là số dương";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    if (selectingLocationType === "start") {
      setLocations((prev) => ({
        ...prev,
        startLocation: coordinate,
      }));


      await getNearLocation(coordinate);

    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: coordinate,
      }));
      await getNearLocation(coordinate);
    }
    handleBlur(selectingPoint + "Location");
  };

  const getNearLocation = async (coordinate) => {
    try {
      let token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${BASE_URl}/api/location/reverse-geocode?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const locationData = res.data.data.map((item) => ({
        formatted_address: item.formatted_address,
        lat: item.geometry.location.lat,
        long: item.geometry.location.lng,
      }));
      setLocationState(locationData);
    } catch (error) {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
    }

  };

  const handleCreateSchedule = async () => {
    if (!validateForm()) {
      setTouched({
        location: true,
        startDay: true,
        endDay: true,
        capacity: true,
      });
      return;
    }

    let token = await AsyncStorage.getItem("token");

    try {
      const startLocationString = `${locations.startLocation.latitude},${locations.startLocation.longitude}`;
      const endLocationString = `${locations.endLocation.latitude},${locations.endLocation.longitude}`;

      const res = await axios.post(
        `${BASE_URl}/api/schedule/create`,
        {
          startLocation: startLocationString,
          endLocation: endLocationString,
          startDate: startDay,
          endDate: endDay,
          availableCapacity: availableCapacity,
          startLocationAddress: startLocationAddress,
          endLocationAddress: endLocationAddress,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.status === 200) {
        Alert.alert(res.data.message);
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (
        responseData?.code === 200 &&
        responseData?.message === "Validation failed"
      ) {
        const validationMessages = Object.values(responseData.data).join("\n");
        Alert.alert("Validation Error", validationMessages);
      } else {
        Alert.alert("Error", error.response?.data?.message || "Đã xảy ra lỗi!");
      }
    }
  };

  const openLocationSelector = (type) => {
    setSelectingLocationType(type);
    setIsMapVisible(true);
  };

  const formatLocation = (location) => {
    if (!location) return "Chưa chọn địa điểm";
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN");
  };

  useEffect(() => {
    (async () => {
      try {
        const savedLocation = await AsyncStorage.getItem("currentLocation");
        if (savedLocation) {
          const { latitude, longitude } = JSON.parse(savedLocation);
          setInitialRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          setLocations((prevLocations) => ({
            ...prevLocations,
            startLocation: { latitude, longitude },
          }));
          await getNearLocation({ latitude, longitude });
        } else {
          setInitialRegion({
            latitude: 10.03,
            longitude: 105.7469,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      } catch (error) {
        console.error("Error loading initial region:", error);
      }
    })();
  }, []);

  // Render date picker based on platform
  const renderDatePicker = () => {
    return (
      <Modal visible={showDatePicker} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.pickerHeader}>
              <View style={styles.pickerButtonContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerButtonText}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.pickerHeaderText}>
                  {dateType === "start"
                    ? "Chọn ngày bắt đầu"
                    : "Chọn ngày kết thúc"}
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerButtonText}>Xong</Text>
                </TouchableOpacity>
              </View>
            </View>
            <DateTimePicker
              value={dateType == "start" ? startDay : endDay}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              style={styles.datePickerIOS}
              locale="vi-VN"
              textColor="black"
            />
          </View>
        </View>
      </Modal>
    );
  };

  useEffect(() => {
    console.log(
      "🚀 ~ ScheduleScreen ~ locations.startLocation:",
      locations.startLocation
    );
    console.log(
      "🚀 ~ ScheduleScreen ~ locations.endLocation:",
      locations.endLocation
    );
    console.log("====================================");
  }, [locations.startLocation, locations.endLocation]);

  const handleNearLocationPress = (item) => {
    console.log("🚀 ~ handleNearLocationPress ~ item:", item)
    if (selectingPoint === "start") {
      setLocations((prev) => ({
        ...prev,
        startLocation: { latitude: item.lat, longitude: item.long },
      }));
      setTitlePickup(item.formatted_address);
      setStartLocationAddress(item.formatted_address);
    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: { latitude: item.lat, longitude: item.long },
      }));
      setTitleDropoff(item.formatted_address);
      setEndLocationAddress(item.formatted_address);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <TouchableWithoutFeedback>
        <View style={styles.container}>
          <Text style={styles.label}>Điểm bắt đầu *</Text>
          <TouchableOpacity
            style={[
              styles.locationInput,
              touched.location && errors.location && styles.errorInput,
            ]}
            onPress={() => openLocationSelector("start")}
          >
            <Text>
              {locations.startLocation
                ? formatLocation(locations.startLocation)
                : "Chọn điểm bắt đầu"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Điểm kết thúc *</Text>
          <TouchableOpacity
            style={[
              styles.locationInput,
              touched.startLocation &&
                errors.startLocation &&
                styles.errorInput,
            ]}

            onPress={() => showLocationPicker("start")}
          >
            <Text>
              {startLocationAddress || "Chọn điểm bắt đầu"}

            </Text>
          </TouchableOpacity>
          {touched.startLocation && errors.startLocation && (
            <Text style={styles.errorText}>{errors.startLocation}</Text>
          )}


          {/* End Location Input */}
          <Text style={styles.label}>Điểm kết thúc *</Text>
          <TouchableOpacity
            style={[
              styles.locationInput,
              touched.endLocation && errors.endLocation && styles.errorInput,
            ]}
            onPress={() => showLocationPicker("end")}
          >
            <Text>
              {endLocationAddress || "Chọn điểm kết thúc"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Ngày bắt đầu *</Text>
          <TouchableOpacity
            style={[
              styles.input,
              touched.startDay && errors.startDay && styles.errorInput,
            ]}
            onPress={() => showPicker("start")}
          >
            <Text>{formatDate(startDay)}</Text>
          </TouchableOpacity>
          {touched.startDay && errors.startDay && (
            <Text style={styles.errorText}>{errors.startDay}</Text>
          )}
          <Text style={styles.label}>Ngày kết thúc *</Text>
          <TouchableOpacity
            style={[
              styles.input,
              touched.endDay && errors.endDay && styles.errorInput,
            ]}
            onPress={() => showPicker("end")}
          >
            <Text>{formatDate(endDay)}</Text>
          </TouchableOpacity>
          {touched.endDay && errors.endDay && (
            <Text style={styles.errorText}>{errors.endDay}</Text>
          )}

          <Text style={styles.label}>Nhập trọng tải *</Text>
          <TextInput
            style={[
              styles.input,
              touched.capacity && errors.capacity && styles.errorInput,
            ]}
            value={availableCapacity}
            onChangeText={(text) => {
              setAvailableCapacity(text.replace(/[^0-9]/g, ""));
              handleBlur("capacity");
            }}
            onBlur={() => handleBlur("capacity")}
            keyboardType="numeric"
            placeholder="Nhập sức chứa"
          />
          {touched.capacity && errors.capacity && (
            <Text style={styles.errorText}>{errors.capacity}</Text>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleCreateSchedule}
          >
            <Text style={styles.saveButtonText}>Lưu</Text>
          </TouchableOpacity>

          {/* Map Modal */}
          <Modal visible={isMapVisible} animationType="slide">
            <GestureHandlerRootView>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderText}>
                    {selectingPoint === "start"
                      ? "Chọn điểm bắt đầu"
                      : "Chọn điểm kết thúc"}
                  </Text>
                </View>
                <MapView
                  style={styles.map}
                  initialRegion={initialRegion}
                  onPress={handleMapPress}
                >
                  {locations.startLocation && selectingPoint === "start" && (
                    <Marker
                      coordinate={locations.startLocation}
                      title="Điểm bắt đầu"
                      pinColor="green"
                    />
                  )}
                  {locations.endLocation && selectingPoint === "end" && (
                    <Marker
                      coordinate={locations.endLocation}
                      title="Điểm kết thúc"
                      pinColor="red"
                    />
                  )}
                </MapView>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsMapVisible(false)}
                >
                  <Ionicons name="arrow-back-outline" size={24}></Ionicons>
                </TouchableOpacity>
                <BottomSheet
                  ref={bottomSheetRef}
                  index={0}
                  snapPoints={["50%"]}
                >
                  <BottomSheetView>
                    <FlatList
                      data={locationState}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.locationItem}
                          onPress={() => handleNearLocationPress(item)}
                        >
                          <Ionicons
                            name="location-outline"
                            size={24}
                            color="black"
                          />
                          <Text>{item.formatted_address}</Text>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity
                      style={styles.confirmLocation}
                      onPress={() => {
                        setIsMapVisible(false);
                      }}
                    >
                      <Text style={styles.confirmText}>Xác nhận </Text>
                    </TouchableOpacity>
                  </BottomSheetView>
                </BottomSheet>
              </View>
            </GestureHandlerRootView>
          </Modal>
          {renderDatePicker()}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  locationInput: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorInput: {
    borderColor: "#FF3B30",
    borderWidth: 1,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4,
  },
  locationInput: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  modalHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  map: {
    flex: 1,
  },
  resetButton: {
    position: "absolute",
    backgroundColor: "#FF3B30",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    bottom: 10,
    padding: 10,
    borderRadius: 10,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    backgroundColor: "#00b5ec",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    bottom: 10,
    right: 10,
    padding: 10,
    borderRadius: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#00b5ec",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  closeButton: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    width: 45,
    height: 45,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#f8f8f8",
  },
  pickerHeaderText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginBottom: 5,
  },
  pickerButtonContainer: {
    width: "100%",
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  pickerButton: {
    padding: 8,
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  datePickerIOS: {
    height: 200,
    width: "100%",
  },

  confirmLocation: {
    backgroundColor: "#00b5ec",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    borderRadius: 10,
  },
  confirmText: {
    fontWeight: 600,
    fontSize: 18,
    color: "#fff",
  },
  locationItem: {
    flex: 1,
    flexDirection: "row",
    height: 50,
  },
});

export default ScheduleScreen;
