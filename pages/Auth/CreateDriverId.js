import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { AuthContext } from "../../contexts/AuthContext";

// Tạo một component InputField để tái sử dụng
const InputField = ({
  label,
  field,
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

const CreateDriverId = ({ navigation }) => {
  const { createDriverIdentification, isLoading } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    idNumber: "",
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
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Kiểm tra từng trường hợp khi nhập dữ liệu
  const validateField = (field, value) => {
    if (!value.trim()) {
      Alert.alert("Validation Error", `${field} is required.`);
      return false;
    }
    return true;
  };

  // Kiểm tra và gửi dữ liệu form
  const handleSubmit = async () => {
    // Kiểm tra từng trường
    for (const [field, value] of Object.entries(formData)) {
      if (!validateField(field, value)) return;
    }

    try {
      await createDriverIdentification(formData, navigation);
    } catch (error) {
      console.error("Error submitting form:", error);
      Alert.alert("Error", "An error occurred during submission.");
    }
  };

  const fields = [
    {
      label: "ID Number",
      field: "idNumber",
      placeholder: "Enter your ID number",
      keyboardType: "numeric",
    },
    {
      label: "Permanent Address Province",
      field: "permanentAddressProvince",
      placeholder: "Enter your province",
    },
    {
      label: "Permanent Address District",
      field: "permanentAddressDistrict",
      placeholder: "Enter your district",
    },
    {
      label: "Permanent Address Ward",
      field: "permanentAddressWard",
      placeholder: "Enter your ward",
    },
    {
      label: "Permanent Street Address",
      field: "permanentStreetAddress",
      placeholder: "Enter your street address",
    },
    {
      label: "Temporary Address Province",
      field: "temporaryAddressProvince",
      placeholder: "Enter your province",
    },
    {
      label: "Temporary Address District",
      field: "temporaryAddressDistrict",
      placeholder: "Enter your district",
    },
    {
      label: "Temporary Address Ward",
      field: "temporaryAddressWard",
      placeholder: "Enter your ward",
    },
    {
      label: "Temporary Street Address",
      field: "temporaryStreetAddress",
      placeholder: "Enter your street address",
    },
    { label: "Issue Date", field: "issueDate", placeholder: "YYYY-MM-DD" },
    { label: "Expiry Date", field: "expiryDate", placeholder: "YYYY-MM-DD" },
    {
      label: "Issued By",
      field: "issuedBy",
      placeholder: "Enter issuing authority",
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Identification Form</Text>
      {fields.map(({ label, field, placeholder, keyboardType }) => (
        <InputField
          key={field}
          label={label}
          field={field}
          value={formData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      ))}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
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
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default CreateDriverId;
