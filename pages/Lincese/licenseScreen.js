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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";

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
  const [licenseId, setLicenseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [errors, setErrors] = useState({});
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Lỗi",
          "Cần cấp quyền truy cập camera để sử dụng tính năng này!"
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
      } = await axios.get(`${BASE_URl}/api/registerDriver/license`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (licenseData) {
        setLicenseId(licenseData.licenseId);
        setLicenseDetails({
          ...licenseData,
          issuedDate: licenseData.issuedDate ? new Date(licenseData.issuedDate).toISOString() : "",
          expiryDate: licenseData.expiryDate ? new Date(licenseData.expiryDate).toISOString() : "",
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
        "Phiên đăng nhập hết hạn",
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
      console.log("Không tìm thấy giấy phép.");
    } else if (error.response?.status === 400) {
      Alert.alert(error.response?.data?.message);
      console.log("Error fetching License details!", error);
    } else {
      Alert.alert(error.response?.data?.message);
      console.log("Error fetching License details:", error);
    }
  };

  const validateInputs = () => {
    const newErrors = {};

    if (!licenseDetails.licenseNumber.trim()) {
      newErrors.licenseNumber = "Số giấy phép là bắt buộc.";
    }
    if (!licenseDetails.licenseType.trim()) {
      newErrors.licenseType = "Loại giấy phép là bắt buộc.";
    }
    if (!licenseDetails.issuingAuthority.trim()) {
      newErrors.issuingAuthority = "Cơ quan cấp là bắt buộc.";
    }
    if (!licenseDetails.issuedDate) {
      newErrors.issuedDate = "Ngày cấp là bắt buộc.";
    }
    if (!licenseDetails.expiryDate) {
      newErrors.expiryDate = "Ngày hết hạn là bắt buộc.";
    }
    if (!licenseDetails.frontView) {
      newErrors.frontView = "Ảnh mặt trước giấy phép là bắt buộc.";
    }
    if (!licenseDetails.backView) {
      newErrors.backView = "Ảnh mặt sau giấy phép là bắt buộc.";
    }
    if (
      licenseDetails.issuedDate &&
      licenseDetails.expiryDate &&
      new Date(licenseDetails.expiryDate) <= new Date(licenseDetails.issuedDate)
    ) {
      newErrors.expiryDate = "Ngày hết hạn phải sau ngày cấp.";
    }

    console.log("Validation Errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectImage = async (view) => {
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
              setLicenseDetails((prev) => ({
                ...prev,
                [view]: result.assets[0].uri,
              }));
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
              setLicenseDetails((prev) => ({
                ...prev,
                [view]: result.assets[0].uri,
              }));
              setErrors((prev) => ({ ...prev, [view]: null }));
            }
          },
        },
        { text: "Hủy", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const updateLicenseDetails = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      // Tạo đối tượng requestDTO
      const requestDTO = {
        licenseNumber: licenseDetails.licenseNumber,
        licenseType: licenseDetails.licenseType,
        issuedDate: new Date(licenseDetails.issuedDate).toISOString(),
        expiryDate: new Date(licenseDetails.expiryDate).toISOString(),
        issuingAuthority: licenseDetails.issuingAuthority,
      };

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
      }

      if (licenseDetails.backView) {
        const backFile = {
          uri: licenseDetails.backView,
          type: "image/jpeg",
          name: "back.jpg",
        };
        formData.append("backFile", backFile);
      }

      console.log("FormData:", formData);
      console.log("RequestDTO:", requestDTO);
      console.log("Token:", token);

      const { data, status } = await axios.put(
        `${BASE_URl}/api/registerDriver/license`,
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
        Alert.alert("Thành công", "Cập nhật giấy phép thành công.");
        setLicenseId(data.data.licenseId);
      } else {
        Alert.alert(
          "Lỗi",
          `Không thể cập nhật giấy phép. Mã lỗi: ${response.status}`
        );
      }
    } catch (error) {
      handleLicenseError(error);
      console.error("Error fetching License details:", error);
      if (error.response) {
        console.log("API Error:", error.response.data);
      } else if (error.request) {
        console.log("Request Error:", error.request);
      } else {
        console.log("General Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewLicense = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      // Tạo đối tượng requestDTO
      const requestDTO = {
        licenseNumber: licenseDetails.licenseNumber,
        licenseType: licenseDetails.licenseType,
        issuedDate: new Date(licenseDetails.issuedDate).toISOString(),
        expiryDate: new Date(licenseDetails.expiryDate).toISOString(),
        issuingAuthority: licenseDetails.issuingAuthority,
      };

      const formData = new FormData();
      formData.append("requestDTO", JSON.stringify(requestDTO));

      if (licenseDetails.frontView) {
        const frontFile = {
          uri: licenseDetails.frontView,
          type: "image/jpeg",
          name: "front.jpg",
        };
        formData.append("frontFile", frontFile);
      }

      if (licenseDetails.backView) {
        const backFile = {
          uri: licenseDetails.backView,
          type: "image/jpeg",
          name: "back.jpg",
        };
        formData.append("backFile", backFile);
      }

      // Gửi request
      const { data, status } = await axios.post(
        `${BASE_URl}/api/registerDriver/license`,
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
        // Xử lý thành công nếu status = 200
        alert("License registered successfully!");
      } else {
        throw new Error("Đăng ký giấy phép thất bại");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Đã có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setLicenseDetails((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "set") {
      const currentDate = selectedDate || new Date();
      if (
        currentField === "expiryDate" &&
        licenseDetails.issuedDate &&
        currentDate < new Date(licenseDetails.issuedDate)
      ) {
        Alert.alert("Lỗi", "Ngày hết hạn phải sau ngày cấp.");
        setShowDatePicker(false);
        return;
      }

      setLicenseDetails((prev) => ({
        ...prev,
        [currentField]: currentDate.toISOString(),
      }));
    }
    setShowDatePicker(false);
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
          <Ionicons name="camera" size={24} color="#007AFF" />
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

  const renderDateField = (label, field) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => {
          setCurrentField(field);
          setShowDatePicker(true);
        }}
      >
        <TextInput
          style={[styles.input, errors[field] && styles.inputError]}
          value={
            licenseDetails[field]
              ? new Date(licenseDetails[field]).toLocaleDateString("vi-VN")
              : ""
          }
          editable={false}
          placeholder={"Chọn ngày"}
          placeholderTextColor={"#999"}
          pointerEvents="none"
        />
      </TouchableOpacity>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    if (Platform.OS === 'ios') {
      return (
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerWrapper}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  handleDateChange({ type: 'set' }, new Date(licenseDetails[currentField] || Date.now()));
                }}
              >
                <Text style={styles.datePickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={new Date(licenseDetails[currentField] || Date.now())}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setLicenseDetails(prev => ({
                    ...prev,
                    [currentField]: selectedDate.toISOString()
                  }));
                }
              }}
              style={styles.datePickerIOS}
            />
          </View>
        </View>
      );
    }

    return (
      <DateTimePicker
        value={new Date(licenseDetails[currentField] || Date.now())}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    );
  };

  const DatePickerField = ({ label, value, onChange, field }) => {
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
        <TouchableOpacity onPress={() => setShow(true)}>
          <TextInput
            style={[styles.input, errors[field] && styles.inputError]}
            value={value ? new Date(value).toLocaleDateString("vi-VN") : ""}
            editable={false}
            placeholder={"Chọn ngày"}
            placeholderTextColor={"#999"}
            pointerEvents="none"
          />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={new Date(value || Date.now())}
            mode="date"
            display={Platform.OS === 'ios' ? "spinner" : "default"}
            onChange={handleDateChange}
            style={Platform.OS === 'ios' && styles.datePickerIOS}
          />
        )}
        {Platform.OS === 'ios' && show && (
          <View style={styles.datePickerHeader}>
            <TouchableOpacity onPress={() => setShow(false)}>
              <Text style={styles.datePickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={styles.datePickerButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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
            <Text style={styles.headerTitle}>License</Text>
          </View>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loader}
          />
        ) : (
          <>
            {renderInputField(
              "Số giấy phép",
              "licenseNumber",
              "Nhập số giấy phép"
            )}
            {renderInputField(
              "Loại giấy phép",
              "licenseType",
              "Nhập loại giấy phép"
            )}
            <DatePickerField
              label="Ngày cấp"
              value={licenseDetails.issuedDate}
              onChange={(value) => handleInputChange("issuedDate", value)}
              field="issuedDate"
            />
            <DatePickerField
              label="Ngày hết hạn"
              value={licenseDetails.expiryDate}
              onChange={(value) => handleInputChange("expiryDate", value)}
              field="expiryDate"
            />
            {renderInputField(
              "Cơ quan cấp",
              "issuingAuthority",
              "Nhập cơ quan cấp"
            )}
            {renderImageSection("frontView", "Mặt trước giấy phép")}
            {renderImageSection("backView", "Mặt sau giấy phép")}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={licenseId ? updateLicenseDetails : createNewLicense}
            >
              <Text style={styles.saveButtonText}>
                {licenseId ? "Cập nhật" : "Tạo mới giấy phép"}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {renderDatePicker()}
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
    marginBottom: 20,
  },
  backIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
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
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loader: {
    marginTop: 20,
  },
  imageContainer: {
    marginBottom: 20,
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
    backgroundColor: "#007AFF",
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    height: '100%',
    justifyContent: 'flex-end',
  },
  datePickerWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  datePickerIOS: {
    height: 200,
    width: '100%',
  },
});

export default LicenseScreen;
