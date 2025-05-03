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
  isFront = true,
  setFormData,
  getDistricts,
  getWards,
  setPermanentDistricts,
  setPermanentWards,
  setTemporaryDistricts,
  setTemporaryWards,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scanningText, setScanningText] = useState("");

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
      setScanningText("Đang quét thông tin...");
      console.log(`[${label}] Bắt đầu xử lý ảnh:`, uri);

      if (!scanEnabled) {
        console.log(`[${label}] Scan bị tắt, chỉ chọn ảnh`);
        const imageData = {
          uri,
          type: "image/jpeg",
          name: isFront ? "front.jpg" : "back.jpg",
        };
        onImageSelect(imageData);
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: `scan_${Date.now()}.jpg`,
      });

      console.log('Gửi request đến API OCR');
      const response = await fetch("http://192.168.2.103:5001/id_card", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Dữ liệu OCR nhận được:', JSON.stringify(data, null, 2));

      if (!data || !data.text_results) {
        throw new Error("Không thể đọc thông tin từ ảnh");
      }

      setScanningText("Đang điền thông tin...");
      let scannedData = {};
      
      if (isFront) {
        // Handle permanent address from address_info
        if (data.address_info) {
          try {
            // Fetch districts for permanent address
            const permanentDistricts = await getDistricts(data.address_info.province_id);
            setPermanentDistricts(permanentDistricts);

            // Fetch wards for permanent address
            const permanentWards = await getWards(data.address_info.district_id);
            setPermanentWards(permanentWards);

            // Handle temporary address from address_info_origin
            if (data.address_info_origin) {
              // Fetch districts for temporary address
              const temporaryDistricts = await getDistricts(data.address_info_origin.province_id);
              setTemporaryDistricts(temporaryDistricts);

              // Fetch wards for temporary address
              const temporaryWards = await getWards(data.address_info_origin.district_id);
              setTemporaryWards(temporaryWards);
            }

            // Create scannedData after fetching all address data
            scannedData = {
              idNumber: data.text_results.id || "",
              fullName: data.text_results.name || "",
              birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
              gender: data.text_results.gender || "",
              country: data.text_results.nationality || "",
              permanentStreetAddress: data.text_results.current_place || "",
              temporaryStreetAddress: data.text_results.origin_place || "",
              expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
              // Add address IDs from OCR results
              permanentAddressProvince: data.address_info.province_id.toString(),
              permanentAddressDistrict: data.address_info.district_id.toString(),
              permanentAddressWard: data.address_info.ward_id.toString(),
              temporaryAddressProvince: data.address_info_origin?.province_id?.toString() || "",
              temporaryAddressDistrict: data.address_info_origin?.district_id?.toString() || "",
              temporaryAddressWard: data.address_info_origin?.ward_id?.toString() || "",
            };

            // Update form data after all address data is fetched
            if (setFormData) {
              setFormData(prev => ({
                ...prev,
                ...scannedData
              }));
            }
          } catch (error) {
            console.error("Error fetching address data:", error);
            // Still update other fields even if address fetching fails
            scannedData = {
              idNumber: data.text_results.id || "",
              fullName: data.text_results.name || "",
              birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
              gender: data.text_results.gender || "",
              country: data.text_results.nationality || "",
              permanentStreetAddress: data.text_results.current_place || "",
              temporaryStreetAddress: data.text_results.origin_place || "",
              expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
            };
            if (setFormData) {
              setFormData(prev => ({
                ...prev,
                ...scannedData
              }));
            }
          }
        } else {
          // If no address info, just update basic fields
          scannedData = {
            idNumber: data.text_results.id || "",
            fullName: data.text_results.name || "",
            birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
            gender: data.text_results.gender || "",
            country: data.text_results.nationality || "",
            permanentStreetAddress: data.text_results.current_place || "",
            temporaryStreetAddress: data.text_results.origin_place || "",
            expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
          };
          if (setFormData) {
            setFormData(prev => ({
              ...prev,
              ...scannedData
            }));
          }
        }
      } else {
        scannedData = {
          issueDate: data.text_results.issue_date ? formatDateForInput(data.text_results.issue_date) : "",
          issuedBy: data.text_results.place_of_issue || "",
        };

        if (setFormData) {
          setFormData(prev => ({
            ...prev,
            ...scannedData
          }));
        }
      }

      if (onScanComplete) {
        onScanComplete(scannedData);
      }

      const imageData = {
        uri,
        type: "image/jpeg",
        name: isFront ? "front.jpg" : "back.jpg",
      };
      onImageSelect(imageData);
    } catch (error) {
      console.error(`[${label}] Lỗi khi quét ảnh:`, error);
      Alert.alert("Lỗi", "Không thể quét thông tin từ ảnh. Vui lòng thử lại.");

      // Vẫn cho phép chọn ảnh dù scan thất bại
      const imageData = {
        uri,
        type: "image/jpeg",
        name: isFront ? "front.jpg" : "back.jpg",
      };
      onImageSelect(imageData);
    } finally {
      setIsLoading(false);
      setScanningText("");
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
      console.warn("Error formatting date:", dateString);
      return "";
    }
  };

  const selectImage = async () => {
    // Show custom modal for image selection
    Alert.alert(
      "Quét CCCD",
      "Bạn có muốn quét CCCD để tự động điền thông tin?",
      Platform.OS === 'ios' 
        ? [
            {
              text: "Chụp ảnh",
              style: "default",
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
              text: "Chọn từ thư viện",
              style: "default",
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
            {
              text: "Hủy",
              style: "cancel",
            },
          ]
        : [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Chụp ảnh",
              style: "default",
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
              text: "Chọn từ thư viện",
              style: "default",
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
          ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00b5ec" />
          <Text style={styles.scanningText}>{scanningText}</Text>
        </View>
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

const CreateDriverIdentificationScreen = ({ navigation, initialData }) => {
  const { UpdateDriverIdentificationScreen, getProvinces, getDistricts, getWards } =
    useContext(AuthContext);
  const { showAlert } = useAlert();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showScanNotification, setShowScanNotification] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningText, setScanningText] = useState("");

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
      console.warn("Error formatting date:", dateString);
      return "";
    }
  };

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
    scanFile: null,
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
            scanFile: initialData.scanFile ? { uri: initialData.scanFile } : null,
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
        if (!formData.idNumber) {
          newErrors.idNumber = "Số CCCD không được bỏ trống";
        } else if (!/^\d{12}$/.test(formData.idNumber)) {
          newErrors.idNumber = "Số căn cước công dân phải là 12 số";
        }

        if (!formData.fullName) {
          newErrors.fullName = "Họ và tên không được bỏ trống";
        } else if (!/^[a-zA-Z\sÀ-ỹ]+$/.test(formData.fullName)) {
          newErrors.fullName = "Họ và tên phải là chữ";
        }

        if (!formData.gender) {
          newErrors.gender = "Giới tính không được bỏ trống";
        }

        if (!formData.birthday) {
          newErrors.birthday = "Ngày sinh không được bỏ trống";
        } else {
          const today = new Date();
          const birthDate = new Date(formData.birthday);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            newErrors.birthday = "Tài xế phải trên 18 tuổi";
          } else if (age > 60) {
            newErrors.birthday = "Tài xế không được quá 60 tuổi";
          }
        }

        if (!formData.country) {
          newErrors.country = "Quốc gia không được bỏ trống";
        } else if (!/^[a-zA-Z\sÀ-ỹ]+$/.test(formData.country)) {
          newErrors.country = "Quốc gia phải là chữ";
        }
        break;

      case 1: // Permanent address
        if (!formData.permanentAddressProvince) {
          newErrors.permanentAddressProvince = "Địa chỉ thường trú Tỉnh không được trống";
        }
        if (!formData.permanentAddressDistrict) {
          newErrors.permanentAddressDistrict = "Địa chỉ thường trú Quận không được bỏ trống";
        }
        if (!formData.permanentAddressWard) {
          newErrors.permanentAddressWard = "Địa chỉ thường trú Phường không được bỏ trống";
        }
        if (!formData.permanentStreetAddress) {
          newErrors.permanentStreetAddress = "Địa chỉ đường phố cố định không được bỏ trống";
        }
        break;

      case 2: // Temporary address
        if (!formData.temporaryAddressProvince) {
          newErrors.temporaryAddressProvince = "Địa chỉ tạm thời Tỉnh không được bỏ trống";
        }
        if (!formData.temporaryAddressDistrict) {
          newErrors.temporaryAddressDistrict = "Địa chỉ tạm thời Quận không được bỏ trống";
        }
        if (!formData.temporaryAddressWard) {
          newErrors.temporaryAddressWard = "Địa chỉ tạm thời Phường không được bỏ trống";
        }
        if (!formData.temporaryStreetAddress) {
          newErrors.temporaryStreetAddress = "Địa chỉ đường tạm thời không được bỏ trống";
        }
        break;

      case 3: // Card info
        if (!formData.issueDate) {
          newErrors.issueDate = "Ngày phát hành CCCD không được bỏ trống";
        }
        if (!formData.expiryDate) {
          newErrors.expiryDate = "Ngày hết hạn CCCD không được bỏ trống";
        } else if (formData.issueDate && new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
          newErrors.expiryDate = "Ngày hết hạn CCCD phải sau ngày phát hành CCCD";
        }
        if (!formData.issuedBy) {
          newErrors.issuedBy = "Nơi cấp CCCD không được bỏ trống";
        }
        if (!formData.frontFile) {
          newErrors.frontFile = "Vui lòng chụp ảnh mặt trước";
        }
        if (!formData.backFile) {
          newErrors.backFile = "Vui lòng chụp ảnh mặt sau";
        }
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
        gender: formData.gender === "Nam" ? "Nam" : "Nữ",
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
        issuedBy: formData.issuedBy?.trim() || "",
      };

      console.log('\n========== API REQUEST DATA ==========');
      console.log('API URL:', `${BASE_URL}/api/registerDriver/identification`);
      console.log('Method: POST');
      console.log('Content-Type: multipart/form-data');
      
      console.log('\n1. requestDTO:');
      console.log(JSON.stringify(requestDTO, null, 2));
      
      console.log('\n2. Headers:');
      console.log({
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'multipart/form-data'
      });

      const submitFormData = new FormData();
      submitFormData.append("requestDTO", JSON.stringify(requestDTO));

      // Add images
      if (formData.frontFile) {
        const frontFile = {
          uri: formData.frontFile.uri,
          type: "image/jpeg",
          name: "front.jpg"
        };
        submitFormData.append("frontFile", frontFile);
        console.log('Front image file:', frontFile);
      }

      if (formData.backFile) {
        const backFile = {
          uri: formData.backFile.uri,
          type: "image/jpeg",
          name: "back.jpg"
        };
        submitFormData.append("backFile", backFile);
        console.log('Back image file:', backFile);
      }

      console.log('FormData entries:');
      for (let [key, value] of submitFormData.entries()) {
        console.log(key, value);
      }

      // Call update API
      const response = await axios.post(
        `${BASE_URL}/api/registerDriver/identification`,
        submitFormData,
        {
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        showAlert({
          title: "Thành công",
          message: "Đăng kí CCCD thành công.",
          type: "success",
          autoClose: true,
        });
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      let errorMessage = "Có lỗi xảy ra khi xử lý yêu cầu";
      
      if (error.response?.status === 403) {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPress = () => {
    console.log('=== Bắt đầu quét CCCD ===');
    Alert.alert(
      "Quét CCCD",
      "Vui lòng chọn mặt CCCD cần quét",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Quét mặt trước",
          onPress: () => {
            console.log('Đã chọn quét mặt trước CCCD');
            Alert.alert(
              "Quét mặt trước CCCD",
              "Vui lòng chọn cách thức quét",
              [
                {
                  text: "Hủy",
                  style: "cancel"
                },
                {
                  text: "Chụp ảnh",
                  onPress: async () => {
                    console.log('Đã chọn chụp ảnh mặt trước');
                    const hasPermission = await requestPermissions();
                    if (!hasPermission) return;

                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.5,
                    });

                    if (!result.canceled && result.assets?.[0]?.uri) {
                      try {
                        setIsScanning(true);
                        setScanningText("Đang quét thông tin...");
                        
                        const imageData = {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: "front.jpg",
                        };
                        console.log('Dữ liệu ảnh:', imageData);
                        handleInputChange("frontFile", imageData);

                        const formData = new FormData();
                        formData.append("file", {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: `scan_${Date.now()}.jpg`,
                        });

                        console.log('Gửi request OCR...');
                        const response = await fetch("http://192.168.2.103:5001/id_card", {
                          method: "POST",
                          body: formData,
                          headers: {
                            "Content-Type": "multipart/form-data",
                            Accept: "application/json",
                          },
                        });

                        const data = await response.json();
                        console.log('=== Dữ liệu OCR nhận được ===');
                        console.log('Text results:', data.text_results);
                        console.log('Address info:', data.address_info);
                        console.log('Address info origin:', data.address_info_origin);

                        if (data && data.text_results) {
                          setScanningText("Đang điền thông tin...");

                          // Handle permanent address from address_info
                          if (data.address_info) {
                            try {
                              console.log('Đang lấy thông tin địa chỉ thường trú...');
                              // Fetch districts for permanent address
                              const permanentDistricts = await getDistricts(data.address_info.province_id);
                              console.log('Danh sách quận/huyện thường trú:', permanentDistricts);
                              setPermanentDistricts(permanentDistricts);

                              // Fetch wards for permanent address
                              const permanentWards = await getWards(data.address_info.district_id);
                              console.log('Danh sách phường/xã thường trú:', permanentWards);
                              setPermanentWards(permanentWards);

                              // Handle temporary address from address_info_origin
                              if (data.address_info_origin) {
                                console.log('Đang lấy thông tin địa chỉ tạm trú...');
                                // Fetch districts for temporary address
                                const temporaryDistricts = await getDistricts(data.address_info_origin.province_id);
                                console.log('Danh sách quận/huyện tạm trú:', temporaryDistricts);
                                setTemporaryDistricts(temporaryDistricts);

                                // Fetch wards for temporary address
                                const temporaryWards = await getWards(data.address_info_origin.district_id);
                                console.log('Danh sách phường/xã tạm trú:', temporaryWards);
                                setTemporaryWards(temporaryWards);
                              }

                              // Update form data with address information
                              const updatedFormData = {
                                idNumber: data.text_results.id || "",
                                fullName: data.text_results.name || "",
                                birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                                gender: data.text_results.gender || "",
                                country: data.text_results.nationality || "",
                                permanentStreetAddress: data.text_results.current_place || "",
                                temporaryStreetAddress: data.text_results.origin_place || "",
                                expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                                permanentAddressProvince: data.address_info.province_id.toString(),
                                permanentAddressDistrict: data.address_info.district_id.toString(),
                                permanentAddressWard: data.address_info.ward_id.toString(),
                                temporaryAddressProvince: data.address_info_origin?.province_id?.toString() || "",
                                temporaryAddressDistrict: data.address_info_origin?.district_id?.toString() || "",
                                temporaryAddressWard: data.address_info_origin?.ward_id?.toString() || "",
                              };
                              console.log('=== Dữ liệu form sau khi cập nhật ===');
                              console.log(updatedFormData);
                              setFormData(prev => ({
                                ...prev,
                                ...updatedFormData
                              }));
                            } catch (error) {
                              console.error("Lỗi khi lấy thông tin địa chỉ:", error);
                              // Still update other fields even if address fetching fails
                              const basicFormData = {
                                idNumber: data.text_results.id || "",
                                fullName: data.text_results.name || "",
                                birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                                gender: data.text_results.gender || "",
                                country: data.text_results.nationality || "",
                                permanentStreetAddress: data.text_results.current_place || "",
                                temporaryStreetAddress: data.text_results.origin_place || "",
                                expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                              };
                              console.log('=== Dữ liệu form cơ bản sau khi cập nhật ===');
                              console.log(basicFormData);
                              setFormData(prev => ({
                                ...prev,
                                ...basicFormData
                              }));
                            }
                          } else {
                            // If no address info, just update basic fields
                            const basicFormData = {
                              idNumber: data.text_results.id || "",
                              fullName: data.text_results.name || "",
                              birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                              gender: data.text_results.gender || "",
                              country: data.text_results.nationality || "",
                              permanentStreetAddress: data.text_results.current_place || "",
                              temporaryStreetAddress: data.text_results.origin_place || "",
                              expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                            };
                            console.log('=== Dữ liệu form cơ bản sau khi cập nhật (không có thông tin địa chỉ) ===');
                            console.log(basicFormData);
                            setFormData(prev => ({
                              ...prev,
                              ...basicFormData
                            }));
                          }
                        }
                      } catch (error) {
                        console.error("Lỗi khi quét mặt trước:", error);
                        Alert.alert("Lỗi", "Không thể quét thông tin từ ảnh. Vui lòng thử lại.");
                      } finally {
                        setIsScanning(false);
                        setScanningText("");
                      }
                    }
                  }
                },
                {
                  text: "Chọn từ thư viện",
                  onPress: async () => {
                    console.log('Đã chọn chọn ảnh từ thư viện mặt trước');
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.5,
                    });

                    if (!result.canceled && result.assets?.[0]?.uri) {
                      try {
                        setIsScanning(true);
                        setScanningText("Đang quét thông tin...");
                        
                        const imageData = {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: "front.jpg",
                        };
                        console.log('Dữ liệu ảnh:', imageData);
                        handleInputChange("frontFile", imageData);

                        const formData = new FormData();
                        formData.append("file", {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: `scan_${Date.now()}.jpg`,
                        });

                        console.log('Gửi request OCR...');
                        const response = await fetch("http://192.168.2.103:5001/id_card", {
                          method: "POST",
                          body: formData,
                          headers: {
                            "Content-Type": "multipart/form-data",
                            Accept: "application/json",
                          },
                        });

                        const data = await response.json();
                        console.log('=== Dữ liệu OCR nhận được ===');
                        console.log('Text results:', data.text_results);
                        console.log('Address info:', data.address_info);
                        console.log('Address info origin:', data.address_info_origin);

                        if (data && data.text_results) {
                          setScanningText("Đang điền thông tin...");

                          // Handle permanent address from address_info
                          if (data.address_info) {
                            try {
                              console.log('Đang lấy thông tin địa chỉ thường trú...');
                              // Fetch districts for permanent address
                              const permanentDistricts = await getDistricts(data.address_info.province_id);
                              console.log('Danh sách quận/huyện thường trú:', permanentDistricts);
                              setPermanentDistricts(permanentDistricts);

                              // Fetch wards for permanent address
                              const permanentWards = await getWards(data.address_info.district_id);
                              console.log('Danh sách phường/xã thường trú:', permanentWards);
                              setPermanentWards(permanentWards);

                              // Handle temporary address from address_info_origin
                              if (data.address_info_origin) {
                                console.log('Đang lấy thông tin địa chỉ tạm trú...');
                                // Fetch districts for temporary address
                                const temporaryDistricts = await getDistricts(data.address_info_origin.province_id);
                                console.log('Danh sách quận/huyện tạm trú:', temporaryDistricts);
                                setTemporaryDistricts(temporaryDistricts);

                                // Fetch wards for temporary address
                                const temporaryWards = await getWards(data.address_info_origin.district_id);
                                console.log('Danh sách phường/xã tạm trú:', temporaryWards);
                                setTemporaryWards(temporaryWards);
                              }

                              // Update form data with address information
                              const updatedFormData = {
                                idNumber: data.text_results.id || "",
                                fullName: data.text_results.name || "",
                                birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                                gender: data.text_results.gender || "",
                                country: data.text_results.nationality || "",
                                permanentStreetAddress: data.text_results.current_place || "",
                                temporaryStreetAddress: data.text_results.origin_place || "",
                                expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                                permanentAddressProvince: data.address_info.province_id.toString(),
                                permanentAddressDistrict: data.address_info.district_id.toString(),
                                permanentAddressWard: data.address_info.ward_id.toString(),
                                temporaryAddressProvince: data.address_info_origin?.province_id?.toString() || "",
                                temporaryAddressDistrict: data.address_info_origin?.district_id?.toString() || "",
                                temporaryAddressWard: data.address_info_origin?.ward_id?.toString() || "",
                              };
                              console.log('=== Dữ liệu form sau khi cập nhật ===');
                              console.log(updatedFormData);
                              setFormData(prev => ({
                                ...prev,
                                ...updatedFormData
                              }));
                            } catch (error) {
                              console.error("Lỗi khi lấy thông tin địa chỉ:", error);
                              // Still update other fields even if address fetching fails
                              const basicFormData = {
                                idNumber: data.text_results.id || "",
                                fullName: data.text_results.name || "",
                                birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                                gender: data.text_results.gender || "",
                                country: data.text_results.nationality || "",
                                permanentStreetAddress: data.text_results.current_place || "",
                                temporaryStreetAddress: data.text_results.origin_place || "",
                                expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                              };
                              console.log('=== Dữ liệu form cơ bản sau khi cập nhật ===');
                              console.log(basicFormData);
                              setFormData(prev => ({
                                ...prev,
                                ...basicFormData
                              }));
                            }
                          } else {
                            // If no address info, just update basic fields
                            const basicFormData = {
                              idNumber: data.text_results.id || "",
                              fullName: data.text_results.name || "",
                              birthday: data.text_results.dob ? formatDateForInput(data.text_results.dob) : "",
                              gender: data.text_results.gender || "",
                              country: data.text_results.nationality || "",
                              permanentStreetAddress: data.text_results.current_place || "",
                              temporaryStreetAddress: data.text_results.origin_place || "",
                              expiryDate: data.text_results.expire_date ? formatDateForInput(data.text_results.expire_date) : "",
                            };
                            console.log('=== Dữ liệu form cơ bản sau khi cập nhật (không có thông tin địa chỉ) ===');
                            console.log(basicFormData);
                            setFormData(prev => ({
                              ...prev,
                              ...basicFormData
                            }));
                          }
                        }
                      } catch (error) {
                        console.error("Lỗi khi quét mặt trước:", error);
                        Alert.alert("Lỗi", "Không thể quét thông tin từ ảnh. Vui lòng thử lại.");
                      } finally {
                        setIsScanning(false);
                        setScanningText("");
                      }
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: "Quét mặt sau",
          onPress: () => {
            console.log('Đã chọn quét mặt sau CCCD');
            Alert.alert(
              "Quét mặt sau CCCD",
              "Vui lòng chọn cách thức quét",
              [
                {
                  text: "Hủy",
                  style: "cancel"
                },
                {
                  text: "Chụp ảnh",
                  onPress: async () => {
                    console.log('Đã chọn chụp ảnh mặt sau');
                    const hasPermission = await requestPermissions();
                    if (!hasPermission) return;

                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.5,
                    });

                    if (!result.canceled && result.assets?.[0]?.uri) {
                      try {
                        setIsScanning(true);
                        setScanningText("Đang quét thông tin...");
                        
                        const imageData = {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: "back.jpg",
                        };
                        console.log('Dữ liệu ảnh:', imageData);
                        handleInputChange("backFile", imageData);

                        const formData = new FormData();
                        formData.append("file", {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: `scan_${Date.now()}.jpg`,
                        });

                        console.log('Gửi request OCR...');
                        const response = await fetch("http://192.168.2.103:5001/id_card", {
                          method: "POST",
                          body: formData,
                          headers: {
                            "Content-Type": "multipart/form-data",
                            Accept: "application/json",
                          },
                        });

                        const data = await response.json();
                        console.log('=== Dữ liệu OCR nhận được ===');
                        console.log('Text results:', data.text_results);

                        if (data && data.text_results) {
                          setScanningText("Đang điền thông tin...");
                          const updatedFormData = {
                            issueDate: data.text_results.issue_date ? formatDateForInput(data.text_results.issue_date) : "",
                            issuedBy: data.text_results.place_of_issue || "",
                          };
                          console.log('=== Dữ liệu form sau khi cập nhật ===');
                          console.log(updatedFormData);
                          setFormData(prev => ({
                            ...prev,
                            ...updatedFormData
                          }));
                        }
                      } catch (error) {
                        console.error("Lỗi khi quét mặt sau:", error);
                        Alert.alert("Lỗi", "Không thể quét thông tin từ ảnh. Vui lòng thử lại.");
                      } finally {
                        setIsScanning(false);
                        setScanningText("");
                      }
                    }
                  }
                },
                {
                  text: "Chọn từ thư viện",
                  onPress: async () => {
                    console.log('Đã chọn chọn ảnh từ thư viện mặt sau');
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.5,
                    });

                    if (!result.canceled && result.assets?.[0]?.uri) {
                      try {
                        setIsScanning(true);
                        setScanningText("Đang quét thông tin...");
                        
                        const imageData = {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: "back.jpg",
                        };
                        console.log('Dữ liệu ảnh:', imageData);
                        handleInputChange("backFile", imageData);

                        const formData = new FormData();
                        formData.append("file", {
                          uri: result.assets[0].uri,
                          type: "image/jpeg",
                          name: `scan_${Date.now()}.jpg`,
                        });

                        console.log('Gửi request OCR...');
                        const response = await fetch("http://192.168.2.103:5001/id_card", {
                          method: "POST",
                          body: formData,
                          headers: {
                            "Content-Type": "multipart/form-data",
                            Accept: "application/json",
                          },
                        });

                        const data = await response.json();
                        console.log('=== Dữ liệu OCR nhận được ===');
                        console.log('Text results:', data.text_results);

                        if (data && data.text_results) {
                          setScanningText("Đang điền thông tin...");
                          const updatedFormData = {
                            issueDate: data.text_results.issue_date ? formatDateForInput(data.text_results.issue_date) : "",
                            issuedBy: data.text_results.place_of_issue || "",
                          };
                          console.log('=== Dữ liệu form sau khi cập nhật ===');
                          console.log(updatedFormData);
                          setFormData(prev => ({
                            ...prev,
                            ...updatedFormData
                          }));
                        }
                      } catch (error) {
                        console.error("Lỗi khi quét mặt sau:", error);
                        Alert.alert("Lỗi", "Không thể quét thông tin từ ảnh. Vui lòng thử lại.");
                      } finally {
                        setIsScanning(false);
                        setScanningText("");
                      }
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

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

  const renderPersonalInfo = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
      
      {showScanNotification && (
        <View style={styles.scanNotification}>
          <Ionicons name="information-circle-outline" size={20} color="#00b5ec" />
          <Text style={styles.scanNotificationText}>
            Bạn có thể chụp ảnh CCCD để tự động điền thông tin
          </Text>
        </View>
      )}

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
            handleInputChange("temporaryStreetAddress", data.temporaryStreetAddress);
            handleInputChange("expiryDate", data.expiryDate);
          }
        }}
        error={errors.frontFile}
        isFront={true}
        setFormData={setFormData}
        getDistricts={getDistricts}
        getWards={getWards}
        setPermanentDistricts={setPermanentDistricts}
        setPermanentWards={setPermanentWards}
        setTemporaryDistricts={setTemporaryDistricts}
        setTemporaryWards={setTemporaryWards}
      />

      <ImageCameraField
        label="Ảnh mặt sau CCCD"
        image={formData.backFile}
        onImageSelect={(file) => handleInputChange("backFile", file)}
        onScanComplete={(data) => {
          if (data) {
            handleInputChange("issueDate", data.issueDate);
            handleInputChange("issuedBy", data.issuedBy);
          }
        }}
        error={errors.backFile}
        isFront={false}
        setFormData={setFormData}
        getDistricts={getDistricts}
        getWards={getWards}
        setPermanentDistricts={setPermanentDistricts}
        setPermanentWards={setPermanentWards}
        setTemporaryDistricts={setTemporaryDistricts}
        setTemporaryWards={setTemporaryWards}
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

  // Add useEffect to handle address selection when districts and wards are updated
  useEffect(() => {
    const handleAddressSelection = async () => {
      if (formData.permanentAddressProvince) {
        try {
          const districts = await getDistricts(formData.permanentAddressProvince);
          setPermanentDistricts(districts);

          if (formData.permanentAddressDistrict) {
            const wards = await getWards(formData.permanentAddressDistrict);
            setPermanentWards(wards);
          }
        } catch (error) {
          console.error("Error fetching permanent address data:", error);
        }
      }

      if (formData.temporaryAddressProvince) {
        try {
          const districts = await getDistricts(formData.temporaryAddressProvince);
          setTemporaryDistricts(districts);

          if (formData.temporaryAddressDistrict) {
            const wards = await getWards(formData.temporaryAddressDistrict);
            setTemporaryWards(wards);
          }
        } catch (error) {
          console.error("Error fetching temporary address data:", error);
        }
      }
    };

    handleAddressSelection();
  }, [formData.permanentAddressProvince, formData.permanentAddressDistrict, 
      formData.temporaryAddressProvince, formData.temporaryAddressDistrict]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#212529"
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.title}>
          {"Đăng kí thông tin CCCD"}
        </Text>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScanPress}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#00b5ec" />
          ) : (
            <Ionicons name="scan" size={24} color="#00b5ec" />
          )}
        </TouchableOpacity>
      </View>

      {isScanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningContent}>
            <ActivityIndicator size="large" color="#00b5ec" />
            <Text style={styles.scanningText}>{scanningText}</Text>
          </View>
        </View>
      )}

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
              {'Đăng ký'}
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
    justifyContent: 'space-between',
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
  scanButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  scanNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanNotificationText: {
    marginLeft: 8,
    color: '#00b5ec',
    fontSize: 14,
  },
  alertButton: {
    fontSize: 18,
    color: '#007AFF',
    textAlign: 'center',
    padding: 10,
  },
  alertButtonCancel: {
    color: '#FF3B30',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  loadingContainer: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scanningContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanningText: {
    marginTop: 12,
    color: '#00b5ec',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreateDriverIdentificationScreen;