import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAlert } from "../../components/CustomAlert";

const ProfileUserScreen = () => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [userDetails, setUserDetails] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    status: "",
  });
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { logout } = useContext(AuthContext);
  const [validationErrors, setValidationErrors] = useState({
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token)
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

      const {
        data: { data: userData },
      } = await axios.get(`${BASE_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userData) {
        setUserDetails(userData);
        setDisplayName(userData.fullName || "Chưa cập nhật");
      }
    } catch (error) {
      handleUserError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserError = async (error) => {
    if (error.response?.status === 401) {
      showAlert({
        title: "Lỗi",
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        type: "error",
        confirmText: "OK",
        onClose: async () => {
          await logout();
        },
      });
    } else if (!userDetails || !userDetails.username) {
      showAlert({
        title: "Lỗi",
        message: "Không thể tải thông tin người dùng. Vui lòng thử lại sau.",
        type: "error",
      });
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "phone") {
      // Only allow numbers
      value = value.replace(/[^0-9]/g, "");
    } else if (field === "fullName") {
      // Remove only specific special characters and limit length
      value = value.replace(/[@#$%^&*!]/g, "");
      if (value.length > 50) {
        value = value.substring(0, 50);
      }
    }
    setUserDetails((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateInputs = () => {
    const errors = {
      fullName: "",
      phone: "",
    };
    let isValid = true;

    const specialChars = /[@#$%^&*!]/;
    
    if (!userDetails.fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ tên";
      isValid = false;
    } else if (specialChars.test(userDetails.fullName.trim())) {
      errors.fullName = "Họ tên không được chứa ký tự đặc biệt";
      isValid = false;
    } else if (userDetails.fullName.trim().length > 50) {
      errors.fullName = "Họ tên không được vượt quá 50 ký tự";
      isValid = false;
    }

    if (!userDetails.phone.trim()) {
      errors.phone = "Vui lòng nhập số điện thoại";
      isValid = false;
    } else if (!/^\d{10}$/.test(userDetails.phone.trim())) {
      errors.phone = "Số điện thoại phải có 10 chữ số";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const updateUserDetails = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        showAlert({
          title: "Lỗi",
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          type: "error",
          confirmText: "OK",
          onClose: async () => {
            await logout();
          },
        });
        return;
      }

      const updatedDetails = {
        fullName: userDetails.fullName.trim(),
        phone: userDetails.phone.trim(),
      };

      const { status } = await axios.put(
        `${BASE_URL}/api/account/editProfile`,
        updatedDetails,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (status === 200) {
        setDisplayName(userDetails.fullName.trim() || "Chưa cập nhật");
        showAlert({
          title: "Thành công",
          message: "Cập nhật thông tin thành công",
          type: "success",
          autoClose: true
        });
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        showAlert({
          title: "Lỗi",
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          type: "error",
          confirmText: "OK",
          onClose: async () => {
            await logout();
          },
        });
      } else if (error.response?.status === 400) {
        showAlert({
          title: "Lỗi",
          message: "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (label, field, placeholder, icon) => (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.input,
          (field === "username" || field === "email") && styles.disabledInput,
          validationErrors[field] && styles.errorInput,
        ]}
        value={userDetails[field]}
        onChangeText={(text) => handleInputChange(field, text)}
        placeholder={placeholder}
        placeholderTextColor={"#999"}
        editable={field === "fullName" || field === "phone"}
        keyboardType={field === "phone" ? "numeric" : "default"}
        maxLength={field === "phone" ? 10 : field === "fullName" ? 50 : undefined}
      />
      {validationErrors[field] ? (
        <Text style={styles.errorText}>{validationErrors[field]}</Text>
      ) : null}
      {field === "fullName" && (
        <Text style={styles.charCount}>
          {userDetails.fullName.length}/50 ký tự
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#00b5ec" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.profileIconContainer}>
              <Ionicons name="person-circle" size={130} color="#00b5ec" />
            </View>
            <Text style={styles.userName}>
              {displayName}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {renderInputField(
              "Tên đăng nhập",
              "username",
              "Nhập tên đăng nhập",
              "person-outline"
            )}
            {renderInputField(
              "Họ và tên",
              "fullName",
              "Nhập họ và tên",
              "card-outline"
            )}
            {renderInputField("Email", "email", "Nhập email", "mail-outline")}
            {renderInputField(
              "Số điện thoại",
              "phone",
              "Nhập số điện thoại",
              "call-outline"
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={updateUserDetails}
            >
              <Text style={styles.saveButtonText}>Cập nhật</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    ...Platform.select({
      ios: {
        paddingTop: 20,
      },
      android: {
        paddingTop: 15,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerRight: {
    width: 44,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexGrow: 1,
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  formContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginTop: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 8,
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#666",
    borderColor: "#bbb",
    borderWidth: 1,
    borderStyle: "dotted",
  },
  saveButton: {
    backgroundColor: "#00b5ec",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorInput: {
    borderColor: "#ff3b30",
    borderWidth: 1,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
});

export default ProfileUserScreen;
