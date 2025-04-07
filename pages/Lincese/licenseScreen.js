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
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import DatePickerField from "../../components/DatePickerField";

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
  const [errors, setErrors] = useState({});
  const { logout } = useContext(AuthContext);

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
        setLicenseDetails({
          ...licenseData,
          issuedDate: licenseData.issuedDate
            ? new Date(licenseData.issuedDate).toISOString().split("T")[0]
            : "",
          expiryDate: licenseData.expiryDate
            ? new Date(licenseData.expiryDate).toISOString().split("T")[0]
            : "",
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
      console.log("Không tìm thấy bằng lái.");
    } else if (error.response?.status === 400) {
      Alert.alert("Lỗi", "Lỗi khi lấy thông tin bằng lái!");
      console.log("Error fetching License details!", error);
    } else {
      Alert.alert("Lỗi", "Lỗi khi lấy thông tin bằng lái!");
      console.log("Error fetching License details:", error);
    }
  };

  const validateInputs = () => {
    const newErrors = {};

    if (!licenseDetails.licenseNumber.trim()) {
      newErrors.licenseNumber = "Số bằng lái là bắt buộc.";
    }
    if (!licenseDetails.licenseType.trim()) {
      newErrors.licenseType = "Loại bằng lái là bắt buộc.";
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
      newErrors.frontView = "Mặt trước bằng lái là bắt buộc.";
    }
    if (!licenseDetails.backView) {
      newErrors.backView = "Mặt sau bằng lái là bắt buộc.";
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
        { text: "Cancel", style: "cancel" },
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
        Alert.alert("Thành công", "Cập nhật bằng lái thành công.");
        setLicenseId(data.data.licenseId);
      } else {
        Alert.alert(
          "Lỗi",
          `Không thể cập nhật bằng lái. Mã lỗi: ${response.status}`
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
        // Xử lý thành công nếu status = 200
        alert("Đăng ký bằng lái thành công!");
      } else {
        throw new Error("Đăng ký bằng lái thất bại");
      }
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi!");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setLicenseDetails((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
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
            color="#007AFF"
            style={styles.loader}
          />
        ) : (
          <>
            {renderInputField(
              "Số bằng lái",
              "licenseNumber",
              "Nhập số bằng lái"
            )}
            {renderInputField(
              "Loại bằng lái",
              "licenseType",
              "Nhập loại bằng lái"
            )}
            <DatePickerField
              label="Ngày cấp"
              value={licenseDetails.issuedDate}
              onChange={(value) => handleInputChange("issuedDate", value)}
              field="issuedDate"
              error={errors.issuedDate}
            />
            <DatePickerField
              label="Ngày hết hạn"
              value={licenseDetails.expiryDate}
              onChange={(value) => handleInputChange("expiryDate", value)}
              field="expiryDate"
              error={errors.expiryDate}
            />
            {renderInputField(
              "Cơ quan cấp",
              "issuingAuthority",
              "Nhập cơ quan cấp"
            )}
            {renderImageSection("frontView", "Mặt trước bằng lái")}
            {renderImageSection("backView", "Mặt sau bằng lái")}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={licenseId ? updateLicenseDetails : createNewLicense}
            >
              <Text style={styles.saveButtonText}>
                {licenseId ? "Cập nhật" : "Tạo mới bằng lái"}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    padding: 30,
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
    padding: 16,
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
    paddingVertical: 16,
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
    fontSize: 18,
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
    color: "#007AFF",
    fontSize: 16,
  },
  datePickerIOS: {
    height: 200,
    width: "100%",
  },
});

export default LicenseScreen;
