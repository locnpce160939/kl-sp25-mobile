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
import { useAlert } from "../../components/CustomAlert";

const VehicleItem = ({ vehicle, onSelect, isSelected }) => (
  <TouchableOpacity 
    style={[
      styles.vehicleItem,
      isSelected && styles.vehicleItemSelected
    ]}
    onPress={() => onSelect(vehicle)}
  >
    <View style={styles.vehicleIconContainer}>
      <Ionicons name="car" size={28} color={isSelected ? "#fff" : "#00b5ec"} />
    </View>
    <View style={styles.vehicleInfo}>
      <Text style={[styles.vehicleName, isSelected && styles.vehicleTextSelected]}>
        {vehicle.make} {vehicle.model}
      </Text>
      <Text style={[styles.vehiclePlate, isSelected && styles.vehicleTextSelected]}>
        {vehicle.licensePlate}
      </Text>
      <View style={styles.vehicleDetails}>
        <View style={styles.vehicleDetailItem}>
          <Ionicons name="cube-outline" size={16} color={isSelected ? "#fff" : "#7f8c8d"} />
          <Text style={[styles.vehicleDetailText, isSelected && styles.vehicleTextSelected]}>
            {vehicle.capacity} kg
          </Text>
        </View>
        <View style={styles.vehicleDetailItem}>
          <Ionicons name="speedometer-outline" size={16} color={isSelected ? "#fff" : "#7f8c8d"} />
          <Text style={[styles.vehicleDetailText, isSelected && styles.vehicleTextSelected]}>
            {vehicle.fuelType}
          </Text>
        </View>
      </View>
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
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft} />
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
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="car-outline" size={48} color="#bdc3c7" />
                  <Text style={styles.emptyText}>Không có phương tiện nào khả dụng</Text>
                </View>
              )}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const ScheduleScreen = () => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [locations, setLocations] = useState({
    startLocation: null,
    endLocation: null,
  });

  const [startDay, setStartDay] = useState(new Date());
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
    capacity: false,
    vehicle: false,
  });

  const [errors, setErrors] = useState({
    startLocation: "",
    endLocation: "",
    startDay: "",
    capacity: "",
  });

  const [isMapVisible, setIsMapVisible] = useState(false);
  const [selectingPoint, setSelectingPoint] = useState(null);
  const bottomSheetRef = useRef(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [resultLocation, setResultLocation] = useState([]);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showSavedAddressesView, setShowSavedAddressesView] = useState(false);

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
      setStartDay(selectedDate);
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
    // Reset search state when selecting on map
    setSearchText("");
    setResultLocation([]);
    setIsSearching(false);
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
        capacity: true,
        vehicle: true,
      });
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
        showAlert({
          title: "Thành công",
          message: res.data.message,
          type: "success",
        });
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (
        responseData?.code === 200 &&
        responseData?.message === "Validation failed"
      ) {
        const validationMessages = Object.values(responseData.data).join("\n");
        showAlert({
          title: "Lỗi xác thực",
          message: validationMessages,
          type: "error",
        });
      } else {
        showAlert({
          title: "Lỗi",
          message: error.response?.data?.message || "Đã xảy ra lỗi!",
          type: "error",
        });
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

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  const loadSavedAddresses = async () => {
    try {
      const savedAddressesString = await AsyncStorage.getItem("savedAddressesSchedule");
      if (savedAddressesString) {
        const addresses = JSON.parse(savedAddressesString);
        setSavedAddresses(addresses);
      }
    } catch (error) {
      console.error("Error loading saved addresses:", error);
    }
  };

  const saveAddress = async (address) => {
    try {
      const savedAddressesString = await AsyncStorage.getItem("savedAddressesSchedule");
      let addresses = [];
      if (savedAddressesString) {
        addresses = JSON.parse(savedAddressesString);
      }

      const isDuplicate = addresses.some(
        (saved) => saved.address === address.formatted_address
      );

      if (isDuplicate) {
        showAlert({
          title: "Thông báo",
          message: "Địa chỉ này đã được lưu!",
          type: "warning",
        });
        return;
      }

      const newAddress = {
        id: Date.now().toString(),
        name: address.name || address.formatted_address,
        address: address.formatted_address,
        latitude: address.geometry.location.lat,
        longitude: address.geometry.location.lng,
      };

      addresses.push(newAddress);
      await AsyncStorage.setItem("savedAddressesSchedule", JSON.stringify(addresses));
      setSavedAddresses(addresses);
      showAlert({
        title: "Thành công",
        message: "Đã lưu địa chỉ thành công",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving address:", error);
      showAlert({
        title: "Lỗi",
        message: "Không thể lưu địa chỉ. Vui lòng thử lại.",
        type: "error",
      });
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const savedAddressesString = await AsyncStorage.getItem("savedAddressesSchedule");
      if (savedAddressesString) {
        let addresses = JSON.parse(savedAddressesString);
        addresses = addresses.filter((address) => address.id !== addressId);
        await AsyncStorage.setItem("savedAddressesSchedule", JSON.stringify(addresses));
        setSavedAddresses(addresses);
        showAlert({
          title: "Thành công",
          message: "Đã xóa địa chỉ thành công",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      showAlert({
        title: "Lỗi",
        message: "Không thể xóa địa chỉ. Vui lòng thử lại.",
        type: "error",
      });
    }
  };

  const handleSavedAddressSelect = (savedAddress) => {
    const location = {
      latitude: savedAddress.latitude,
      longitude: savedAddress.longitude,
    };

    if (selectingPoint === "start") {
      setLocations((prev) => ({
        ...prev,
        startLocation: location,
      }));
      setTitlePickup(savedAddress.address);
      setStartLocationAddress(savedAddress.address);
    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: location,
      }));
      setTitleDropoff(savedAddress.address);
      setEndLocationAddress(savedAddress.address);
    }

    setShowSavedAddressesView(false);
    setIsMapVisible(false);
  };

  const renderSavedAddressItem = ({ item }) => (
    <TouchableOpacity
      style={styles.savedAddressItem}
      onPress={() => handleSavedAddressSelect(item)}
    >
      <View style={styles.savedAddressContent}>
        <Ionicons name="location" size={24} color="#00b5ec" />
        <View style={styles.savedAddressDetails}>
          <Text style={styles.savedAddressName}>{item.name}</Text>
          <Text style={styles.savedAddressText}>{item.address}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteAddressButton}
          onPress={() => deleteAddress(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render date picker based on platform
  const renderDatePicker = () => {
    if (!showDatePicker) return null;
    return (
      <DateTimePicker
        value={dateType === "start" ? startDay : null}
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
    } else {
      setLocations((prev) => ({
        ...prev,
        endLocation: { latitude: item.lat, longitude: item.long },
      }));
      setTitleDropoff(item.formatted_address);
      setEndLocationAddress(item.formatted_address);
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

  const findLocation = async () => {
    try {
      if (!searchText || searchText.trim().length < 3) {
        setResultLocation([]);
        return;
      }

      let token = await AsyncStorage.getItem("token");
      if (!token) {
        showAlert({
          title: "Lỗi",
          message: "Vui lòng đăng nhập lại",
          type: "error",
        });
        return;
      }

      const res = await axios.get(
        `${BASE_URL}/api/location/address-geocode?address=${encodeURIComponent(
          searchText.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (res.data && res.data.data && res.data.data.results) {
        const result = res.data.data.results;
        if (!result || result.length === 0) {
          setResultLocation([]);
          showAlert({
            title: "Thông báo",
            message: "Không tìm thấy địa điểm nào.",
            type: "warning",
          });
          return;
        }
        setResultLocation(result);
      } else {
        setResultLocation([]);
        showAlert({
          title: "Thông báo",
          message: "Không tìm thấy địa điểm nào.",
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      setResultLocation([]);

      if (error.response) {
        switch (error.response.status) {
          case 409:
            showAlert({
              title: "Thông báo",
              message: "Vui lòng nhập ít nhất 3 ký tự để tìm kiếm.",
              type: "warning",
            });
            break;
          case 401:
            showAlert({
              title: "Lỗi",
              message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
              type: "error",
            });
            break;
          case 429:
            showAlert({
              title: "Thông báo",
              message: "Bạn đã tìm kiếm quá nhiều lần. Vui lòng thử lại sau.",
              type: "warning",
            });
            break;
          default:
            showAlert({
              title: "Lỗi",
              message: "Không thể tìm kiếm địa điểm. Vui lòng thử lại sau.",
              type: "error",
            });
        }
      } else if (error.code === "ECONNABORTED") {
        showAlert({
          title: "Lỗi",
          message: "Kết nối quá chậm. Vui lòng thử lại.",
          type: "error",
        });
      } else {
        showAlert({
          title: "Lỗi",
          message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
          type: "error",
        });
      }
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    setIsSearching(true);
    // Clear locationState when searching
    setLocationState([]);
    if (text.length >= 3) {
      findLocation();
    } else {
      setResultLocation([]);
    }
  };

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => {
        if (!item.geometry?.location?.lat || !item.geometry?.location?.lng) {
          console.error("Dữ liệu tọa độ không hợp lệ:", item);
          showAlert({
            title: "Lỗi",
            message: "Địa điểm này không có tọa độ hợp lệ.",
            type: "error",
          });
          return;
        }
        const newLocation = {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
        };
        if (selectingPoint === "start") {
          setLocations((prev) => ({
            ...prev,
            startLocation: newLocation,
          }));
          setTitlePickup(item.formatted_address);
          setStartLocationAddress(item.formatted_address);
        } else {
          setLocations((prev) => ({
            ...prev,
            endLocation: newLocation,
          }));
          setTitleDropoff(item.formatted_address);
          setEndLocationAddress(item.formatted_address);
        }
        // Clear search state after selecting location
        setSearchText("");
        setResultLocation([]);
        setIsSearching(false);
        setIsMapVisible(false);
      }}
    >
      <View style={styles.locationItemContent}>
        <View style={styles.locationIconContainer}>
          <Ionicons name="location-outline" size={20} color="#00b5ec" />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationMainText}>
            {item.name || item.address_components?.[0]?.long_name || "Không có tên"}
          </Text>
          <Text style={styles.locationSubText} numberOfLines={2}>
            {item.formatted_address}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveAddressButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering parent onPress
            saveAddress(item);
          }}
        >
          <Ionicons name="bookmark-outline" size={20} color="#00b5ec" />
        </TouchableOpacity>
      </View>
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
        <GestureHandlerRootView style={styles.modalContainer}>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              onPress={(e) => handleMapPress(e)}
            >
              {locations.startLocation && selectingPoint === "start" && (
                <Marker coordinate={locations.startLocation} title="Điểm bắt đầu" />
              )}
              {locations.endLocation && selectingPoint === "end" && (
                <Marker coordinate={locations.endLocation} title="Điểm kết thúc" />
              )}
            </MapView>

            <TouchableOpacity
              style={styles.mapBackButton}
              onPress={() => {
                setIsMapVisible(false);
                setShowSavedAddressesView(false);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            {showSavedAddressesView ? (
              <View style={styles.savedAddressesOverlay}>
                <View style={styles.savedAddressesContainer}>
                  <View style={styles.savedAddressesHeader}>
                    <Text style={styles.savedAddressesTitle}>
                      {selectingPoint === "start" ? "Chọn điểm bắt đầu" : "Chọn điểm kết thúc"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowSavedAddressesView(false)}
                      style={styles.closeModalButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={savedAddresses}
                    renderItem={renderSavedAddressItem}
                    keyExtractor={(item) => item.id}
                    style={styles.savedAddressesList}
                    ListEmptyComponent={() => (
                      <Text style={styles.noAddressesText}>
                        Chưa có địa chỉ nào được lưu
                      </Text>
                    )}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm kiếm địa điểm..."
                      onFocus={() => setIsSearching(true)}
                      value={searchText}
                      onChangeText={handleSearchChange}
                    />
                    <TouchableOpacity
                      style={styles.savedAddressesButton}
                      onPress={() => setShowSavedAddressesView(true)}
                    >
                      <Ionicons name="bookmark" size={24} color="#00b5ec" />
                    </TouchableOpacity>
                  </View>
                  {isSearching && resultLocation && resultLocation.length > 0 && (
                    <View style={styles.searchResults}>
                      <FlatList
                        data={resultLocation}
                        renderItem={renderLocationItem}
                        keyExtractor={(item) => item.place_id}
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  )}
                </View>

                {!isSearching && locationState && locationState.length > 0 && (
                  <BottomSheet ref={bottomSheetRef} index={0} snapPoints={["30%"]}>
                    <BottomSheetView>
                      <View style={styles.nearbyLocationsHeader}>
                        <Text style={styles.nearbyLocationsTitle}>Địa điểm gần đó</Text>
                      </View>
                      <FlatList
                        data={locationState}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.locationItem}
                            onPress={() => handleNearLocationPress(item)}
                          >
                            <View style={styles.locationItemContent}>
                              <View style={styles.locationIconContainer}>
                                <Ionicons name="location-outline" size={20} color="#00b5ec" />
                              </View>
                              <View style={styles.locationDetails}>
                                <Text style={styles.locationMainText}>
                                  {item.formatted_address}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => setIsMapVisible(false)}
                      >
                        <Text style={styles.confirmButtonText}>Xác nhận vị trí</Text>
                      </TouchableOpacity>
                    </BottomSheetView>
                  </BottomSheet>
                )}
              </>
            )}
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
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  savedAddressesOverlay: {
    position: 'absolute',
    top:60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 20,
  },
  savedAddressesContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
  },
  savedAddressesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  savedAddressesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  savedAddressesList: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  savedAddressItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  savedAddressContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  savedAddressDetails: {
    flex: 1,
    marginLeft: 12,
  },
  savedAddressName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  savedAddressText: {
    fontSize: 14,
    color: "#666",
  },
  deleteAddressButton: {
    padding: 8,
  },
  noAddressesText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
  },
  savedAddressesButton: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
  },
  closeModalButton: {
    padding: 8,
  },
  nearbyLocationsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  nearbyLocationsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  locationItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  locationSubText: {
    fontSize: 14,
    color: '#666',
  },
  saveAddressButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButton: {
    backgroundColor: '#00b5ec',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleList: {
    padding: 16,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  vehicleItemSelected: {
    backgroundColor: '#00b5ec',
    borderColor: '#00b5ec',
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginBottom: 8,
  },
  vehicleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleDetailText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  vehicleTextSelected: {
    color: '#fff',
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  mapBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ScheduleScreen;