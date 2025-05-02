import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import DatePickerField from "../../components/DatePickerField";
import { useAlert } from "../../components/CustomAlert";

const VALIDATION_RULES = {
  licenseNumber: {
    label: "Số bằng lái",
    required: "Số bằng lái là bắt buộc.",
    pattern: /^[A-Z0-9-]+$/,
    patternError: "Số bằng lái không hợp lệ",
  },
  licenseType: {
    label: "Loại bằng lái",
    required: "Loại bằng lái là bắt buộc.",
    pattern: /^[A-Z0-9\s]+$/,
    patternError: "Loại bằng lái không hợp lệ (A1,A2,B1,...).",
  },
  issuedDate: {
    label: "Ngày cấp",
    required: "Ngày cấp là bắt buộc.",
    pastDate: "Ngày cấp phải là ngày trong quá khứ.",
    invalidDate: "Ngày cấp không hợp lệ.",
  },
  expiryDate: {
    label: "Ngày hết hạn",
    required: "Ngày hết hạn là bắt buộc.",
    futureDate: "Ngày hết hạn phải sau ngày cấp.",
    invalidDate: "Ngày hết hạn không hợp lệ.",
  },
  issuingAuthority: {
    label: "Cơ quan cấp",
    required: "Cơ quan cấp là bắt buộc.",
    pattern: /^[^@#$%^&*!]+$/,
    patternError: "Cơ quan cấp không được chứa ký tự đặc biệt (@, #, $, %, ^, &, *, !).",
  },
  frontView: {
    label: "Mặt trước bằng lái",
    required: "Mặt trước bằng lái là bắt buộc.",
  },
  backView: {
    label: "Mặt sau bằng lái",
    required: "Mặt sau bằng lái là bắt buộc.",
  },
};

const LicenseScreen = () => {
  const navigation = useNavigation();
  const [licenseDetails, setLicenseDetails] = useState({
    licenseNumber: "",
    licenseType: "",
    issuedDate: "",
    expiryDate: "",
    issuingAuthority: "",
    frontView: null,
    backView: null,
  });
  const [showCustomType, setShowCustomType] = useState(false);
  const [licenseId, setLicenseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { logout } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const [isUpdating, setIsUpdating] = useState(false);

  const licenseTypes = [
    { value: '', label: 'Chọn loại bằng lái' },
    { value: 'B1', label: 'Hạng B1 (10 năm)' },
    { value: 'B2', label: 'Hạng B2 (10 năm)' },
    { value: 'C1', label: 'Hạng C1 (10 năm)' },
    { value: 'C', label: 'Hạng C (5 năm)' },
    { value: 'D1', label: 'Hạng D1 (5 năm)' },
    { value: 'D2', label: 'Hạng D2 (5 năm)' },
    { value: 'D', label: 'Hạng D (5 năm)' },
    { value: 'BE', label: 'Hạng BE (5 năm)' },
    { value: 'C1E', label: 'Hạng C1E (5 năm)' },
    { value: 'CE', label: 'Hạng CE (5 năm)' },
    { value: 'D1E', label: 'Hạng D1E (5 năm)' },
    { value: 'D2E', label: 'Hạng D2E (5 năm)' },
    { value: 'DE', label: 'Hạng DE (5 năm)' },
    { value: 'other', label: 'Khác' }
  ];

  const handleLicenseTypeChange = (value) => {
    if (value === 'other') {
      setShowCustomType(true);
    } else {
      setShowCustomType(false);
      setLicenseDetails(prev => ({ ...prev, licenseType: value }));
    }
  };

  const handleCustomTypeChange = (text) => {
    setLicenseDetails(prev => {
      const newState = { ...prev, licenseType: text };
      if (prev.issuedDate) {
        const issuedDate = new Date(prev.issuedDate);
        const expiryDate = new Date(issuedDate);
        expiryDate.setFullYear(issuedDate.getFullYear() + 5);
        newState.expiryDate = expiryDate.toISOString().split('T')[0];
      }
      return newState;
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Lỗi",
          "Cần cho phép truy cập máy ảnh để sử dụng tính năng này!"
        );
      }
    })();
    fetchLicenseDetails();
  }, []);

  const fetchLicenseDetails = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      const {
        data: { data: licenseData },
      } = await axios.get(`${BASE_URL}/api/registerDriver/license`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (licenseData) {
        setLicenseId(licenseData.licenseId);
        const existingType = licenseTypes.find(type => type.value === licenseData.licenseType);
        if (!existingType && licenseData.licenseType) {
          setShowCustomType(true);
        }
        setLicenseDetails({
          ...licenseData,
          issuedDate: licenseData.issuedDate ? licenseData.issuedDate.split("T")[0] : "",
          expiryDate: licenseData.expiryDate ? licenseData.expiryDate.split("T")[0] : "",
          frontView: licenseData.frontView,
          backView: licenseData.backView,
        });
      } else {
        setLicenseId(null);
        resetLicenseDetails();
      }
    } catch (error) {
      handleLicenseError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetLicenseDetails = () => {
    setLicenseDetails({
      licenseNumber: "",
      licenseType: "",
      issuedDate: "",
      expiryDate: "",
      issuingAuthority: "",
      frontView: null,
      backView: null,
    });
  };

  const handleLicenseError = async (error) => {
    if (error.response?.status === 401) {
      Alert.alert(
        "Phiên đăng nhập đã hết hạn",
        "Vui lòng đăng nhập lại.",
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
    } else if (error.response?.data?.message === "License not found") {
      setLicenseId(null);
      resetLicenseDetails();
    } else {
      showAlert({
        title: "Lỗi",
        message: "Đã xảy ra lỗi khi xử lý yêu cầu!",
        type: "error",
      });
    }
  };

  const validateInputs = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    Object.entries(VALIDATION_RULES).forEach(([field, rules]) => {
      const value = licenseDetails[field];
      
      if (rules.required && !value) {
        newErrors[field] = rules.required;
        return;
      }

      if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternError;
        return;
      }

      if (field === "licenseNumber" && value) {
        if (value.length !== 12) {
          newErrors[field] = "Số bằng lái phải có đúng 12 ký tự";
          return;
        }
        if (!/^\d+$/.test(value)) {
          newErrors[field] = "Số bằng lái chỉ được nhập số";
          return;
        }
      }

      if (field === "licenseType" && value) {
        if (!showCustomType && !licenseTypes.map(t => t.value).includes(value)) {
          newErrors[field] = "Vui lòng chọn loại bằng lái hợp lệ";
          return;
        }
        if (showCustomType && value.length < 2) {
          newErrors[field] = "Loại bằng lái phải có ít nhất 2 ký tự";
          return;
        }
      }

      if (field === "issuedDate" && value) {
        const issuedDate = new Date(value);
        issuedDate.setHours(0, 0, 0, 0);
        
        if (issuedDate > today) {
          newErrors[field] = "Ngày cấp không được lớn hơn ngày hiện tại";
          return;
        }
      }
      
      if (field === "expiryDate" && value && licenseDetails.issuedDate) {
        const expiryDate = new Date(value);
        const issuedDate = new Date(licenseDetails.issuedDate);
        
        if (expiryDate <= issuedDate) {
          newErrors[field] = "Ngày hết hạn phải sau ngày cấp";
          return;
        }
      }

      if (field === "issuingAuthority" && value) {
        if (value.length < 5) {
          newErrors[field] = "Cơ quan cấp phải có ít nhất 5 ký tự";
          return;
        }
        if (value.length > 60) {
          newErrors[field] = "Cơ quan cấp không được vượt quá 60 ký tự";
          return;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectImage = async (view) => {
    Alert.alert(
      "Chọn nguồn ảnh",
      "Chọn chụp ảnh hoặc chọn từ thư viện",
      [
        {
          text: "Máy ảnh",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });
            if (!result.canceled) {
              if (view === "frontView") {
                await processImage(result.assets[0].uri);
              } else {
                setLicenseDetails((prev) => ({
                  ...prev,
                  [view]: result.assets[0].uri,
                }));
              }
              setErrors((prev) => ({ ...prev, [view]: null }));
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
            if (!result.canceled) {
              if (view === "frontView") {
                await processImage(result.assets[0].uri);
              } else {
                setLicenseDetails((prev) => ({
                  ...prev,
                  [view]: result.assets[0].uri,
                }));
              }
              setErrors((prev) => ({ ...prev, [view]: null }));
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const processImage = async (uri) => {
    try {
      setLoading(true);
      console.log("Bắt đầu xử lý ảnh bằng lái:", uri);

      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: `license_${Date.now()}.jpg`,
      });

      console.log("Đang gửi request OCR...");
      
      const response = await fetch("https://scan.ftcs.online/license", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        timeout: 30000,
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Dữ liệu quét được:", responseData);

      // Xử lý dữ liệu quét được
      const scannedData = {
        licenseNumber: responseData.id?.trim() || "",
        licenseType: responseData.type_lisence?.trim() || "",
        issuedDate: responseData.year ? `${responseData.year}-${responseData.month}-${responseData.day}` : "",
        expiryDate: responseData.thoi_han ? formatDateForInput(responseData.thoi_han) : "",
        issuingAuthority: responseData.province?.trim() || "",
      };

      console.log("Dữ liệu đã xử lý:", scannedData);

      // Cập nhật form với dữ liệu quét được
      setLicenseDetails(prev => ({
        ...prev,
        ...scannedData,
        frontView: uri
      }));

    } catch (error) {
      console.error("Lỗi khi quét ảnh:", {
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

      Alert.alert(
        "Lỗi",
        errorMessage,
        [
          {
            text: "Thử lại",
            onPress: () => selectImage("frontView")
          },
          {
            text: "Bỏ qua",
            onPress: () => {
              setLicenseDetails(prev => ({
                ...prev,
                frontView: uri
              }));
            }
          }
        ]
      );

    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      // Xử lý các định dạng ngày khác nhau
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      // Nếu đã ở định dạng ISO
      return new Date(dateString).toISOString().split("T")[0];
    } catch (error) {
      console.warn("Lỗi định dạng ngày:", dateString);
      return "";
    }
  };

  const updateLicenseDetails = async () => {
    if (!validateInputs()) return;

    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      // Tạo đối tượng requestDTO
      const requestDTO = {
        licenseNumber: licenseDetails.licenseNumber,
        licenseType: licenseDetails.licenseType,
        issuedDate: licenseDetails.issuedDate ? `${licenseDetails.issuedDate}T00:00:00.000` : null,
        expiryDate: licenseDetails.expiryDate ? `${licenseDetails.expiryDate}T00:00:00.000` : null,
        issuingAuthority: licenseDetails.issuingAuthority,
      };

      console.log('Request DTO:', JSON.stringify(requestDTO, null, 2));

      const formData = new FormData();
      formData.append("requestDTO", JSON.stringify(requestDTO));

      // Add images
      if (licenseDetails.frontView) {
        const frontFile = {
          uri: licenseDetails.frontView,
          type: "image/jpeg",
          name: "front.jpg",
        };
        formData.append("frontFile", frontFile);
        console.log('Front image file:', frontFile);
      }

      if (licenseDetails.backView) {
        const backFile = {
          uri: licenseDetails.backView,
          type: "image/jpeg",
          name: "back.jpg",
        };
        formData.append("backFile", backFile);
        console.log('Back image file:', backFile);
      }

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const { data, status } = await axios.put(
        `${BASE_URL}/api/registerDriver/license`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (status === 200) {
        showAlert({
          title: "Thành công",
          message: "Cập nhật bằng lái thành công.",
          type: "success",
          autoClose: true,
        });
        setLicenseId(data.data.licenseId);
        navigation.goBack();
      }
    } catch (error) {
      handleLicenseError(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const createNewLicense = async () => {
    if (!validateInputs()) return;

    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      // Tạo đối tượng requestDTO
      const requestDTO = {
        licenseNumber: licenseDetails.licenseNumber,
        licenseType: licenseDetails.licenseType,
        issuedDate: licenseDetails.issuedDate ? `${licenseDetails.issuedDate}T00:00:00.000` : null,
        expiryDate: licenseDetails.expiryDate ? `${licenseDetails.expiryDate}T00:00:00.000` : null,
        issuingAuthority: licenseDetails.issuingAuthority,
      };

      console.log('Request DTO:', JSON.stringify(requestDTO, null, 2));

      const formData = new FormData();
      formData.append("requestDTO", JSON.stringify(requestDTO));

      if (licenseDetails.frontView) {
        const frontFile = {
          uri: licenseDetails.frontView,
          type: "image/jpeg",
          name: "front.jpg",
        };
        formData.append("frontFile", frontFile);
        console.log('Front image file:', frontFile);
      }

      if (licenseDetails.backView) {
        const backFile = {
          uri: licenseDetails.backView,
          type: "image/jpeg",
          name: "back.jpg",
        };
        formData.append("backFile", backFile);
        console.log('Back image file:', backFile);
      }

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Gửi request
      const { data, status } = await axios.post(
        `${BASE_URL}/api/registerDriver/license`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Xử lý phản hồi
      if (status === 200) {
        showAlert({
          title: "Thành công",
          message: "Đăng ký bằng lái thành công.",
          type: "success",
          autoClose: true,
        });
        navigation.goBack();
      }
    } catch (error) {
      handleLicenseError(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "issuedDate" && value) {
      const issuedDate = new Date(value);
      const licenseType = licenseDetails.licenseType;
      let validDuration = 5;
      
      if (['B1', 'B2', 'C1'].includes(licenseType)) {
        validDuration = 10;
      }
      
      const expiryDate = new Date(issuedDate);
      expiryDate.setFullYear(issuedDate.getFullYear() + validDuration);
      
      const formattedExpiryDate = expiryDate.toISOString().split('T')[0];
      
      setLicenseDetails(prev => ({
        ...prev,
        [field]: value,
        expiryDate: formattedExpiryDate
      }));
    } else if (field === "licenseType") {
      setLicenseDetails(prev => {
        const newState = { ...prev, [field]: value };
        if (prev.issuedDate) {
          const issuedDate = new Date(prev.issuedDate);
          let validDuration = 5;
          
          if (['B1', 'B2', 'C1'].includes(value)) {
            validDuration = 10;
          }
          
          const expiryDate = new Date(issuedDate);
          expiryDate.setFullYear(issuedDate.getFullYear() + validDuration);
          newState.expiryDate = expiryDate.toISOString().split('T')[0];
        }
        return newState;
      });
    } else {
      setLicenseDetails(prev => ({ ...prev, [field]: value }));
    }
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const renderImageSection = (view, label) => (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {licenseDetails[view] ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: licenseDetails[view] }}
            style={styles.licenseImage}
          />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => selectImage(view)}
          >
            <Text style={styles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, errors[view] && styles.inputError]}
          onPress={() => selectImage(view)}
        >
          <Ionicons name="camera" size={24} color="#00b5ec" />
          <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
      )}
      {errors[view] && <Text style={styles.errorText}>{errors[view]}</Text>}
    </View>
  );

  const renderInputField = (label, field, placeholder) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        value={licenseDetails[field]}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={"#999"}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={styles.header}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#000"
              style={styles.backIcon}
            />
            <Text style={styles.headerTitle}>Bằng lái</Text>
          </View>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#00b5ec"
            style={styles.loader}
          />
        ) : (
          <>
            {renderInputField(
              "Số bằng lái",
              "licenseNumber",
              "Nhập số bằng lái"
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Loại bằng lái</Text>
              <View style={[styles.dropdownContainer, errors.licenseType && styles.inputError]}>
                <Picker
                  selectedValue={showCustomType ? 'other' : licenseDetails.licenseType}
                  onValueChange={handleLicenseTypeChange}
                  style={[styles.picker]}
                  mode="dropdown"
                  dropdownIconColor="#000"
                  enabled={!loading}
                >
                  {licenseTypes.map((type) => (
                    <Picker.Item 
                      key={type.value} 
                      label={type.label} 
                      value={type.value}
                      color={type.value === '' ? '#999' : '#000'}
                    />
                  ))}
                </Picker>
              </View>
              {showCustomType && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }, errors.licenseType && styles.inputError]}
                  value={licenseDetails.licenseType}
                  onChangeText={handleCustomTypeChange}
                  placeholder="Nhập loại bằng lái"
                  placeholderTextColor="#999"
                  editable={!loading}
                />
              )}
              {errors.licenseType && <Text style={styles.errorText}>{errors.licenseType}</Text>}
            </View>
            <DatePickerField
              label="Ngày cấp"
              value={licenseDetails.issuedDate}
              onChange={(value) => handleInputChange("issuedDate", value)}
              field="issuedDate"
              error={errors.issuedDate}
              style={[styles.input, errors.issuedDate && styles.inputError]}
            />

            <DatePickerField
              label="Ngày hết hạn"
              value={licenseDetails.expiryDate}
              onChange={(value) => handleInputChange("expiryDate", value)}
              field="expiryDate"
              error={errors.expiryDate}
              style={[styles.input, { backgroundColor: '#f5f5f5' }, errors.expiryDate && styles.inputError]}
              disabled={true}
            />
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cơ quan cấp</Text>
              <TextInput
                style={[styles.input, errors.issuingAuthority && styles.inputError]}
                value={licenseDetails.issuingAuthority}
                onChangeText={(text) => handleInputChange("issuingAuthority", text)}
                placeholder="Nhập cơ quan cấp"
                placeholderTextColor="#999"
                maxLength={60}
              />
              {errors.issuingAuthority && (
                <Text style={styles.errorText}>{errors.issuingAuthority}</Text>
              )}
            </View>
            {renderImageSection("frontView", "Mặt trước bằng lái")}
            {renderImageSection("backView", "Mặt sau bằng lái")}
            <TouchableOpacity
              style={[styles.saveButton, isUpdating && styles.buttonDisabled]}
              onPress={licenseId ? updateLicenseDetails : createNewLicense}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {licenseId ? "Cập nhật" : "Tạo mới bằng lái"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

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
                {licenseId ? "Đang cập nhật bằng lái..." : "Đang tạo bằng lái mới..."}
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: Platform.OS === "ios" ? 20 : 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backIcon: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
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
  saveButton: {
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
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loader: {
    marginTop: 20,
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
  licenseImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  uploadButton: {
    backgroundColor: "#f0f0f0",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    color: "#00b5ec",
    fontSize: 16,
    marginLeft: 10,
  },
  retakeButton: {
    backgroundColor: "#00b5ec",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  datePickerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    height: "100%",
    justifyContent: "flex-end",
  },
  datePickerWrapper: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  datePickerButtonText: {
    color: "#00b5ec",
    fontSize: 16,
  },
  datePickerIOS: {
    height: 200,
    width: "100%",
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
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    height: 45,
    justifyContent: 'center',
  },
  picker: {
    height: 65,
    width: '100%',
    color: '#000',
  },
});

export default LicenseScreen;
