import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Dimensions,
  Pressable,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import { useAlert } from "../../components/CustomAlert";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_WIDTH = SCREEN_WIDTH / 4;

const TabBar = ({ tabs, activeTab, onTabPress }) => {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.tab,
            activeTab === index && styles.activeTab,
            { borderBottomWidth: activeTab === index ? 2 : 0 }
          ]}
          onPress={() => onTabPress(index)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === index && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ProgressBar = ({ progress }) => (
  <View style={styles.progressBarContainer}>
    <View style={[styles.progressBar, { width: `${progress}%` }]} />
  </View>
);

const ImageCameraField = ({
  label,
  image,
  onImageSelect,
  error,
  onScanComplete,
  scanEnabled = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập bị từ chối",
        "Cần quyền camera để sử dụng tính năng này",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const processImage = async (uri) => {
    try {
      setIsLoading(true);
      console.log(`[${label}] Bắt đầu xử lý ảnh:`, uri);

      if (!scanEnabled) {
        console.log(`[${label}] Scan bị tắt, chỉ chọn ảnh`);
        const imageData = {
          uri,
          type: "image/jpeg",
          name: `photo_${Date.now()}.jpg`,
        };
        onImageSelect(imageData);
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      });

      // Thử endpoint chính
      let response;
      try {
        console.log(`[${label}] Thử endpoint chính: https://scan-id.ftcs.online/uploader`);
        response = await fetch(
          "https://scan-id.ftcs.online/uploader",
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
            timeout: 30000,
          }
        );
      } catch (error) {
        console.log(`[${label}] Lỗi endpoint chính:`, error);
        // Thử endpoint dự phòng
        console.log(`[${label}] Thử endpoint dự phòng: https://api.ftcs.online/ocr`);
        response = await fetch(
          "https://api.ftcs.online/ocr",
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
            timeout: 30000,
          }
        );
      }

      console.log(`[${label}] Response status:`, response.status);
      console.log(`[${label}] Response headers:`, response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(`[${label}] Response data:`, responseData);

      // Xử lý dữ liệu OCR từ cả hai endpoint
      const scannedData = {
        idNumber: responseData.id_number || responseData.idNumber || "",
        fullName: responseData.full_name || responseData.fullName || "",
        birthday: responseData.dob || responseData.birthday ? formatDateForInput(responseData.dob || responseData.birthday) : "",
        gender: responseData.gender || "",
        country: responseData.nationality || responseData.country || "",
        permanentStreetAddress: responseData.residence || responseData.address || "",
        expiryDate: responseData.expiry_date || responseData.expiryDate ? formatDateForInput(responseData.expiry_date || responseData.expiryDate) : "",
      };

      console.log(`[${label}] Dữ liệu đã xử lý:`, scannedData);

      if (onScanComplete) {
        console.log(`[${label}] Gọi onScanComplete với dữ liệu:`, scannedData);
        onScanComplete(scannedData);
      }

      const imageData = {
        uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      };
      onImageSelect(imageData);
    } catch (error) {
      console.error(`[${label}] Lỗi khi quét ảnh:`, {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });

      let errorMessage = "Không thể quét thông tin từ ảnh. Vui lòng thử lại.";
      if (error.message.includes("timeout")) {
        errorMessage = "Kết nối quá thời gian. Vui lòng kiểm tra mạng.";
      } else if (error.message.includes("Network")) {
        errorMessage = "Lỗi kết nối mạng. Vui lòng thử lại.";
      } else if (error.message.includes("HTTP error")) {
        errorMessage = "Lỗi kết nối với máy chủ OCR. Vui lòng thử lại sau.";
      }

      Alert.alert("Lỗi", errorMessage, [{ text: "OK" }]);

      // Vẫn cho phép chọn ảnh dù scan thất bại
      const imageData = {
        uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      };
      onImageSelect(imageData);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      if (dateString.includes("/")) {
        // Xử lý ngày dạng "DD/MM/YYYY"
        const [day, month, year] = dateString.split("/");
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
      }
      
      // Xử lý trường hợp dateString là chuỗi ngày tháng thông thường
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}T00:00:00`;
    } catch (error) {
      console.warn(`[${label}] Lỗi định dạng ngày:`, dateString);
      return "";
    }
  };

  const selectImage = async () => {
    Alert.alert(
      "Chọn nguồn ảnh",
      "Chọn chụp ảnh hoặc lấy từ thư viện",
      [
        {
          text: "Camera",
          onPress: async () => {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
              await processImage(result.assets[0].uri);
            }
          },
        },
        {
          text: "Thư viện",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
              await processImage(result.assets[0].uri);
            }
          },
        },
        { text: "Hủy", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : image ? (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: image.uri }} style={styles.idImage} />
          <TouchableOpacity style={styles.retakeButton} onPress={selectImage}>
            <Text style={styles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, error && styles.inputError]}
          onPress={selectImage}
        >
          <Ionicons name="camera" size={24} color="#007AFF" />
          <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  error,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} <Text style={styles.required}>*</Text>
    </Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const DatePickerField = ({ label, value, onChange, error }) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      
      // Lấy ngày theo múi giờ địa phương
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn("Error formatting date for display:", error);
      return "";
    }
  };
  

  const formatDateForServer = (date) => {
    if (!date) return "";
    try {
      // Ensure we have a valid Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Lấy ngày theo múi giờ địa phương, không phải UTC
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}T00:00:00`;
    } catch (error) {
      console.warn("Error formatting date for server:", error);
      return "";
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (selectedDate) {
        const formattedDate = formatDateForServer(selectedDate);
        onChange(formattedDate);
      }
    } else {
      setTempDate(selectedDate || tempDate);
    }
  };

  const handleIOSConfirm = () => {
    setShow(false);
    const formattedDate = formatDateForServer(tempDate);
    onChange(formattedDate);
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} {error && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={[styles.input, error && styles.inputError]} 
        onPress={() => setShow(true)}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDateForDisplay(value) : "Vui lòng chọn ngày"}
        </Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && show && (
        <View style={styles.iosDatePickerContainer}>
          <View style={styles.iosDatePickerHeader}>
            <TouchableOpacity onPress={() => setShow(false)}>
              <Text style={styles.iosDatePickerCancel}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={styles.iosDatePickerDone}>Xong</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value ? new Date(value) : new Date()}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            style={styles.iosDatePicker}
          />
        </View>
      )}

      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const PickerField = ({
  label,
  items,
  selectedValue,
  onValueChange,
  enabled = true,
  error,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [temporaryValue, setTemporaryValue] = useState(selectedValue);

  useEffect(() => {
    setTemporaryValue(selectedValue);
  }, [selectedValue]);

  const handleDone = useCallback(() => {
    setIsVisible(false);
    if (temporaryValue !== selectedValue) {
      onValueChange(temporaryValue);
    }
  }, [temporaryValue, selectedValue, onValueChange]);

  const handleCancel = useCallback(() => {
    setIsVisible(false);
    setTemporaryValue(selectedValue);
  }, [selectedValue]);

  const getDisplayText = useCallback(() => {
    if (!items || !Array.isArray(items) || items.length === 0)
      return "Chọn địa chỉ của bạn";

    const selectedItem = items.find(
      (item) => String(item.id) === String(selectedValue)
    );

    return selectedItem?.fullName || "Chọn địa chỉ của bạn";
  }, [items, selectedValue]);

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>

      {Platform.OS === "ios" ? (
        <>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              !enabled && styles.pickerButtonDisabled,
            ]}
            onPress={() => enabled && setIsVisible(true)}
            disabled={!enabled}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !selectedValue && styles.placeholderText,
                !enabled && styles.pickerButtonTextDisabled,
              ]}
              numberOfLines={1}
            >
              {getDisplayText()}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleCancel}
          >
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalDismiss} onPress={handleCancel} />
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleCancel}>
                    <Text style={styles.modalCancel}>Hủy</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{label}</Text>
                  <TouchableOpacity onPress={handleDone}>
                    <Text style={styles.modalDone}>Xong</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={temporaryValue}
                    onValueChange={(value) => {
                      setTemporaryValue(value);
                    }}
                    enabled={enabled}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item
                      label="Chọn địa chỉ của bạn"
                      value=""
                      color={enabled ? "#000" : "#999"}
                    />
                    {safeItems.map((item) => (
                      <Picker.Item
                        key={String(item.id)}
                        label={item.fullName || ""}
                        value={String(item.id)}
                        color={enabled ? "#000" : "#999"}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.androidPickerContainer}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={onValueChange}
            enabled={enabled}
            style={[styles.picker, !enabled && styles.pickerDisabled]}
            mode="dropdown"
          >
            <Picker.Item
              label="Chọn địa chỉ của bạn"
              value=""
              color={enabled ? "#000" : "#999"}
            />
            {safeItems.map((item) => (
              <Picker.Item
                key={String(item.id)}
                label={item.fullName || ""}
                value={String(item.id)}
                color={enabled ? "#000" : "#999"}
              />
            ))}
          </Picker>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const UpdateDriverIdentificationScreen = ({ navigation, initialData }) => {
  const { createDriverIdentification, getProvinces, getDistricts, getWards } =
    useContext(AuthContext);
  const { showAlert } = useAlert();
  const [isCreateMode, setIsCreateMode] = useState(false);

  const tabs = [
    { label: "Thông tin", icon: "person" },
    { label: "Thường trú", icon: "home" },
    { label: "Tạm trú", icon: "business" },
    { label: "CCCD", icon: "card" },
  ];

  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    idNumber: "",
    fullName: "",
    gender: "",
    birthday: "",
    country: "",
    permanentAddressWard: "",
    permanentAddressDistrict: "",
    permanentAddressProvince: "",
    permanentStreetAddress: "",
    temporaryAddressWard: "",
    temporaryAddressDistrict: "",
    temporaryAddressProvince: "",
    temporaryStreetAddress: "",
    issueDate: "",
    expiryDate: "",
    issuedBy: "",
    frontFile: null,
    backFile: null,
  });

  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [permanentDistricts, setPermanentDistricts] = useState([]);
  const [temporaryDistricts, setTemporaryDistricts] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [temporaryWards, setTemporaryWards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const provinceList = await getProvinces();
        setProvinces(provinceList);
      } catch (error) {
        Alert.alert("Error", "Failed to load provinces.");
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        if (initialData) {
          setFormData({
            idNumber: initialData.idNumber || "",
            fullName: initialData.fullName || "",
            gender: initialData.gender || "",
            birthday: initialData.birthday || "",
            country: initialData.country || "",
            permanentAddressWard: initialData.permanentAddress?.ward?.id
              ? String(initialData.permanentAddress.ward.id)
              : "",
            permanentAddressDistrict: initialData.permanentAddress?.district?.id
              ? String(initialData.permanentAddress.district.id)
              : "",
            permanentAddressProvince: initialData.permanentAddress?.province?.id
              ? String(initialData.permanentAddress.province.id)
              : "",
            permanentStreetAddress: initialData.permanentAddress?.streetAddress || "",
            temporaryAddressWard: initialData.temporaryAddress?.ward?.id
              ? String(initialData.temporaryAddress.ward.id)
              : "",
            temporaryAddressDistrict: initialData.temporaryAddress?.district?.id
              ? String(initialData.temporaryAddress.district.id)
              : "",
            temporaryAddressProvince: initialData.temporaryAddress?.province?.id
              ? String(initialData.temporaryAddress.province.id)
              : "",
            temporaryStreetAddress: initialData.temporaryAddress?.streetAddress || "",
            issueDate: initialData.issueDate || "",
            expiryDate: initialData.expiryDate || "",
            issuedBy: initialData.issuedBy || "",
            frontFile: initialData.frontView ? { uri: initialData.frontView } : null,
            backFile: initialData.backView ? { uri: initialData.backView } : null,
          });

          // Load address data
          if (initialData.permanentAddress?.province?.id) {
            const permanentDistricts = await getDistricts(
              initialData.permanentAddress.province.id
            );
            setPermanentDistricts(permanentDistricts);

            if (initialData.permanentAddress?.district?.id) {
              const permanentWards = await getWards(
                initialData.permanentAddress.district.id
              );
              setPermanentWards(permanentWards);
            }
          }

          if (initialData.temporaryAddress?.province?.id) {
            const temporaryDistricts = await getDistricts(
              initialData.temporaryAddress.province.id
            );
            setTemporaryDistricts(temporaryDistricts);

            if (initialData.temporaryAddress?.district?.id) {
              const temporaryWards = await getWards(
                initialData.temporaryAddress.district.id
              );
              setTemporaryWards(temporaryWards);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [initialData]);

  const handleProvinceChange = async (value, addressType) => {
    if (!value) return;

    try {
      const districtsData = await getDistricts(value);

      if (addressType === "permanent") {
        setFormData((prev) => ({
          ...prev,
          permanentAddressProvince: value,
          permanentAddressDistrict: "",
          permanentAddressWard: "",
        }));
        setPermanentDistricts(districtsData);
        setPermanentWards([]);
      } else {
        setFormData((prev) => ({
          ...prev,
          temporaryAddressProvince: value,
          temporaryAddressDistrict: "",
          temporaryAddressWard: "",
        }));
        setTemporaryDistricts(districtsData);
        setTemporaryWards([]);
      }
    } catch (error) {
      console.error("Error loading districts:", error);
      Alert.alert("Error", "Failed to load districts.");
    }
  };

  const handleDistrictChange = async (value, addressType) => {
    if (!value) return;

    try {
      const wardsData = await getWards(value);

      if (addressType === "permanent") {
        setFormData((prev) => ({
          ...prev,
          permanentAddressDistrict: value,
          permanentAddressWard: "",
        }));
        setPermanentWards(wardsData);
      } else {
        setFormData((prev) => ({
          ...prev,
          temporaryAddressDistrict: value,
          temporaryAddressWard: "",
        }));
        setTemporaryWards(wardsData);
      }
    } catch (error) {
      console.error("Error loading wards:", error);
      Alert.alert("Error", "Failed to load wards.");
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const validateCurrentTab = () => {
    const newErrors = {};
    switch (activeTab) {
      case 0: // Personal info
        if (!formData.idNumber) newErrors.idNumber = "Vui lòng nhập số CCCD";
        if (!formData.fullName) newErrors.fullName = "Vui lòng nhập họ tên";
        if (!formData.gender) newErrors.gender = "Vui lòng chọn giới tính";
        if (!formData.birthday) newErrors.birthday = "Vui lòng chọn ngày sinh";
        if (!formData.country) newErrors.country = "Vui lòng nhập quốc tịch";
        break;
      case 1: // Permanent address
        if (!formData.permanentAddressProvince) 
          newErrors.permanentAddressProvince = "Vui lòng chọn tỉnh/thành phố";
        if (!formData.permanentAddressDistrict) 
          newErrors.permanentAddressDistrict = "Vui lòng chọn quận/huyện";
        if (!formData.permanentAddressWard) 
          newErrors.permanentAddressWard = "Vui lòng chọn phường/xã";
        if (!formData.permanentStreetAddress) 
          newErrors.permanentStreetAddress = "Vui lòng nhập địa chỉ";
        break;
      case 2: // Temporary address
        if (!formData.temporaryAddressProvince) 
          newErrors.temporaryAddressProvince = "Vui lòng chọn tỉnh/thành phố";
        if (!formData.temporaryAddressDistrict) 
          newErrors.temporaryAddressDistrict = "Vui lòng chọn quận/huyện";
        if (!formData.temporaryAddressWard) 
          newErrors.temporaryAddressWard = "Vui lòng chọn phường/xã";
        if (!formData.temporaryStreetAddress) 
          newErrors.temporaryStreetAddress = "Vui lòng nhập địa chỉ";
        break;
      case 3: // Card info
        if (!formData.issueDate) newErrors.issueDate = "Vui lòng chọn ngày cấp";
        if (!formData.expiryDate) newErrors.expiryDate = "Vui lòng chọn ngày hết hạn";
        if (!formData.issuedBy) newErrors.issuedBy = "Vui lòng nhập nơi cấp";
        if (!formData.frontFile) newErrors.frontFile = "Vui lòng chụp ảnh mặt trước";
        if (!formData.backFile) newErrors.backFile = "Vui lòng chụp ảnh mặt sau";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTabPress = (index) => {
    if (validateCurrentTab()) {
      setActiveTab(index);
    }
  };

  const handleNext = () => {
    if (validateCurrentTab()) {
      if (activeTab < tabs.length - 1) {
        setActiveTab(activeTab + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!validateCurrentTab()) return;

    setIsLoading(true);
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        throw new Error("User information not found");
      }

      const parsedUserInfo = JSON.parse(userInfo);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      // Prepare form data
      const formDataToSend = new FormData();

      // Append files if they exist
      if (formData.frontFile) {
        formDataToSend.append("frontFile", {
          uri: formData.frontFile.uri,
          type: "image/jpeg",
          name: "front.jpeg",
        });
      }

      if (formData.backFile) {
        formDataToSend.append("backFile", {
          uri: formData.backFile.uri,
          type: "image/jpeg",
          name: "back.jpeg",
        });
      }

      // Format dates properly
    // Format dates properly
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}T00:00:00`;
  } catch (error) {
    console.warn("Error formatting date:", error);
    return "";
  }
};

      // Create requestDTO object with proper formatting
      const requestDTO = {
        idNumber: formData.idNumber.trim(),
        fullName: formData.fullName.trim(),
        gender: formData.gender === "Nam" ? "Nam" : "NữNữ",
        birthday: formatDate(formData.birthday),
        country: formData.country.trim(),
        permanentAddressWard: formData.permanentAddressWard ? Number(formData.permanentAddressWard) : null,
        permanentAddressDistrict: formData.permanentAddressDistrict ? Number(formData.permanentAddressDistrict) : null,
        permanentAddressProvince: formData.permanentAddressProvince ? Number(formData.permanentAddressProvince) : null,
        permanentStreetAddress: formData.permanentStreetAddress?.trim() || "",
        temporaryAddressWard: formData.temporaryAddressWard ? Number(formData.temporaryAddressWard) : null,
        temporaryAddressDistrict: formData.temporaryAddressDistrict ? Number(formData.temporaryAddressDistrict) : null,
        temporaryAddressProvince: formData.temporaryAddressProvince ? Number(formData.temporaryAddressProvince) : null,
        temporaryStreetAddress: formData.temporaryStreetAddress?.trim() || "",
        issueDate: formatDate(formData.issueDate),
        expiryDate: formatDate(formData.expiryDate),
        issuedBy: formData.issuedBy?.trim() || ""
      };

      // Append requestDTO as JSON string
      formDataToSend.append("requestDTO", JSON.stringify(requestDTO));

      // Call update API
      const response = await axios.put(
        `${BASE_URL}/api/registerDriver/identification`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        showAlert({
          title: "Thành công",
          message: "Cập nhật CCCD thành công.",
          type: "success",
          autoClose: true,
        });
        // navigation.navigate("Home");
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      const errorMessage =
        error.response?.data?.message || "Có lỗi xảy ra khi xử lý yêu cầu";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPersonalInfo = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
      
      <InputField
        label="Số CCCD"
        value={formData.idNumber}
        onChangeText={(value) => handleInputChange("idNumber", value)}
        placeholder="Nhập số CCCD"
        keyboardType="numeric"
        error={errors.idNumber}
      />

      <InputField
        label="Họ và tên"
        value={formData.fullName}
        onChangeText={(value) => handleInputChange("fullName", value)}
        placeholder="Nhập họ và tên"
        error={errors.fullName}
      />

      <View style={styles.genderContainer}>
        <Text style={styles.label}>Giới tính</Text>
        <View style={styles.genderOptions}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              formData.gender === "Nam" && styles.genderOptionSelected,
            ]}
            onPress={() => handleInputChange("gender", "Nam")}
          >
            <Text
              style={[
                styles.genderText,
                formData.gender === "Nam" && styles.genderTextSelected,
              ]}
            >
              Nam
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              formData.gender === "Nữ" && styles.genderOptionSelected,
            ]}
            onPress={() => handleInputChange("gender", "Nữ")}
          >
            <Text
              style={[
                styles.genderText,
                formData.gender === "Nữ" && styles.genderTextSelected,
              ]}
            >
              Nữ
            </Text>
          </TouchableOpacity>
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
      </View>

      <DatePickerField
        label="Ngày sinh"
        value={formData.birthday}
        onChange={(value) => handleInputChange("birthday", value)}
        error={errors.birthday}
      />

      <InputField
        label="Quốc tịch"
        value={formData.country}
        onChangeText={(value) => handleInputChange("country", value)}
        placeholder="Nhập quốc tịch"
        error={errors.country}
      />
    </View>
  );

  const renderPermanentAddress = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Địa chỉ thường trú</Text>

      <PickerField
        label="Tỉnh/Thành phố"
        items={provinces}
        selectedValue={formData.permanentAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "permanent")}
        error={errors.permanentAddressProvince}
      />

      <PickerField
        label="Quận/Huyện"
        items={permanentDistricts}
        selectedValue={formData.permanentAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "permanent")}
        enabled={!!formData.permanentAddressProvince}
        error={errors.permanentAddressDistrict}
      />

      <PickerField
        label="Phường/Xã"
        items={permanentWards}
        selectedValue={formData.permanentAddressWard}
        onValueChange={(value) => handleInputChange("permanentAddressWard", value)}
        enabled={!!formData.permanentAddressDistrict}
        error={errors.permanentAddressWard}
      />

      <InputField
        label="Địa chỉ"
        value={formData.permanentStreetAddress}
        onChangeText={(value) => handleInputChange("permanentStreetAddress", value)}
        placeholder="Nhập địa chỉ chi tiết"
        error={errors.permanentStreetAddress}
      />
    </View>
  );

  const renderTemporaryAddress = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Địa chỉ tạm trú</Text>

      <PickerField
        label="Tỉnh/Thành phố"
        items={provinces}
        selectedValue={formData.temporaryAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "temporary")}
        error={errors.temporaryAddressProvince}
      />

      <PickerField
        label="Quận/Huyện"
        items={temporaryDistricts}
        selectedValue={formData.temporaryAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "temporary")}
        enabled={!!formData.temporaryAddressProvince}
        error={errors.temporaryAddressDistrict}
      />

      <PickerField
        label="Phường/Xã"
        items={temporaryWards}
        selectedValue={formData.temporaryAddressWard}
        onValueChange={(value) => handleInputChange("temporaryAddressWard", value)}
        enabled={!!formData.temporaryAddressDistrict}
        error={errors.temporaryAddressWard}
      />

      <InputField
        label="Địa chỉ"
        value={formData.temporaryStreetAddress}
        onChangeText={(value) => handleInputChange("temporaryStreetAddress", value)}
        placeholder="Nhập địa chỉ chi tiết"
        error={errors.temporaryStreetAddress}
      />
    </View>
  );

  const renderCardInfo = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Thông tin CCCD</Text>

      <DatePickerField
        label="Ngày cấp"
        value={formData.issueDate}
        onChange={(value) => handleInputChange("issueDate", value)}
        error={errors.issueDate}
      />

      <DatePickerField
        label="Ngày hết hạn"
        value={formData.expiryDate}
        onChange={(value) => handleInputChange("expiryDate", value)}
        error={errors.expiryDate}
      />

      <InputField
        label="Nơi cấp"
        value={formData.issuedBy}
        onChangeText={(value) => handleInputChange("issuedBy", value)}
        placeholder="Nhập nơi cấp CCCD"
        error={errors.issuedBy}
      />

      <ImageCameraField
        label="Ảnh mặt trước CCCD"
        image={formData.frontFile}
        onImageSelect={(file) => handleInputChange("frontFile", file)}
        onScanComplete={(data) => {
          if (data) {
            handleInputChange("idNumber", data.idNumber);
            handleInputChange("fullName", data.fullName);
            handleInputChange("birthday", data.birthday);
            handleInputChange("gender", data.gender);
            handleInputChange("country", data.country);
            handleInputChange("permanentStreetAddress", data.permanentStreetAddress);
          }
        }}
        error={errors.frontFile}
      />

      <ImageCameraField
        label="Ảnh mặt sau CCCD"
        image={formData.backFile}
        onImageSelect={(file) => handleInputChange("backFile", file)}
        error={errors.backFile}
      />
    </View>
  );

  const renderScreen = () => {
    switch (activeTab) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderPermanentAddress();
      case 2:
        return renderTemporaryAddress();
      case 3:
        return renderCardInfo();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <View style={styles.header}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#212529"
            style={styles.backIcon}
          />
          <Text style={styles.title}>
            {isCreateMode ? "Đăng ký CCCD" : "Cập nhật thông tin CCCD"}
          </Text>
        </View>
      </TouchableOpacity>

      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
      <ProgressBar progress={(activeTab + 1) * 25} />

      <ScrollView style={styles.scrollView}>
        {renderScreen()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
        >
          <Text style={[styles.buttonText, styles.backButtonText]}>
            {activeTab === 0 ? 'Hủy' : 'Quay lại'}
          </Text>
        </TouchableOpacity>
        
        {activeTab === tabs.length - 1 ? (
          <TouchableOpacity
            style={[styles.button, isCreateMode ? styles.registerButton : styles.saveButton]}
            onPress={handleSubmit}
          >
            <Text style={[styles.buttonText, styles.saveButtonText]}>
              {isCreateMode ? 'Đăng ký' : 'Lưu thông tin'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={handleNext}
          >
            <Text style={[styles.buttonText, styles.nextButtonText]}>
              Tiếp theo
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomColor: '#00b5ec',
  },
  activeTab: {
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#00b5ec',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  inputText: {
    fontSize: 16,
    color: '#212529',
  },
  placeholderText: {
    color: '#6c757d',
  },
  required: {
    color: '#dc3545',
    marginLeft: 2,
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderOptionSelected: {
    backgroundColor: '#00b5ec',
    borderColor: '#00b5ec',
  },
  genderText: {
    fontSize: 16,
    color: '#212529',
  },
  genderTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  backButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  nextButton: {
    backgroundColor: '#00b5ec',
  },
  registerButton: {
    backgroundColor: '#28a745',
  },
  saveButton: {
    backgroundColor: '#00b5ec',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  backButtonText: {
    color: '#212529',
  },
  nextButtonText: {
    color: '#fff',
  },
  saveButtonText: {
    color: '#fff',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e9ecef',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00b5ec',
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  idImage: {
    width: '100%',
    height: 200,
  },
  uploadButton: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  uploadButtonText: {
    color: '#00b5ec',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  retakeButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  iosDatePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  iosDatePickerCancel: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iosDatePickerDone: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  pickerButtonText: {
    color: '#333',
    fontSize: 14,
  },
  pickerArrow: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 10,
  },
  pickerButtonTextDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCancel: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitle: {
    flex: 1,
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDone: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerWrapper: {
    marginBottom: 20,
  },
  pickerItem: {
    height: 40,
  },
  androidPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  pickerDisabled: {
    backgroundColor: '#f0f0f0',
  },
});

export default UpdateDriverIdentificationScreen; 