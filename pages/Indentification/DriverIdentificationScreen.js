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
  Pressable
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
//import { launchCamera } from 'react-native-image-picker';

import Ionicons from "react-native-vector-icons/Ionicons";

import * as ImagePicker from 'expo-image-picker';



const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ImageCameraField = ({ label, image, onImageSelect, error }) => {
  const selectImage = async () => {
    Alert.alert(
      "Chọn nguồn ảnh",
      "Chọn chụp ảnh hoặc lấy từ thư viện",
      [
        {
          text: "Camera",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
            });
            if (!result.canceled) {
              onImageSelect({
                uri: result.assets[0].uri,
                type: 'image/jpeg',
                name: 'photo.jpg'
              });
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
              onImageSelect({
                uri: result.assets[0].uri,
                type: 'image/jpeg',
                name: 'photo.jpg'
              });
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
      {image ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: image.uri }}
            style={styles.idImage}
          />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={selectImage}
          >
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
  </View>
);

const PickerField = ({ label, items, selectedValue, onValueChange, enabled = true }) => {
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

  // Improved display text function with better null checks
  const getDisplayText = useCallback(() => {
    if (!items || !Array.isArray(items) || items.length === 0) return "Chọn địa chỉ của bạn";
    
    // Ensure both values are strings for comparison
    const selectedItem = items.find(item => 
      String(item.id) === String(selectedValue)
    );
    
    return selectedItem?.fullName || "Chọn địa chỉ của bạn";
  }, [items, selectedValue]);

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>

      {Platform.OS === 'ios' ? (
        <>
          <TouchableOpacity 
            style={[
              styles.pickerButton, 
              !enabled && styles.pickerButtonDisabled
            ]}
            onPress={() => enabled && setIsVisible(true)}
            disabled={!enabled}
          >
            <Text 
              style={[
                styles.pickerButtonText,
                !selectedValue && styles.placeholderText,
                !enabled && styles.pickerButtonTextDisabled
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
              <Pressable 
                style={styles.modalDismiss} 
                onPress={handleCancel}
              />
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
                    itemStyle={styles.pickerItem} // Add specific styles for iOS picker items
                  >
                    <Picker.Item 
                      label="Chọn địa chỉ của bạn" 
                      value="" 
                      color={enabled ? '#000' : '#999'}
                    />
                    {safeItems.map((item) => (
                      <Picker.Item 
                        key={String(item.id)}
                        label={item.fullName || ''}
                        value={String(item.id)}
                        color={enabled ? '#000' : '#999'}
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
              color={enabled ? '#000' : '#999'}
            />
            {safeItems.map((item) => (
              <Picker.Item 
                key={String(item.id)}
                label={item.fullName || ''}
                value={String(item.id)}
                color={enabled ? '#000' : '#999'}
              />
            ))}
          </Picker>
        </View>
      )}
    </View>
  );
};

const DatePickerField = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        const formattedDate = selectedDate.toISOString().split(".")[0];
        onChange(formattedDate);
      }
    } else {
      setTempDate(selectedDate || tempDate);
    }
  };

  const handleIOSConfirm = () => {
    setShow(false);
    const formattedDate = tempDate.toISOString().split(".")[0];
    onChange(formattedDate);
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShow(true)}
      >
        <Text style={styles.dateButtonText}>
          {value ? value.split("T")[0] : "Vui lòng chọn ngày"}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && show && (
        <View style={styles.iosDatePickerContainer}>
          <View style={styles.iosDatePickerHeader}>
            <TouchableOpacity onPress={() => setShow(false)}>
              <Text style={styles.iosDatePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={styles.iosDatePickerDone}>Done</Text>
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

      {Platform.OS === 'android' && show && (
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

const DriverIdentificationScreen = ({ navigation }) => {
  const { createDriverIdentification, getProvinces, getDistricts, getWards } =
    useContext(AuthContext);

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
    backFile: null
  });

  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [permanentDistricts, setPermanentDistricts] = useState([]);
  const [temporaryDistricts, setTemporaryDistricts] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [temporaryWards, setTemporaryWards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field, value) => {

    if (field === "idNumber" && !value.trim()) {
      setIsEditMode(false);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

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

  const [isEditMode, setIsEditMode] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getDriverIdentificationById();
        
        if (data && (data.idNumber || data.fullName || data.driverIdentificationId)) {
          setIsEditMode(true);
  
          // Create a sequence of async operations
          const loadAddressData = async () => {
            // Load permanent address data
            if (data.permanentAddress?.province?.id) {
              const permanentDistricts = await getDistricts(data.permanentAddress.province.id);
              setPermanentDistricts(permanentDistricts);
  
              if (data.permanentAddress?.district?.id) {
                const permanentWards = await getWards(data.permanentAddress.district.id);
                setPermanentWards(permanentWards);
              }
            }
  
            // Load temporary address data
            if (data.temporaryAddress?.province?.id) {
              const temporaryDistricts = await getDistricts(data.temporaryAddress.province.id);
              setTemporaryDistricts(temporaryDistricts);
  
              if (data.temporaryAddress?.district?.id) {
                const temporaryWards = await getWards(data.temporaryAddress.district.id);
                setTemporaryWards(temporaryWards);
              }
            }
          };
  
          // Set form data
          setFormData({
            idNumber: data.idNumber || "",
            fullName: data.fullName || "",
            gender: data.gender || "",
            birthday: data.birthday || "",
            country: data.country || "",
            permanentAddressWard: data.permanentAddress?.ward?.id ? String(data.permanentAddress.ward.id) : "",
            permanentAddressDistrict: data.permanentAddress?.district?.id ? String(data.permanentAddress.district.id) : "",
            permanentAddressProvince: data.permanentAddress?.province?.id ? String(data.permanentAddress.province.id) : "",
            permanentStreetAddress: data.permanentAddress?.streetAddress || "",
           temporaryAddressWard: data.temporaryAddress?.ward?.id ? String(data.temporaryAddress.ward.id) : "",
           temporaryAddressDistrict: data.temporaryAddress?.district?.id ? String(data.temporaryAddress.district.id) : "",
           temporaryAddressProvince: data.temporaryAddress?.province?.id ? String(data.temporaryAddress.province.id) : "",
            temporaryStreetAddress: data.temporaryAddress?.streetAddress || "",
            issueDate: data.issueDate || "",
            expiryDate: data.expiryDate || "",
            issuedBy: data.issuedBy || "",
            frontFile: data.frontView ? { uri: data.frontView } : null,
            backFile: data.backView ? { uri: data.backView } : null,
          });
  
          // Load address data after setting form data
          await loadAddressData();
        } else {
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setIsEditMode(false);
      } finally {
       
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, []);
  
  const getDriverIdentificationById = async () => {
    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        setIsLoading(false);
        return null;
      }
  
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;
  
      if (!accessToken) {
        setIsLoading(false);
        return null;
      }
  
      const res = await axios.get(
        `${BASE_URl}/api/registerDriver/identification`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  
      if (res.status === 200 && res.data.code === 200) {
        return res.data.data;
      } else {
        // Kiểm tra nếu lỗi là 400 với thông báo "Driver Identification not found"
        if (res.data.code === 400 && res.data.message === "Driver Identification not found") {
          return null; // Không hiển thị thông báo lỗi, chỉ trả về null
        } else {
          // Nếu không phải lỗi 400 trên, không hiển thị thông báo lỗi
          return null;
        }
      }
    } catch (error) {
      // Xử lý lỗi nếu có
      if (error.response) {
        // Nếu có lỗi từ response, không hiển thị thông báo lỗi
        return null;
      } else {
        // Nếu có lỗi không phải từ response (chẳng hạn như lỗi mạng)
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleProvinceChange = async (value, addressType) => {
    if (!value) return;
  
    try {
      const districtsData = await getDistricts(value);
  
      if (addressType === "permanent") {
        // Update state in a single batch
        setFormData(prev => ({
          ...prev,
          permanentAddressProvince: value,
          permanentAddressDistrict: "",
          permanentAddressWard: "",
        }));
        setPermanentDistricts(districtsData);
        setPermanentWards([]);
      } else {
        // Update state in a single batch
        setFormData(prev => ({
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
        // Update state in a single batch
        setFormData(prev => ({
          ...prev,
          permanentAddressDistrict: value,
          permanentAddressWard: "",
        }));
        setPermanentWards(wardsData);
      } else {
        // Update state in a single batch
        setFormData(prev => ({
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
  

  const handleGenderChange = (value) => {
    setFormData({ ...formData, gender: value });
    // Optional: Clear error if user selects a value
    if (value) {
      setErrors({ ...errors, gender: "" });
    }
  };


  const validateForm = () => {
    const newErrors = {};
    Object.entries(formData).forEach(([field, value]) => {
      if (!value || (typeof value === "string" && !value.trim())) {
        newErrors[field] = `${field} is required.`;
      }
    });

    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
        newErrors.expiryDate = "Expiry date must be after issue date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isLoading) return;
   if (!validateForm()) return;
  
    setIsLoading(true);
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "No user information found. Please login again.");
        setIsLoading(false);
        return;
      }
  
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;
  
      if (!accessToken) {
        Alert.alert("Error", "Missing access token. Please login again.");
        setIsLoading(false);
        return;
      }
  
    //  const data = await getDriverIdentificationById();
       // Check if we're in edit mode instead of checking data existence
       if (isEditMode) {
        // Update existing record
        await updateDriverIdentification(formData);
        Alert.alert("Success", "Driver identification updated successfully.");
      } else {
        // Create new record
        await createDriverIdentification(formData, navigation);
        Alert.alert("Success", "Driver identification created successfully.");
      }
  } catch (error) {
    console.error("Error during form submission:", error);
    const errorMessage = error.response?.data?.message || "An error occurred during submission.";
    Alert.alert("Error", errorMessage);
  } finally {
    setIsLoading(false);
  }
};
  
  
  
 const updateDriverIdentification = async (updatedData) => {
  try {
    setIsLoading(true);
    const userInfo = await AsyncStorage.getItem("userInfo");
    if (!userInfo) {
      Alert.alert("Error", "No user information found. Please login again.");
      setIsLoading(false);
      return null;
    }

    const { access_token } = JSON.parse(userInfo)?.data;
    if (!access_token) {
      Alert.alert("Error", "Missing access token. Please login again.");
      setIsLoading(false);
      return null;
    }

    // if (!updatedData.idNumber) {
    //   Alert.alert("Error", "ID Number is missing. Cannot update.");
    //   setIsLoading(false);
    //   return null;
    // }


    const requestDTO = {
      idNumber: updatedData.idNumber,
      fullName: updatedData.fullName,
      gender: updatedData.gender,
      birthday: updatedData.birthday,
      country: updatedData.country,
      permanentAddressWard: updatedData.permanentAddressWard,
      permanentAddressDistrict: updatedData.permanentAddressDistrict,
      permanentAddressProvince: updatedData.permanentAddressProvince,
      permanentStreetAddress: updatedData.permanentStreetAddress,
      temporaryAddressWard: updatedData.temporaryAddressWard,
      temporaryAddressDistrict: updatedData.temporaryAddressDistrict,
      temporaryAddressProvince: updatedData.temporaryAddressProvince,
      temporaryStreetAddress: updatedData.temporaryStreetAddress,
      issueDate: updatedData.issueDate,
      expiryDate: updatedData.expiryDate,
      issuedBy: updatedData.issuedBy,
    };

    const formData = new FormData();
    formData.append("requestDTO", JSON.stringify(requestDTO));

    if (updatedData.frontFile?.uri) {
      // Only append to FormData if it's a new image (not a URL)
      if (!updatedData.frontFile.uri.startsWith('http')) {
        formData.append('frontFile', updatedData.frontFile);
      }
    }
    
    if (updatedData.backFile?.uri) {
      // Only append to FormData if it's a new image (not a URL)
      if (!updatedData.backFile.uri.startsWith('http')) {
        formData.append('backFile', updatedData.backFile);
      }
    }

    const response = await axios.put(
      `${BASE_URl}/api/registerDriver/identification`,
      formData,
      { headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'multipart/form-data' }}
    );

    setIsLoading(false);
    if (response.status === 200) {
      Alert.alert("Success", "Driver identification updated successfully.");
    } else {
      Alert.alert("Error", response.data.message || "Failed to update identification.");
    }
  } catch (error) {
    console.error("Error updating driver identification:", error);
    setIsLoading(false);
    Alert.alert("Error", error.response?.data.message || "An unknown error occurred.");
  }
};
  
  
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
                <View style={styles.header}>
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color="#000"
                    
                    style={styles.backIcon}
                  />
                  <Text style={styles.title}>Căn Cước Công Dân</Text>
                </View>
              </TouchableOpacity>

      <InputField
        label="Số CCCD"
        value={formData.idNumber}
        onChangeText={(value) => handleInputChange("idNumber", value)}
        placeholder="Nhập số cccd của bạn"
        keyboardType="numeric"
      />
      {errors.idNumber && <Text style={styles.errorText}>{errors.idNumber}</Text>}

   <InputField
        label="Họ và Tên"
        value={formData.fullName}
        onChangeText={(value) => handleInputChange("fullName", value)}
        placeholder="Nhập tên của bạn"
      />
      {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

      <View>
      <View style={styles.inputContainer}>
  <Text style={styles.label}>Giới Tính <Text style={styles.required}>*</Text></Text>
  <View style={styles.genderGroup}>
    <TouchableOpacity 
      style={[
        styles.genderOption, 
        formData.gender === 'Nam' && styles.genderOptionSelected
      ]} 
      onPress={() => handleGenderChange('Nam')}
    >
      <Text style={[
        styles.genderText,
        formData.gender === 'Nam' && styles.genderTextSelected
      ]}>Nam</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[
        styles.genderOption, 
        formData.gender === 'Nữ' && styles.genderOptionSelected
      ]} 
      onPress={() => handleGenderChange('Nữ')}
    >
      <Text style={[
        styles.genderText,
        formData.gender === 'Nữ' && styles.genderTextSelected
      ]}>Nữ</Text>
    </TouchableOpacity>
  </View>
  {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
</View>
      {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
    </View>


      <DatePickerField
        label="Ngày Sinh"
        value={formData.birthday}
        onChange={(value) => handleInputChange("birthday", value)}
      />
      {errors.birthday && <Text style={styles.errorText}>{errors.birthday}</Text>}

      <InputField
        label="Quốc Tịch"
        value={formData.country}
        onChangeText={(value) => handleInputChange("country", value)}
        placeholder="Nhập quốc tịch của bạn"
      />
      {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}

      <PickerField
        label="Địa chỉ thường trú Tỉnh/Thành PHố"
        items={provinces}
        selectedValue={formData.permanentAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "permanent")}
      />
      {errors.permanentAddressProvince && (
        <Text style={styles.errorText}>{errors.permanentAddressProvince}</Text>
      )}

      <PickerField
        label="Địa chỉ thường trú Quận/Huyện"
        items={permanentDistricts}
        selectedValue={formData.permanentAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "permanent")}
        enabled={!!formData.permanentAddressProvince}
      />
      {errors.permanentAddressDistrict && (
        <Text style={styles.errorText}>{errors.permanentAddressDistrict}</Text>
      )}

      <PickerField
        label="Địa chỉ thường trú Phường/Xã"
        items={permanentWards}
        selectedValue={formData.permanentAddressWard}
        onValueChange={(value) => handleInputChange("permanentAddressWard", value)}
        enabled={!!formData.permanentAddressDistrict}
      />
      {errors.permanentAddressWard && (
        <Text style={styles.errorText}>{errors.permanentAddressWard}</Text>
      )}

      <InputField
        label="Địa chỉ Đường thường trú "
        value={formData.permanentStreetAddress}
        onChangeText={(value) => handleInputChange("permanentStreetAddress", value)}
        placeholder="Nhập tên đường của bạn, số nhà....."
      />
      {errors.permanentStreetAddress && (
        <Text style={styles.errorText}>{errors.permanentStreetAddress}</Text>
      )}

      <PickerField
        label="Địa chỉ tạm trú Tỉnh/Thành PHố"
        items={provinces}
        selectedValue={formData.temporaryAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "temporary")}
      />
      {errors.temporaryAddressProvince && (
        <Text style={styles.errorText}>{errors.temporaryAddressProvince}</Text>
      )}

      <PickerField
        label="Địa chỉ tạm trú Quận/Huyện"
        items={temporaryDistricts}
        selectedValue={formData.temporaryAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "temporary")}
        enabled={!!formData.temporaryAddressProvince}
      />
      {errors.temporaryAddressDistrict && (
        <Text style={styles.errorText}>{errors.temporaryAddressDistrict}</Text>
      )}

      <PickerField
        label="Địa chỉ tạm trú Phường/Xã"
        items={temporaryWards}
        selectedValue={formData.temporaryAddressWard}
        onValueChange={(value) => handleInputChange("temporaryAddressWard", value)}
        enabled={!!formData.temporaryAddressDistrict}
      />
      {errors.temporaryAddressWard && (
        <Text style={styles.errorText}>{errors.temporaryAddressWard}</Text>
      )}

      <InputField
        label="Địa chỉ Đường tạm trú"
        value={formData.temporaryStreetAddress}
        onChangeText={(value) => handleInputChange("temporaryStreetAddress", value)}
        placeholder="Nhập tên đường của bạn, số nhà....."
      />
      {errors.temporaryStreetAddress && (
        <Text style={styles.errorText}>{errors.temporaryStreetAddress}</Text>
      )}

      <DatePickerField
        label="Ngày cấp"
        value={formData.issueDate}
        onChange={(value) => handleInputChange("issueDate", value)}
      />
      {errors.issueDate && <Text style={styles.errorText}>{errors.issueDate}</Text>}

      <DatePickerField
        label="Ngày hết hạn"
        value={formData.expiryDate}
        onChange={(value) => handleInputChange("expiryDate", value)}
      />
      {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}

      <InputField
        label="Được cấp bởi"
        value={formData.issuedBy}
        onChangeText={(value) => handleInputChange("issuedBy", value)}
        placeholder="Nhập nơi cấp cccd của bạn"
      />
      {errors.issuedBy && <Text style={styles.errorText}>{errors.issuedBy}</Text>}

     
      <ImageCameraField
  label="Ảnh mặt trước CCCD"
  image={formData.frontFile}
  onImageSelect={(file) => handleInputChange('frontFile', file)}
  error={errors.frontFile}
/>

<ImageCameraField
  label="Ảnh mặt sau CCCD"
  image={formData.backFile}
  onImageSelect={(file) => handleInputChange('backFile', file)}
  error={errors.backFile}
/>


<TouchableOpacity 
  style={[
    styles.submitButton,
    isLoading && styles.disabledButton
  ]} 
  onPress={handleSubmit}
  disabled={isLoading}
>
  <Text style={styles.submitButtonText}>
    {isLoading ? 'Processing...' : isEditMode ? 'Lưu' : 'Xong'}
  </Text>
</TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({

  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
    fontWeight: '500',
  },
  required: {
    color: "red",
  },
  guideContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  guideText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  guideItem: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
    lineHeight: 18,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
  },
  idImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 10,
  },
  retakeButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
   color: "red",
   fontSize: 12,
   marginTop: 10,
 },
 container: {
   padding: 20,
   backgroundColor: "#f9f9f9",
   flexGrow: 1,
 },
 title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
 },

 header: {
  marginTop: Platform.OS === "ios" ? 20 : 10,
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 20,
  
},
 inputContainer: {
   marginBottom: 15,
 },
 label: {
   fontSize: 16,
   marginBottom: 5,
   color: "#333",
 },
 required: {
   color: "red",
 },
 input: {
   borderWidth: 1,
   borderColor: "#ddd",
   borderRadius: 8,
   padding: 10,
   backgroundColor: "#fff",
   fontSize: 14,
 },
 picker: {
   borderWidth: 1,
   borderColor: "#ddd",
   borderRadius: 8,
   backgroundColor: "#fff",
 },
 submitButton: {
  backgroundColor: "#00b5ec",
  padding: 15,
  borderRadius: 8,
  alignItems: "center",
  marginTop: 20,
  marginBottom: 30,
},
disabledButton: {
  backgroundColor: "#cccccc",
  opacity: 0.7,
},
submitButtonText: {
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
},

 //-------------date---------
   dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    color: '#333',
    fontSize: 14,
  },
  iosDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  iosDatePicker: {
    height: 200,
  },
  iosDatePickerCancel: {
    color: '#007AFF',
    fontSize: 16,
  },
  iosDatePickerDone: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },

  //-----gender
  genderGroup: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderOptionSelected: {
    backgroundColor: '#00b5ec',
    borderColor: '#00b5ec',
  },
  genderText: {
    fontSize: 14,
    color: '#333',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  //-------------address
 pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 45,
  },
  pickerButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  pickerButtonTextDisabled: {
    color: '#999',
  },
  placeholderText: {
    color: '#999',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  androidPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  // picker: {
  //   height: 45,
  //   backgroundColor: '#fff',
  // },
  // pickerDisabled: {
  //   backgroundColor: '#f5f5f5',
  //   color: '#999',
  // }

  pickerWrapper: {
    backgroundColor: '#fff',
    width: '100%',
    height: 200, // Ensure enough height for the picker
  },
  pickerItem: {
    fontSize: 16,
    height: 180, // Adjust the height of items
    color: '#000', // Ensure text is visible
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20, // Add padding to avoid safe area issues
  },
 
});

export default DriverIdentificationScreen;