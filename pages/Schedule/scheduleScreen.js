import React, { useState } from "react";
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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ScheduleScreen = () => {
  const [locations, setLocations] = useState({
    startLocation: null,
    endLocation: null,
  });

  const [startDay, setStartDay] = useState(new Date());
  const [endDay, setEndDay] = useState(new Date());
  const [availableCapacity, setAvailableCapacity] = useState("");
  const [touched, setTouched] = useState({
    location: false,
    startDay: false,
    endDay: false,
    capacity: false,
  });
  const [errors, setErrors] = useState({
    location: "",
    startDay: "",
    endDay: "",
    capacity: "",
  });

  const [isMapVisible, setIsMapVisible] = useState(false);
  const [selectingPoint, setSelectingPoint] = useState("start");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState(null); // 'start' or 'end'
  const [tempDate, setTempDate] = useState(new Date());

  const validateForm = () => {
    const newErrors = {};

    if (!locations.startLocation || !locations.endLocation) {
      newErrors.location = "Vui lòng chọn điểm bắt đầu và kết thúc";
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

  const showDatePicker = (type) => {
    setDatePickerType(type);
    setTempDate(type === 'start' ? startDay : endDay);
    setDatePickerVisible(true);
  };

  const handleDateConfirm = () => {
    if (datePickerType === 'start') {
      setStartDay(tempDate);
      handleBlur("startDay");
    } else {
      setEndDay(tempDate);
      handleBlur("endDay");
    }
    setDatePickerVisible(false);
  };

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;

    if (selectingPoint === "start") {
      setLocations((prev) => ({
        ...prev,
        startLocation: coordinate,
      }));
      setSelectingPoint("end");
    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: coordinate,
      }));
      setIsMapVisible(false);
      setSelectingPoint("start");
    }
    handleBlur("location");
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

  const formatLocation = (location) => {
    if (!location) return "Chưa chọn địa điểm";
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback>
        <View style={styles.container}>
          <Text style={styles.label}>Địa điểm *</Text>
          <TouchableOpacity
            style={[
              styles.locationInput,
              touched.location && errors.location && styles.errorInput,
            ]}
            onPress={() => setIsMapVisible(true)}
          >
            <Text>
              {locations.startLocation && locations.endLocation
                ? `${formatLocation(
                    locations.startLocation
                  )} → ${formatLocation(locations.endLocation)}`
                : "Chọn điểm bắt đầu và kết thúc"}
            </Text>
          </TouchableOpacity>
          {touched.location && errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}

          <Text style={styles.label}>Ngày bắt đầu *</Text>
          <TouchableOpacity
            style={[
              styles.input,
              touched.startDay && errors.startDay && styles.errorInput,
            ]}
            onPress={() => showDatePicker('start')}
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
            onPress={() => showDatePicker('end')}
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
                initialRegion={{
                  latitude: 10.7769,
                  longitude: 106.7009,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={handleMapPress}
              >
                {locations.startLocation && (
                  <Marker
                    coordinate={locations.startLocation}
                    title="Điểm bắt đầu"
                    pinColor="green"
                  />
                )}
                {locations.endLocation && (
                  <Marker
                    coordinate={locations.endLocation}
                    title="Điểm kết thúc"
                    pinColor="red"
                  />
                )}
              </MapView>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setLocations({ startLocation: null, endLocation: null });
                  setSelectingPoint("start");
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setIsMapVisible(false);
                  setSelectingPoint("start");
                }}
              >
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </Modal>

          {/* DatePicker Modal */}
          <Modal
            visible={datePickerVisible}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.datePickerModalContainer}>
              <View style={styles.datePickerContent}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerHeaderText}>
                    {datePickerType === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                  </Text>
                </View>
                
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setTempDate(date);
                  }}
                />
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.cancelButton]}
                    onPress={() => setDatePickerVisible(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.confirmButton]}
                    onPress={handleDateConfirm}
                  >
                    <Text style={styles.datePickerButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  resetButton: {
    backgroundColor: "#FF3B30",
    padding: 5,
    alignItems: "center",
    marginBottom: 5,
    borderRadius: 8,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
    padding: 15,
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
  closeButton: {
    backgroundColor: "#333",
    padding: 15,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
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
  // New styles for DatePicker Modal
  atePickerModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    padding: 20,
  },
  datePickerHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  datePickerHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  datePickerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  datePickerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ScheduleScreen;