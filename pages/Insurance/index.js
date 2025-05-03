import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Image,
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BASE_URL } from "../../configUrl";


const Insurance = ({route}) => {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  const bookingId = route.params?.bookingId;

  // Request permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Sorry, we need camera roll permissions to make this work!"
        );
      }
    })();
  }, []);

  console.log(bookingId)

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
        setErrors((prev) => ({ ...prev, image: "" }));
      }
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };


  // Hàm validate form
  const validateForm = () => {
    const newErrors = {};
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!image) {
      newErrors.image = "Please select an image";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ...existing code...
  const submitForm = async () => {
    if (!validateForm()) return;
  
    const formData = new FormData();
  
    // Append description directly as text
    formData.append("description", description.trim());
  
    try {
      // Convert image URI to a blob (file)
      const response = await fetch(image.uri);
      const imageBlob = await response.blob();
      // Append file image
      formData.append("images", imageBlob, "image.jpg");

      // Log the form data being sent
      console.log('Form Data being sent:', {
        description: description.trim(),
        imageUri: image.uri,
        imageBlob: imageBlob
      });
  
      const responsePost = await axios.post(
        `${BASE_URL}/api/tripBookings/insuranceClaim/${bookingId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Log the successful response
      console.log('API Response:', {
        status: responsePost.status,
        data: responsePost.data,
        headers: responsePost.headers
      });

      Alert.alert("Success", "Image and description submitted successfully!");
      setImage(null);
      setDescription("");
    } catch (error) {
      // Log detailed error information
      console.log('Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      Alert.alert("Error", `Failed to submit data: ${error.message}`);
    }
  };
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insurance Claim Submission</Text>

      {/* Form nhập description */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, errors.description && styles.inputError]}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setErrors((prev) => ({ ...prev, description: "" }));
          }}
          placeholder="Enter your description"
          multiline
          numberOfLines={4}
        />
        {errors.description && (
          <Text style={styles.errorText}>{errors.description}</Text>
        )}
      </View>

      {/* Chọn ảnh */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Select Image</Text>
        <Button
          title="Pick an image from gallery"
          onPress={pickImageFromGallery}
        />
        {image && <Image source={{ uri: image.uri }} style={styles.image} />}
        {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
      </View>

      {/* Nút gửi */}
      <Button title="Gửi" onPress={submitForm} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
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