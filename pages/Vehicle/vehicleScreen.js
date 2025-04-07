import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DatePickerField from "../../components/DatePickerField";

const VehicleScreen = () => {
  // State và biến
  const [viewMode, setViewMode] = useState("list");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState(null);
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "",
    make: "",
    model: "",
    year: "",
    capacity: "",
    dimensions: "",
    insuranceStatus: "",
    registrationExpiryDate: "",
    frontView: null, // Ảnh mặt trước
    backView: null, // Ảnh mặt sau
  });
  const [errors, setErrors] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);

  // Effect để fetch danh sách xe khi vào chế độ list
  useEffect(() => {
    if (viewMode === "list") fetchVehicleList();
  }, [viewMode]);

  // Yêu cầu quyền truy cập camera
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Camera access is required to use this feature!");
      }
    })();
  }, []);

  // Hàm fetch danh sách xe
  const fetchVehicleList = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token does not exist. Please log in again.");

      const response = await axios.get(
        `${BASE_URL}/api/registerDriver/vehicle`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const vehicleData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];
      setVehicles(vehicleData);
    } catch (error) {
      handleVehicleError(error);
      Alert.alert("Error", "Failed to load vehicle list.");
    } finally {
      setLoading(false);
    }
  };
  // Hàm xử lý lỗi
  const handleVehicleError = async (error) => {
    if (error.response?.status === 401) {
      Alert.alert(
        "Session expired",
        "Please log in again.",
        [
          {
            text: "OK",
            onPress: async () => {
              await logout();
            },
          },
        ],
        { cancelable: false }
      );
    } else if (error.response?.data?.message === "Vehicle not found") {
      console.log("Vehicle not found.");
    } else if (error.response?.status === 400) {
      Alert.alert(error.response?.data?.message);
    } else {
      Alert.alert("Something went wrong", error);
    }
  };

  // Hàm chọn ảnh
  const selectImage = async (field) => {
    Alert.alert("Select image source", "Choose image source", [
      {
        text: "Take photo",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
          });
          if (!result.canceled) {
            setFormData((prev) => ({
              ...prev,
              [field]: result.assets[0].uri,
            }));
            setErrors((prev) => ({ ...prev, [field]: "" }));
          }
        },
      },
      {
        text: "Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
          });
          if (!result.canceled) {
            setFormData((prev) => ({
              ...prev,
              [field]: result.assets[0].uri,
            }));
            setErrors((prev) => ({ ...prev, [field]: "" }));
          }
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  // Hàm xử lý thay đổi input
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Hàm chọn xe từ danh sách
  const handleSelectVehicle = (vehicle) => {
    setVehicleId(vehicle.vehicleId);
    setFormData({
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      capacity: vehicle.capacity.toString(),
      dimensions: vehicle.dimensions,
      insuranceStatus: vehicle.insuranceStatus,
      registrationExpiryDate: vehicle.registrationExpiryDate.split("T")[0],
      frontView: vehicle.frontView,
      backView: vehicle.backView,
    });
    setViewMode("form");
  };

  // Hàm tạo mới xe
  const handleCreateNew = () => {
    setVehicleId(null);
    setFormData({
      licensePlate: "",
      vehicleType: "",
      make: "",
      model: "",
      year: "",
      capacity: "",
      dimensions: "",
      insuranceStatus: "",
      registrationExpiryDate: "",
    });
    setViewMode("form");
  };

  // Hàm quay lại danh sách
  const handleBackToList = () => {
    setViewMode("list");
  };

  // Hàm kiểm tra hợp lệ dữ liệu
  const validateFormData = () => {
    const {
      licensePlate,
      vehicleType,
      make,
      model,
      year,
      capacity,
      dimensions,
      insuranceStatus,
      registrationExpiryDate,
    } = formData;

    let formErrors = {};

    if (!licensePlate) formErrors.licensePlate = "License plate is required.";
    if (!vehicleType) formErrors.vehicleType = "Vehicle type is required.";
    if (!make) formErrors.make = "Make is required.";
    if (!model) formErrors.model = "Model is required.";
    if (!year) formErrors.year = "Year is required.";

    const currentYear = new Date().getFullYear();
    const manufacturingYear = parseInt(year);
    if (isNaN(manufacturingYear)) {
      formErrors.year = "Year must be a number.";
    } else if (currentYear - manufacturingYear > 25) {
      formErrors.year = "Vehicle cannot be older than 25 years.";
    }
    if (!capacity) formErrors.capacity = "Capacity is required.";
    if (capacity < 1 || capacity > 15)
      formErrors.capacity = "Capacity must be between 1 and 15 tons.";
    if (!dimensions) formErrors.dimensions = "Dimensions are required.";
    if (!insuranceStatus)
      formErrors.insuranceStatus = "Insurance status is required.";
    if (!registrationExpiryDate)
      formErrors.registrationExpiryDate =
        "Registration expiry date is required.";

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // Hàm tạo hoặc cập nhật xe
  const createOrUpdateVehicle = async () => {
    if (!validateFormData()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại");

      const formDataToSend = new FormData();

      const requestDTO = JSON.stringify({
        vehicleId: vehicleId || null,
        licensePlate: formData.licensePlate,
        vehicleType: formData.vehicleType,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        capacity: parseInt(formData.capacity),
        dimensions: formData.dimensions,
        insuranceStatus: formData.insuranceStatus,
        registrationExpiryDate: `${formData.registrationExpiryDate}T00:00:00.000`,
      });

      formDataToSend.append("requestDTO", requestDTO);

      if (formData.frontView) {
        formDataToSend.append("frontFile", {
          uri: formData.frontView,
          type: "image/jpeg",
          name: "front.jpg",
        });
      }

      if (formData.backView) {
        formDataToSend.append("backFile", {
          uri: formData.backView,
          type: "image/jpeg",
          name: "back.jpg",
        });
      }

      const response = await axios({
        method: vehicleId ? "put" : "post",
        url: `${BASE_URL}/api/registerDriver/vehicle`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        data: formDataToSend,
        transformRequest: (data, headers) => {
          return data;
        },
      });

      if (response.status === 200) {
        Alert.alert("Notification", "Vehicle information has been saved");
        setViewMode("list");
      }
    } catch (error) {
      handleVehicleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Render danh sách xe
  const renderList = () => (
    <View style={styles.listContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#000"
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Phương tiện</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loader}
          />
        ) : (
          <>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle, index) => (
                <View key={vehicle.vehicleId} style={styles.vehicleItem}>
                  {vehicle.frontView ? (
                    <Image
                      source={{ uri: vehicle.frontView }}
                      style={styles.vehicleIcon}
                    />
                  ) : (
                    <Ionicons
                      name="car"
                      size={40}
                      color="#007AFF"
                      style={styles.vehicleIcon}
                    />
                  )}
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>
                      {vehicle.make} {vehicle.model}
                    </Text>
                    <Text style={styles.vehicleDetail}>
                      Ngày hết hạn:{" "}
                      {new Date(
                        vehicle.registrationExpiryDate
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => handleSelectVehicle(vehicle)}
                  >
                    <Text style={styles.manageButtonText}>Quản lý</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>
                Không có phương tiện nào trong danh sách.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleCreateNew}>
        <Ionicons name="add" size={40} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  //Nhập dữ liệu
  const inputFields = [
    { field: "licensePlate", label: "Biển số" },
    { field: "vehicleType", label: "Loại xe" },
    { field: "make", label: "Hãng xe" },
    { field: "model", label: "Dòng xe" },
    { field: "year", label: "Năm sản xuất" },
    { field: "capacity", label: "Tải trọng" },
    { field: "dimensions", label: "Kích thước" },
    { field: "insuranceStatus", label: "Tình trạng bảo hiểm" },
    { field: "registrationExpiryDate", label: "Ngày hết hạn đăng kiểm" },
  ];

  const renderImageSection = (field, label) => (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {formData[field] ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: formData[field] }} // Sử dụng Image để hiển thị ảnh
            style={styles.vehicleImage}
          />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => selectImage(field)}
          >
            <Text style={styles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, errors[field] && styles.inputError]}
          onPress={() => selectImage(field)}
        >
          <Ionicons name="camera" size={24} color="#007AFF" />
          <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
      )}
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  // Render form nhập thông tin xe
  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToList}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#000"
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {vehicleId ? "Cập nhật thông tin xe" : "Tạo mới thông tin xe"}
        </Text>
      </View>

      {/* Các trường nhập liệu */}
      {inputFields.map(({ field, label }) => {
        if (field === "registrationExpiryDate") {
          return (
            <DatePickerField
              key={field}
              label={label}
              value={formData[field]}
              onChange={(value) => handleInputChange(field, value)}
              field={field}
              error={errors[field]}
            />
          );
        }
        return (
          <View key={field} style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, errors[field] && styles.inputError]}
              placeholder={`Enter ${label.toLowerCase()}`}
              value={formData[field]}
              keyboardType={
                field === "year" || field === "capacity" ? "numeric" : "default"
              }
              onChangeText={(text) => handleInputChange(field, text)}
            />
            {errors[field] && (
              <Text style={styles.errorText}>{errors[field]}</Text>
            )}
          </View>
        );
      })}

      {/* Ảnh mặt trước */}
      {renderImageSection("frontView", "Ảnh mặt trước")}

      {/* Ảnh mặt sau */}
      {renderImageSection("backView", "Ảnh mặt sau")}

      <TouchableOpacity style={styles.button} onPress={createOrUpdateVehicle}>
        <Text style={styles.buttonText}>
          {vehicleId ? "Cập nhật" : "Tạo mới"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
  // Render giao diện chính
  return viewMode === "list" ? (
    <View style={styles.listContainer}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        renderList()
      )}
    </View>
  ) : (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        renderForm()
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    position: "relative",
  },
  container: {
    flexGrow: 1,
    padding: 30,
    backgroundColor: "#f9f9f9",
  },
  header: {
    marginTop: Platform.OS === "ios" ? 20 : 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  vehicleIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  vehicleDetail: {
    fontSize: 14,
    color: "#666",
  },
  manageButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  manageButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    padding: 16,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#007AFF",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  loader: {
    marginTop: 20,
  },
  uploadButton: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "bold",
  },
  retakeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  vehicleImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageWrapper: {
    alignItems: "center",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  dateButtonText: {
    color: "#333",
    fontSize: 14,
  },
  iosDatePickerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    zIndex: 1000,
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  iosDatePicker: {
    height: 200,
  },
  iosDatePickerCancel: {
    color: "#007AFF",
    fontSize: 16,
  },
  iosDatePickerDone: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VehicleScreen;
