import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

const ImageCameraField = ({
  label,
  images,
  onImageSelect,
  error,
  maxImages = 5,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập bị từ chối",
        "Cần quyền truy cập thư viện ảnh để sử dụng tính năng này",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const selectImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Giới hạn", `Bạn chỉ có thể chọn tối đa ${maxImages} ảnh!`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const imageData = {
          uri: result.assets[0].uri,
          type: "image/jpeg",
          name: `photo_${Date.now()}.jpg`,
        };
        onImageSelect([...images, imageData]);
      }
    } catch (error) {
      console.log("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImageSelect(newImages);
  };

  return (
    <View style={styles.imageContainer}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <View>
          <TouchableOpacity
            style={[styles.uploadButton, error && styles.inputError]}
            onPress={selectImage}
          >
            <Ionicons name="camera" size={24} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Chọn ảnh</Text>
          </TouchableOpacity>
          <View style={styles.imageGrid}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.idImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const Insurance = ({ route }) => {
  const [images, setImages] = useState([]);
  const [claimDescription, setClaimDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingClaim, setExistingClaim] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const bookingId = route.params?.bookingId;

  useEffect(() => {
    const fetchExistingClaim = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập.");
        }

        const response = await axios.get(
          `${BASE_URL}/api/insuranceClaim/claims/booking/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.code === 200 && response.data.data) {
          setExistingClaim(response.data.data);
          setClaimDescription(response.data.data.claimDescription || "");
        }
      } catch (error) {
        console.log("Lỗi khi lấy dữ liệu yêu cầu bảo hiểm:", error);
        // Không hiển thị lỗi nếu không tìm thấy yêu cầu
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingClaim();
  }, [bookingId]);

  const validateForm = () => {
    const newErrors = {};
    if (!claimDescription.trim()) {
      newErrors.claimDescription = "Mô tả yêu cầu là bắt buộc";
    }
    if (images.length === 0) {
      newErrors.image = "Vui lòng chọn ít nhất một ảnh";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    const formData = new FormData();
    const data = {
      claimDescription: claimDescription.trim(),
    };
    formData.append("data", JSON.stringify(data));

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập.");
      }

      for (const [index, img] of images.entries()) {
        formData.append("images", {
          uri: img.uri,
          type: "image/jpeg",
          name: `photo_${Date.now()}_${index}.jpg`,
        });
      }

      let responsePost;
      if (isEditing) {
        // Update existing claim using PUT
        responsePost = await axios.put(
          `${BASE_URL}/api/insuranceClaim/${bookingId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Create new claim using POST
        responsePost = await axios.post(
          `${BASE_URL}/api/tripBookings/insuranceClaim/${bookingId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      Alert.alert(
        "Thành công",
        isEditing
          ? "Yêu cầu bảo hiểm đã được cập nhật thành công!"
          : "Yêu cầu bảo hiểm đã được tạo thành công!"
      );

      // Fetch updated claim data
      const response = await axios.get(
        `${BASE_URL}/api/insuranceClaim/claims/booking/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.code === 200 && response.data.data) {
        setExistingClaim(response.data.data);
        setIsEditing(false);
        setImages([]);
        setClaimDescription("");
      }
    } catch (error) {
      console.log(
        "Lỗi khi gửi form:",
        error.response ? error.response.data : error.message
      );
      Alert.alert(
        "Lỗi",
        error.response?.status === 400
          ? "Yêu cầu không hợp lệ: Kiểm tra lại dữ liệu gửi đi."
          : error.response?.status === 403
          ? "Bị cấm: Token không hợp lệ hoặc thiếu quyền."
          : `Không thể gửi dữ liệu: ${error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b5ec" />
      </View>
    );
  }

  if (existingClaim && !isEditing) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Thông Tin Yêu Cầu Bảo Hiểm</Text>
          {existingClaim.claimStatus === "PENDING" && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setIsEditing(true);
                setImages(
                  existingClaim.evidenceImageList.map((url) => ({
                    uri: url,
                    type: "image/jpeg",
                    name: `photo_${Date.now()}.jpg`,
                  }))
                );
                setClaimDescription(existingClaim.claimDescription);
              }}
            >
              <Ionicons name="create-outline" size={24} color="#00b5ec" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.claimInfoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            <Text
              style={[
                styles.infoValue,
                styles[`status${existingClaim.claimStatus}`],
              ]}
            >
              {existingClaim.claimStatus === "APPROVED"
                ? "Đã duyệt"
                : existingClaim.claimStatus === "PENDING"
                ? "Đang chờ"
                : existingClaim.claimStatus === "REJECTED"
                ? "Từ chối"
                : existingClaim.claimStatus}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả:</Text>
            <Text style={styles.infoValue}>
              {existingClaim.claimDescription}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>
              {new Date(existingClaim.createdAt).toLocaleDateString("vi-VN")}
            </Text>
          </View>

          {existingClaim.resolutionDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày xử lý:</Text>
              <Text style={styles.infoValue}>
                {new Date(existingClaim.resolutionDate).toLocaleDateString(
                  "vi-VN"
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.imagesContainer}>
          <Text style={styles.sectionTitle}>Ảnh minh chứng</Text>
          <View style={styles.imageGrid}>
            {existingClaim.evidenceImageList.map((imageUrl, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.idImage} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isEditing ? "Sửa Đổi Yêu Cầu Bảo Hiểm" : "Gửi Yêu Cầu Bảo Hiểm"}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mô Tả</Text>
        <TextInput
          style={[styles.input, errors.claimDescription && styles.inputError]}
          value={claimDescription}
          onChangeText={(text) => {
            setClaimDescription(text);
            setErrors((prev) => ({ ...prev, claimDescription: "" }));
          }}
          placeholder="Nhập mô tả của bạn"
          multiline
          numberOfLines={4}
        />
        {errors.claimDescription && (
          <Text style={styles.errorText}>{errors.claimDescription}</Text>
        )}
      </View>

      <ImageCameraField
        label="Chọn Ảnh (Tối đa 5)"
        images={images}
        onImageSelect={setImages}
        error={errors.image}
        maxImages={5}
      />

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.disabledButton]}
        onPress={submitForm}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isEditing ? "Sửa Đổi" : "Gửi Yêu Cầu"}
          </Text>
        )}
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.cancelButton]}
          onPress={() => {
            setIsEditing(false);
            setImages([]);
            setClaimDescription("");
          }}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  imageContainer: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  uploadButtonText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 10,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageWrapper: {
    width: "48%",
    marginBottom: 10,
    position: "relative",
  },
  idImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 2,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  claimInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    flex: 2,
    fontSize: 16,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  imagesContainer: {
    marginBottom: 20,
  },
  statusAPPROVED: {
    color: "#28a745",
    fontWeight: "bold",
  },
  statusPENDING: {
    color: "#ffc107",
    fontWeight: "bold",
  },
  statusREJECTED: {
    color: "#dc3545",
    fontWeight: "bold",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Insurance;
