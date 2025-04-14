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
  Modal,
  Animated,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DatePickerField from "../../components/DatePickerField";
import { useAlert } from "../../components/CustomAlert"; // Import hook useAlert

// Constants
const VALIDATION_RULES = {
  licensePlate: {
    label: "Biển số",
    required: "Biển số xe là bắt buộc.",
    pattern: /^[A-Z0-9-]+$/,
    patternError: "Biển số xe không hợp lệ.",
  },
  vehicleType: {
    label: "Loại xe",
    required: "Loại xe là bắt buộc.",
  },
  make: {
    label: "Hãng xe",
    required: "Hãng xe là bắt buộc.",
    pattern: /^[^@#$%^&*!]+$/,
    patternError: "Hãng xe không được chứa ký tự đặc biệt (@, #, $, %, ^, &, *, !).",
  },
  model: {
    label: "Dòng xe",
    required: "Dòng xe là bắt buộc.",
    pattern: /^[^@#$%^&*!]+$/,
    patternError: "Dòng xe không được chứa ký tự đặc biệt (@, #, $, %, ^, &, *, !).",
  },
  year: {
    label: "Năm sản xuất",
    required: "Năm sản xuất là bắt buộc.",
    min: 1900,
    max: new Date().getFullYear(),
    rangeError: (min, max) => `Năm sản xuất phải từ ${min} đến ${max}.`,
  },
  capacity: {
    label: "Tải trọng",
    required: "Tải trọng là bắt buộc.",
    min: 1000,
    max: 15000,
    rangeError: (min, max) => `Tải trọng phải từ ${min} đến ${max} kg.`,
  },
  dimensions: {
    label: "Kích thước",
    required: "Kích thước là bắt buộc.",
    pattern: /^[^@#$%^&*!]+$/,
    patternError: "Kích thước không được chứa ký tự đặc biệt (@, #, $, %, ^, &, *, !).",
  },
  insuranceStatus: {
    label: "Tình trạng bảo hiểm",
    required: "Tình trạng bảo hiểm là bắt buộc.",
    pattern: /^[^@#$%^&*!]+$/,
    patternError: "Tình trạng bảo hiểm không được chứa ký tự đặc biệt (@, #, $, %, ^, &, *, !).",
  },
  registrationExpiryDate: {
    label: "Ngày hết hạn đăng kiểm",
    required: "Ngày hết hạn đăng kiểm là bắt buộc.",
    futureDate: "Ngày hết hạn phải lớn hơn ngày hiện tại.",
  },
  frontView: {
    label: "Ảnh mặt trước",
    required: "Ảnh mặt trước là bắt buộc.",
  },
  backView: {
    label: "Ảnh mặt sau",
    required: "Ảnh mặt sau là bắt buộc.",
  },
};

const VehicleScreen = () => {
  // State
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
    frontView: null,
    backView: null,
  });
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: "", type: "" });
  const notificationOpacity = new Animated.Value(0);
  const { showAlert } = useAlert();

  // Effects
  useEffect(() => {
    if (viewMode === "list") fetchVehicleList();
  }, [viewMode]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  // Helper Functions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần quyền truy cập camera để sử dụng tính năng này!");
    }
  };

  const handleVehicleError = async (error) => {
    if (error.response?.status === 401) {
      showNotification("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", "error");
      await logout();
    } else if (error.response?.data?.message === "Vehicle not found") {
      showNotification("Không tìm thấy thông tin xe!", "error");
    } else if (error.response?.status === 400) {
      showNotification(error.response?.data?.message || "Dữ liệu không hợp lệ!", "error");
    } else {
      showNotification("Đã xảy ra lỗi. Vui lòng thử lại!", "error");
    }
  };

  const validateFormData = () => {
    const newErrors = {};
    
    Object.entries(VALIDATION_RULES).forEach(([field, rules]) => {
      const value = formData[field];
      
      if (rules.required && !value) {
        newErrors[field] = rules.required;
        return;
      }

      if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternError;
        return;
      }

      if (field === "year" && value) {
        const yearNum = parseInt(value);
        if (isNaN(yearNum) || yearNum < rules.min || yearNum > rules.max) {
          newErrors[field] = rules.rangeError(rules.min, rules.max);
        }
      }

      if (field === "capacity" && value) {
        const capacityNum = parseFloat(value);
        if (isNaN(capacityNum) || capacityNum < rules.min || capacityNum > rules.max) {
          newErrors[field] = rules.rangeError(rules.min, rules.max);
        }
      }

      if (field === "registrationExpiryDate" && value) {
        const expiryDate = new Date(value);
        const today = new Date();
        if (expiryDate < today) {
          newErrors[field] = rules.futureDate;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // API Functions
  const fetchVehicleList = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      const response = await axios.get(`${BASE_URL}/api/registerDriver/vehicle`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const vehicleData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];
      setVehicles(vehicleData);
    } catch (error) {
      handleVehicleError(error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ visible: true, message, type });
    Animated.sequence([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification({ visible: false, message: "", type: "" });
    });
  };

  const createOrUpdateVehicle = async () => {
    if (!validateFormData()) return;

    setIsUpdating(true);
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
      });
      
      if (response.status === 200) {
        showNotification(
          vehicleId ? "Cập nhật thông tin xe thành công!" : "Thêm xe mới thành công!",
          "success"
        );
        setViewMode("list");
      }
    } catch (error) {
      handleVehicleError(error);
    } finally {
      setIsUpdating(false);
    }
  };

  // UI Components
  const VehicleItem = ({ vehicle }) => (
    <View style={styles.vehicleItem}>
      {vehicle.frontView ? (
        <Image source={{ uri: vehicle.frontView }} style={styles.vehicleIcon} />
      ) : (
        <Ionicons name="car" size={40} color="#00b5ec" style={styles.vehicleIcon} />
      )}
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>
          {vehicle.make} {vehicle.model}
        </Text>
        <Text style={styles.vehicleDetail}>
          Ngày hết hạn: {new Date(vehicle.registrationExpiryDate).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.manageButton}
        onPress={() => handleSelectVehicle(vehicle)}
      >
        <Text style={styles.manageButtonText}>Quản lý</Text>
      </TouchableOpacity>
    </View>
  );

  const ImageSection = ({ field, label }) => (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {formData[field] ? (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: formData[field] }} style={styles.vehicleImage} />
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
          <Ionicons name="camera" size={24} color="#00b5ec" />
          <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
      )}
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  // Event Handlers
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSelectVehicle = (vehicle) => {
    try {
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
      showNotification("Đã tải thông tin xe thành công!", "success");
    } catch (error) {
      showNotification("Không thể tải thông tin xe. Vui lòng thử lại!", "error");
    }
  };

  const handleCreateNew = () => {
    try {
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
        frontView: null,
        backView: null,
      });
      setViewMode("form");
      showNotification("Đã sẵn sàng để thêm xe mới!", "success");
    } catch (error) {
      showNotification("Không thể tạo form mới. Vui lòng thử lại!", "error");
    }
  };

  const selectImage = async (field) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showNotification("Cần quyền truy cập camera để sử dụng tính năng này!", "error");
        return;
      }

      Alert.alert("Chọn nguồn ảnh", "Chọn nguồn ảnh", [
        {
          text: "Chụp ảnh",
          onPress: async () => {
            try {
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
                showNotification("Đã thêm ảnh thành công!", "success");
              }
            } catch (error) {
              showNotification("Không thể mở camera. Vui lòng thử lại!", "error");
            }
          },
        },
        {
          text: "Thư viện",
          onPress: async () => {
            try {
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
                showNotification("Đã thêm ảnh thành công!", "success");
              }
            } catch (error) {
              showNotification("Không thể mở thư viện ảnh. Vui lòng thử lại!", "error");
            }
          },
        },
        {
          text: "Hủy",
          style: "cancel",
        },
      ]);
    } catch (error) {
      showNotification("Đã xảy ra lỗi khi chọn ảnh. Vui lòng thử lại!", "error");
    }
  };

  // Render Functions
  const renderList = () => (
    <View style={styles.listContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#00b5ec" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Phương tiện</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00b5ec" style={styles.loader} />
        ) : (
          <>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <VehicleItem key={vehicle.vehicleId} vehicle={vehicle} />
              ))
            ) : (
              <Text style={styles.noDataText}>
                Không có phương tiện nào trong danh sách.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.floatingButton} onPress={handleCreateNew}>
        <Ionicons name="add" size={40} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setViewMode("list")}>
          <Ionicons name="arrow-back" size={24} color="#00b5ec" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {vehicleId ? "Cập nhật thông tin xe" : "Tạo mới thông tin xe"}
        </Text>
      </View>

      {/* Thông tin cơ bản */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
        <View style={styles.sectionContent}>
          {["licensePlate", "vehicleType", "make", "model"].map((field) => (
            <View key={field} style={styles.inputContainer}>
              <Text style={styles.label}>{VALIDATION_RULES[field].label}</Text>
              <TextInput
                style={[styles.input, errors[field] && styles.inputError]}
                placeholder={`Nhập ${VALIDATION_RULES[field].label.toLowerCase()}`}
                value={formData[field]}
                onChangeText={(text) => handleInputChange(field, text)}
              />
              {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Thông số kỹ thuật */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
        <View style={styles.sectionContent}>
          {["year", "capacity", "dimensions"].map((field) => (
            <View key={field} style={styles.inputContainer}>
              <Text style={styles.label}>{VALIDATION_RULES[field].label}</Text>
              <TextInput
                style={[styles.input, errors[field] && styles.inputError]}
                placeholder={`Nhập ${VALIDATION_RULES[field].label.toLowerCase()}`}
                value={formData[field]}
                keyboardType={field === "year" || field === "capacity" ? "numeric" : "default"}
                onChangeText={(text) => handleInputChange(field, text)}
              />
              {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Thông tin pháp lý */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Thông tin pháp lý</Text>
        <View style={styles.sectionContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{VALIDATION_RULES.insuranceStatus.label}</Text>
            <TextInput
              style={[styles.input, errors.insuranceStatus && styles.inputError]}
              placeholder={`Nhập ${VALIDATION_RULES.insuranceStatus.label.toLowerCase()}`}
              value={formData.insuranceStatus}
              onChangeText={(text) => handleInputChange("insuranceStatus", text)}
            />
            {errors.insuranceStatus && (
              <Text style={styles.errorText}>{errors.insuranceStatus}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <DatePickerField
              label={VALIDATION_RULES.registrationExpiryDate.label}
              value={formData.registrationExpiryDate}
              onChange={(value) => handleInputChange("registrationExpiryDate", value)}
              field="registrationExpiryDate"
              error={errors.registrationExpiryDate}
              style={[styles.input, errors.registrationExpiryDate && styles.inputError]}
            />
          </View>
        </View>
      </View>

      {/* Hình ảnh */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Hình ảnh xe</Text>
        <View style={styles.sectionContent}>
          <ImageSection field="frontView" label={VALIDATION_RULES.frontView.label} />
          <ImageSection field="backView" label={VALIDATION_RULES.backView.label} />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, isUpdating && styles.buttonDisabled]} 
        onPress={createOrUpdateVehicle}
        disabled={isUpdating}
      >
        {isUpdating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {vehicleId ? "Cập nhật" : "Tạo mới"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Loading Overlay */}
      <Modal
        transparent={true}
        visible={isUpdating}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00b5ec" />
            <Text style={styles.loadingText}>
              {vehicleId ? "Đang cập nhật thông tin xe..." : "Đang thêm xe mới..."}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Notification */}
      {notification.visible && (
        <Animated.View 
          style={[
            styles.notification,
            { opacity: notificationOpacity },
            notification.type === "success" ? styles.notificationSuccess : styles.notificationError
          ]}
        >
          <View style={[
            styles.notificationIconContainer,
            notification.type === "success" ? styles.notificationSuccessIcon : styles.notificationErrorIcon
          ]}>
            <Ionicons 
              name={notification.type === "success" ? "checkmark-circle" : "alert-circle"} 
              size={24} 
              style={[
                styles.notificationIcon,
                notification.type === "success" ? styles.notificationSuccessIconColor : styles.notificationErrorIconColor
              ]}
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationTitle,
              notification.type === "success" ? styles.notificationSuccessTitle : styles.notificationErrorTitle
            ]}>
              {notification.type === "success" ? "Thành công" : "Lỗi"}
            </Text>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );

  return viewMode === "list" ? renderList() : renderForm();
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#f5f5f5",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginTop: Platform.OS === "ios" ? 20 : 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
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
  backIcon: {
    marginRight: 10,
    color: "#00b5ec",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  vehicleIcon: {
    width: 65,
    height: 65,
    borderRadius: 10,
    marginRight: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  vehicleDetail: {
    fontSize: 14,
    color: "#666",
  },
  manageButton: {
    backgroundColor: "#00b5ec",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#00b5ec",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
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
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    height: 45,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ff3b30",
    backgroundColor: "#fff5f5",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#00b5ec",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#00b5ec",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#00b5ec",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#00b5ec",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00b5ec",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
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
  uploadButtonText: {
    color: "#00b5ec",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "600",
  },
  retakeButton: {
    backgroundColor: "#00b5ec",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#00b5ec",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  vehicleImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  imageContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
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
    color: "#00b5ec",
    fontSize: 16,
  },
  iosDatePickerDone: {
    color: "#00b5ec",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionContent: {
    paddingHorizontal: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  notification: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  notificationSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  notificationError: {
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  notificationSuccessIcon: {
    backgroundColor: "#E8F5E9",
  },
  notificationErrorIcon: {
    backgroundColor: "#FFEBEE",
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationSuccessIconColor: {
    color: "#4CAF50",
  },
  notificationErrorIconColor: {
    color: "#F44336",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationSuccessTitle: {
    color: "#2E7D32",
  },
  notificationErrorTitle: {
    color: "#C62828",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
  },
});

export default VehicleScreen;
