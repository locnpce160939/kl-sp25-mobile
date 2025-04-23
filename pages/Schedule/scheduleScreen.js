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
  ScrollView,
  SafeAreaView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";

const VehicleItem = ({ vehicle, onSelect, isSelected }) => (
  <TouchableOpacity 
    style={[
      styles.vehicleItem,
      isSelected && styles.vehicleItemSelected
    ]}
    onPress={() => onSelect(vehicle)}
  >
    <View style={styles.vehicleIconContainer}>
      <Ionicons name="car" size={24} color={isSelected ? "#fff" : "#00b5ec"} />
    </View>
    <View style={styles.vehicleInfo}>
      <Text style={[styles.vehicleName, isSelected && styles.vehicleTextSelected]}>
        {vehicle.make} {vehicle.model}
      </Text>
      <Text style={[styles.vehiclePlate, isSelected && styles.vehicleTextSelected]}>
        {vehicle.licensePlate}
      </Text>
    </View>
    {isSelected && (
      <View style={styles.checkmarkContainer}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
      </View>
    )}
  </TouchableOpacity>
);

const VehicleSelectionModal = ({ visible, onClose, vehicles, selectedVehicle, onSelect }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Chọn phương tiện</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#34495e" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.vehicleId.toString()}
          renderItem={({ item }) => (
            <VehicleItem
              vehicle={item}
              onSelect={(vehicle) => {
                onSelect(vehicle.vehicleId);
                onClose();
              }}
              isSelected={selectedVehicle === item.vehicleId}
            />
          )}
          contentContainerStyle={styles.vehicleList}
        />
      </View>
    </View>
  </Modal>
);

const ScheduleScreen = () => {
  const navigation = useNavigation();
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
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [touched, setTouched] = useState({
    startLocation: false,
    endLocation: false,
    startDay: false,
    endDay: false,
    capacity: false,
    vehicle: false,
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
  const [showVehicleModal, setShowVehicleModal] = useState(false);

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
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate) {
      if (dateType === "start") {
        setStartDay(selectedDate);
      } else {
        setEndDay(selectedDate);
      }
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
    if (!selectedVehicle) {
      newErrors.vehicle = "Vui lòng chọn phương tiện";
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
    if (selectingPoint === "start") {
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
        `${BASE_URL}/api/location/reverse-geocode?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}`,
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
        startLocation: true,
        endLocation: true,
        startDay: true,
        endDay: true,
        capacity: true,
        vehicle: true,
      });
      // Hiển thị lỗi trong giao diện, không dùng Alert
      return;
    }

    let token = await AsyncStorage.getItem("token");

    try {
      const startLocationString = `${locations.startLocation.latitude},${locations.startLocation.longitude}`;
      const endLocationString = `${locations.endLocation.latitude},${locations.endLocation.longitude}`;

      const res = await axios.post(
        `${BASE_URL}/api/schedule/create`,
        {
          startLocation: startLocationString,
          endLocation: endLocationString,
          startDate: startDay,
          endDate: endDay,
          availableCapacity: availableCapacity,
          startLocationAddress: startLocationAddress,
          endLocationAddress: endLocationAddress,
          vehicleId: selectedVehicle,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.status === 200) {
        Alert.alert("Thành công", res.data.message);
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (
        responseData?.code === 200 &&
        responseData?.message === "Validation failed"
      ) {
        const validationMessages = Object.values(responseData.data).join("\n");
        Alert.alert("Lỗi xác thực", validationMessages);
      } else {
        Alert.alert("Lỗi", error.response?.data?.message || "Đã xảy ra lỗi!");
      }
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN");
  };

  useEffect(() => {
    (async () => {
      try {
        const savedLocation = await AsyncStorage.getItem("currentLocation");
        const token = await AsyncStorage.getItem("token");

        // Fetch vehicles with the correct endpoint
        const vehicleResponse = await axios.get(
          `${BASE_URL}/api/registerDriver/vehicle/list`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Filter for approved vehicles
        const approvedVehicles = Array.isArray(vehicleResponse.data.data)
          ? vehicleResponse.data.data.filter(
              (vehicle) =>
                vehicle?.status === "APPROVED" &&
                vehicle?.vehicleId > 0 &&
                vehicle?.model
            )
          : [];

        setVehicles(approvedVehicles);

        if (approvedVehicles.length > 0) {
          console.log(
            "Load list Vehicle:",
            JSON.stringify(approvedVehicles, null, 2)
          );
          setSelectedVehicle(approvedVehicles[0].vehicleId);
        } else {
          console.log("Không có phương tiện nào được phê duyệt");
        }

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
    if (!showDatePicker) return null;
    return (
      <DateTimePicker
        value={dateType === "start" ? startDay : endDay}
        mode="date"
        display="default" 
        onChange={onDateChange}
        locale="vi-VN"
      />
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
    console.log("🚀 ~ handleNearLocationPress ~ item:", item);
    if (selectingPoint === "start") {
      setLocations((prev) => ({
        ...prev,
        startLocation: { latitude: item.lat, longitude: item.long },
      }));
      setTitlePickup(item.formatted_address);
      setStartLocationAddress(item.formatted_address);
      handleBlur("startLocation"); // Thêm dòng này
    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: { latitude: item.lat, longitude: item.long },
      }));
      setTitleDropoff(item.formatted_address);
      setEndLocationAddress(item.formatted_address);
      handleBlur("endLocation"); // Thêm dòng này
    }
  };

  // Replace the Picker with a custom button to show modal
  const renderVehicleSelection = () => (
    <TouchableOpacity
      style={[
        styles.input,
        touched.vehicle && errors.vehicle && styles.errorInput,
      ]}
      onPress={() => setShowVehicleModal(true)}
    >
      <Ionicons name="car-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
      <Text style={styles.inputText}>
        {selectedVehicle 
          ? vehicles.find(v => v.vehicleId === selectedVehicle)?.licensePlate || "Chọn phương tiện"
          : "Chọn phương tiện"}
      </Text>
      <Ionicons name="chevron-down" size={24} color="#95a5a6" style={styles.inputIcon} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo lịch trình</Text>
        <View style={styles.headerRight} />
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.container}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin địa điểm</Text>
              
              <Text style={styles.label}>Điểm bắt đầu *</Text>
              <TouchableOpacity
                style={[
                  styles.locationInput,
                  touched.startLocation && errors.startLocation && styles.errorInput,
                ]}
                onPress={() => showLocationPicker("start")}
              >
                <Ionicons name="location-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
                <Text style={styles.inputText}>{startLocationAddress || "Chọn điểm bắt đầu"}</Text>
              </TouchableOpacity>
              {touched.startLocation && errors.startLocation && (
                <Text style={styles.errorText}>{errors.startLocation}</Text>
              )}

              <Text style={styles.label}>Điểm kết thúc *</Text>
              <TouchableOpacity
                style={[
                  styles.locationInput,
                  touched.endLocation && errors.endLocation && styles.errorInput,
                ]}
                onPress={() => showLocationPicker("end")}
              >
                <Ionicons name="location-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
                <Text style={styles.inputText}>{endLocationAddress || "Chọn điểm kết thúc"}</Text>
              </TouchableOpacity>
              {touched.endLocation && errors.endLocation && (
                <Text style={styles.errorText}>{errors.endLocation}</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thời gian</Text>
              
              <Text style={styles.label}>Ngày bắt đầu *</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  touched.startDay && errors.startDay && styles.errorInput,
                ]}
                onPress={() => showPicker("start")}
              >
                <Ionicons name="calendar-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
                <Text style={styles.inputText}>{formatDate(startDay)}</Text>
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
                <Ionicons name="calendar-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
                <Text style={styles.inputText}>{formatDate(endDay)}</Text>
              </TouchableOpacity>
              {touched.endDay && errors.endDay && (
                <Text style={styles.errorText}>{errors.endDay}</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin vận chuyển</Text>
              
              <Text style={styles.label}>Trọng tải *</Text>
              <View style={[
                styles.input,
                touched.capacity && errors.capacity && styles.errorInput,
              ]}>
                <Ionicons name="cube-outline" size={24} color="#00b5ec" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={availableCapacity}
                  onChangeText={(text) => {
                    setAvailableCapacity(text.replace(/[^0-9]/g, ""));
                    handleBlur("capacity");
                  }}
                  onBlur={() => handleBlur("capacity")}
                  keyboardType="numeric"
                  placeholder="Nhập sức chứa"
                  placeholderTextColor="#999"
                />
              </View>
              {touched.capacity && errors.capacity && (
                <Text style={styles.errorText}>{errors.capacity}</Text>
              )}

              <Text style={styles.label}>Phương tiện *</Text>
              {vehicles.length > 0 ? (
                renderVehicleSelection()
              ) : (
                <Text style={styles.noVehiclesText}>Không có phương tiện nào khả dụng</Text>
              )}
              {touched.vehicle && errors.vehicle && (
                <Text style={styles.errorText}>{errors.vehicle}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateSchedule}
            >
              <Text style={styles.saveButtonText}>Tạo lịch trình</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
              showsUserLocation={true}
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
      <VehicleSelectionModal
        visible={showVehicleModal}
        onClose={() => setShowVehicleModal(false)}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelect={(vehicleId) => {
          setSelectedVehicle(vehicleId);
          handleBlur("vehicle");
        }}
      />
      {renderDatePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#34495e',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    height: 50,
  },
  locationInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    height: 50,
  },
  inputIcon: {
    marginHorizontal: 12,
  },
  inputText: {
    flex: 1,
    color: '#2c3e50',
    fontSize: 15,
  },
  textInput: {
    flex: 1,
    color: '#2c3e50',
    fontSize: 15,
    height: '100%',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    height: 50,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  errorInput: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#00b5ec',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noVehiclesText: {
    color: '#95a5a6',
    textAlign: 'center',
    marginVertical: 10,
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
  vehicleContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  vehicleList: {
    padding: 16,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vehicleItemSelected: {
    backgroundColor: '#00b5ec',
    borderColor: '#00b5ec',
  },
  vehicleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  vehicleTextSelected: {
    color: '#fff',
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerRight: {
    width: 40, // Same width as backButton for alignment
  },
});

export default ScheduleScreen;
