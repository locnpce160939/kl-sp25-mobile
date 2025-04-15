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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
//import { launchCamera } from 'react-native-image-picker';
import { useAlert } from "../../components/CustomAlert"; // Import hook useAlert

import Ionicons from "react-native-vector-icons/Ionicons";

import * as ImagePicker from "expo-image-picker";
import CreateDriverIdentificationScreen from "./CreateDriverIdentificationScreen";
import UpdateDriverIdentificationScreen from "./UpdateDriverIdentificationScreen";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const ImageCameraField = ({
  label,
  image,
  onImageSelect,
  error,
  onScanComplete,
  scanEnabled = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Kiểm tra và yêu cầu quyền camera
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

      // Nếu không bật scan, chỉ chọn ảnh
      if (!scanEnabled) {
        const imageData = {
          uri,
          type: "image/jpeg",
          name: `photo_${Date.now()}.jpg`,
        };
        onImageSelect(imageData);
        return;
      }

      // Chuẩn bị FormData cho OCR
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      });

      console.log(`[${label}] Bắt đầu gửi request OCR...`, {
        uri,
        endpoint:
          "https://scan-id.ftcs.online/uploader",
      });

      // Gọi API OCR
      const response = await fetch(
        "https://scan-id.ftcs.online/uploader",
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          timeout: 30000, // Thêm timeout 30 giây
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(`[${label}] Nhận dữ liệu OCR:`, responseData);

      // Định dạng dữ liệu nhận được
      const scannedData = {
        idNumber: responseData.id_number?.trim() || "",
        fullName: responseData.full_name?.trim() || "",
        birthday: responseData.dob ? formatDateForInput(responseData.dob) : "",
        gender: responseData.gender?.trim() || "",
        country: responseData.nationality?.trim() || "",
        permanentStreetAddress: responseData.residence?.trim() || "",
        expiryDate: responseData.expiry_date
          ? formatDateForInput(responseData.expiry_date)
          : "",
      };

      // Gọi callback với dữ liệu quét được
      if (onScanComplete) {
        console.log(`[${label}] Gọi onScanComplete với dữ liệu:`, scannedData);
        onScanComplete(scannedData);
      }

      // Chọn ảnh sau khi scan thành công
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
      });

      let errorMessage = "Không thể quét thông tin từ ảnh. Vui lòng thử lại.";
      if (error.message.includes("timeout")) {
        errorMessage = "Kết nối quá thời gian. Vui lòng kiểm tra mạng.";
      } else if (error.message.includes("Network")) {
        errorMessage = "Lỗi kết nối mạng. Vui lòng thử lại.";
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

  // Hàm định dạng ngày
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      // Xử lý các định dạng ngày khác nhau
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0"
        )}T00:00:00`;
      }
      // Nếu đã ở định dạng ISO
      return new Date(dateString).toISOString().split(".")[0];
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

const PickerField = ({
  label,
  items,
  selectedValue,
  onValueChange,
  enabled = true,
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

  // Improved display text function with better null checks
  const getDisplayText = useCallback(() => {
    if (!items || !Array.isArray(items) || items.length === 0)
      return "Chọn địa chỉ của bạn";

    // Ensure both values are strings for comparison
    const selectedItem = items.find(
      (item) => String(item.id) === String(selectedValue)
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
                    itemStyle={styles.pickerItem} // Add specific styles for iOS picker items
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
    </View>
  );
};

const DatePickerField = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
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
      <TouchableOpacity style={styles.dateButton} onPress={() => setShow(true)}>
        <Text style={styles.dateButtonText}>
          {value ? value.split("T")[0] : "Vui lòng chọn ngày"}
        </Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && show && (
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

const DriverIdentificationScreen = ({ navigation }) => {
  const { createDriverIdentification, getProvinces, getDistricts, getWards } =
    useContext(AuthContext);
  const { showAlert } = useAlert();

  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [driverData, setDriverData] = useState(null);

  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (!userInfoString) {
          setHasData(false);
          setDriverData(null);
          setIsLoading(false);
          return;
        }

        const parsedUserInfo = JSON.parse(userInfoString);
        const accessToken = parsedUserInfo?.data?.access_token;

        if (!accessToken) {
          setHasData(false);
          setDriverData(null);
          setIsLoading(false);
          return;
        }

        try {
          const res = await axios.get(
            `${BASE_URL}/api/registerDriver/identification`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          // Kiểm tra response code và dữ liệu
          if (
            res.status === 200 && 
            res.data && 
            res.data.code === 200 && 
            res.data.data && 
            Object.keys(res.data.data).length > 0 &&
            res.data.data.idNumber // Kiểm tra có thông tin CCCD
          ) {
            setHasData(true);
            setDriverData(res.data.data);
          } else {
            setHasData(false);
            setDriverData(null);
          }
        } catch (error) {
          // Nếu là lỗi 404 hoặc bất kỳ lỗi nào -> chuyển sang form tạo mới
          console.log("Error fetching driver data:", error?.response?.status);
          setHasData(false);
          setDriverData(null);
        }
      } catch (error) {
        console.error("Error checking existing data:", error);
        setHasData(false);
        setDriverData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b5ec" />
      </View>
    );
  }

  // Nếu không có data hoặc có lỗi -> hiển thị form tạo mới
  // Chỉ hiển thị form cập nhật khi chắc chắn có data hợp lệ
  return hasData && driverData ? (
    <UpdateDriverIdentificationScreen navigation={navigation} initialData={driverData} />
  ) : (
    <CreateDriverIdentificationScreen navigation={navigation} />
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
    fontWeight: "500",
  },
  required: {
    color: "red",
  },
  guideContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  guideText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  guideItem: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 4,
    lineHeight: 18,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: "relative",
  },
  idImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
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
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 10,
  },
  retakeButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
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

  //-----gender
  genderGroup: {
    flexDirection: "row",
    gap: 15,
    marginTop: 5,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  genderOptionSelected: {
    backgroundColor: "#00b5ec",
    borderColor: "#00b5ec",
  },
  genderText: {
    fontSize: 14,
    color: "#333",
  },
  genderTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  //-------------address
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    minHeight: 45,
  },
  pickerButtonDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  pickerButtonTextDisabled: {
    color: "#999",
  },
  placeholderText: {
    color: "#999",
  },
  pickerArrow: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalCancel: {
    fontSize: 16,
    color: "#007AFF",
  },
  modalDone: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  androidPickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
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
    backgroundColor: "#fff",
    width: "100%",
    height: 200, // Ensure enough height for the picker
  },
  pickerItem: {
    fontSize: 16,
    height: 180, // Adjust the height of items
    color: "#000", // Ensure text is visible
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20, // Add padding to avoid safe area issues
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
});

export default DriverIdentificationScreen;
