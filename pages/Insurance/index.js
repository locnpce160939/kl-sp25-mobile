import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Image,
  Alert,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Insurance = ({ route }) => {
  const [images, setImages] = useState([]);
  const [claimDescription, setClaimDescription] = useState("");
  const [errors, setErrors] = useState({});

  const bookingId = route.params?.bookingId;

  // Yêu cầu quyền khi component được mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Phản hồi bị từ chối",
          "Xin lỗi, chúng tôi cần quyền truy cập thư viện ảnh để thực hiện chức năng này!"
        );
      }
    })();
  }, []);

  console.log("Booking ID:", bookingId);

  const pickImageFromGallery = async () => {
    if (images.length >= 5) {
      Alert.alert("Giới hạn", "Bạn chỉ có thể chọn tối đa 5 ảnh!");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0]]);
        setErrors((prev) => ({ ...prev, image: "" }));
      }
    } catch (error) {
      console.log("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  // Hàm xác thực form
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

    const formData = new FormData();

    // Tạo phần data chứa claimDescription dưới dạng JSON
    const data = {
      claimDescription: claimDescription.trim(),
    };
    formData.append("data", JSON.stringify(data));

    try {
      // Lấy token nếu backend yêu cầu
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Không tìm thấy token xác thực. Vui lòng đăng nhập.");
      }

      // Thêm tất cả ảnh vào formData
      for (const [index, img] of images.entries()) {
        const response = await fetch(img.uri);
        const imageBlob = await response.blob();
        formData.append("images[]", imageBlob, `image${index}.jpg`);
      }

      const responsePost = await axios.post(
        `${BASE_URL}/api/tripBookings/insuranceClaim/${bookingId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      Alert.alert("Thành công", "Yêu cầu bảo hiểm đã được tạo thành công!");
      console.log("Dữ liệu phản hồi:", responsePost.data);
      setImages([]);
      setClaimDescription("");
    } catch (error) {
      console.log("Lỗi khi gửi form:", error.response ? error.response.data : error.message);
      Alert.alert(
        "Lỗi",
        error.response?.status === 400
          ? "Yêu cầu không hợp lệ: Kiểm tra lại dữ liệu gửi đi."
          : error.response?.status === 403
          ? "Bị cấm: Token không hợp lệ hoặc thiếu quyền."
          : `Không thể gửi dữ liệu: ${error.message}`
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gửi Yêu Cầu Bảo Hiểm</Text>

      {/* Form nhập mô tả */}
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

      {/* Chọn ảnh */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Chọn Ảnh (Tối đa 5)</Text>
        <Button
          title="Chọn ảnh từ thư viện"
          onPress={pickImageFromGallery}
        />
        {images.map((img, index) => (
          <Image key={index} source={{ uri: img.uri }} style={styles.image} />
        ))}
        {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
      </View>

      {/* Nút gửi */}
      <Button title="Gửi" onPress={submitForm} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
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
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
    alignSelf: "center",
    borderRadius: 10,
  },
});

export default Insurance;