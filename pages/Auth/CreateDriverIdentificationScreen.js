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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";

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

const PickerField = ({
  label,
  items,
  selectedValue,
  onValueChange,
  enabled = true,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <Picker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      style={styles.picker}
      enabled={enabled}
    >
      <Picker.Item label="Select an option" value="" />
      {items.map((item) => (
        <Picker.Item key={item.id} label={item.fullName} value={item.id} />
      ))}
    </Picker>
  </View>
);

const DatePickerField = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShow(false); // Đóng DateTimePicker khi chọn ngày
    if (selectedDate) {
      const formattedDate = new Date(selectedDate).toISOString().split(".")[0]; // Định dạng ngày đầy đủ
      onChange(formattedDate); // Gửi ngày vào state
    }
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return "Select a date"; // Hiển thị văn bản nếu không có ngày
    return dateValue.split("T")[0]; // Lấy phần ngày từ datetime
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShow(true)} // Mở DateTimePicker
      >
      <Text style={styles.inputText}>{value ? formatDisplayDate(value) : "Select a date"}</Text>

      </TouchableOpacity>
      {show && (
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



const CreateDriverIdentificationScreen = ({ navigation }) => {
  const { createDriverIdentification, getProvinces, getDistricts, getWards } =
    useContext(AuthContext);

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

  const [errors, setErrors] = useState({}); // State để lưu lỗi
  const [provinces, setProvinces] = useState([]);
  const [permanentDistricts, setPermanentDistricts] = useState([]);
  const [temporaryDistricts, setTemporaryDistricts] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [temporaryWards, setTemporaryWards] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" })); // Xóa lỗi khi người dùng nhập

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
  }, [getProvinces]);

  const handleProvinceChange = async (value, addressType) => {
    const selectedProvince = provinces.find(
      (province) => province.id === value
    );
    if (selectedProvince) {
      try {
        const districtsData = await getDistricts(selectedProvince.id);
        if (addressType === "permanent") {
          setPermanentDistricts(districtsData);
          handleInputChange("permanentAddressProvince", value);
        } else {
          setTemporaryDistricts(districtsData);
          handleInputChange("temporaryAddressProvince", value);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load districts.");
      }
    }
  };

  const handleDistrictChange = async (value, addressType) => {
    const districts =
      addressType === "permanent" ? permanentDistricts : temporaryDistricts;
    const selectedDistrict = districts.find(
      (district) => district.id === value
    );
    if (selectedDistrict) {
      try {
        const wardsData = await getWards(selectedDistrict.id);
        if (addressType === "permanent") {
          setPermanentWards(wardsData);
          handleInputChange("permanentAddressDistrict", value);
        } else {
          setTemporaryWards(wardsData);
          handleInputChange("temporaryAddressDistrict", value);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load wards.");
      }
    }
  };
  const validateForm = () => {
    const newErrors = {};
    Object.entries(formData).forEach(([field, value]) => {
      if (!value || (typeof value === "string" && !value.trim())) {
        newErrors[field] = `${field} is required.`;
      }
    });

    // Kiểm tra ngày
    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
        newErrors.expiryDate = "Expiry date must be after issue date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
  };
  
  const handleSubmit = async () => {
    if (isLoading) return; // Nếu đang tải, không gửi yêu cầu mới
  
    if (!validateForm()) return; // Kiểm tra form trước khi gửi
  
    setIsLoading(true);
    try {
      // Gọi API để tạo driver identification
      await createDriverIdentification(formData, navigation);
    } catch (error) {
      console.error("Error during form submission:", error);
  
      // Lấy thông báo lỗi từ server nếu có, hoặc hiển thị thông báo mặc định
      const errorMessage = error.response?.data?.message || 
                           "An error occurred during submission. Please check your input.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false); // Tắt trạng thái loading
    }
  };
  
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Identification Form</Text>

      <InputField
        label="ID Number"
        value={formData.idNumber}
        onChangeText={(value) => handleInputChange("idNumber", value)}
        placeholder="Enter your ID number"
        keyboardType="numeric"
      />
     { errors.idNumber && <Text style={styles.errorText}>{errors.idNumber}</Text>}

      <PickerField
        label="Permanent Address Province"
        items={provinces}
        selectedValue={formData.permanentAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "permanent")}
      />
        {errors.permanentAddressProvince && (
        <Text style={styles.errorText}>{errors.permanentAddressProvince}</Text>
      )}

      <PickerField
        label="Permanent Address District"
        items={permanentDistricts}
        selectedValue={formData.permanentAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "permanent")}
        enabled={!!formData.permanentAddressProvince}
      />
       {errors.permanentAddressDistrict && (
        <Text style={styles.errorText}>{errors.permanentAddressDistrict}</Text>
      )}


      <PickerField
        label="Permanent Address Ward"
        items={permanentWards}
        selectedValue={formData.permanentAddressWard}
        onValueChange={(value) =>
          handleInputChange("permanentAddressWard", value)
        }
        enabled={!!formData.permanentAddressDistrict}
      />
        {errors.permanentAddressWard && (
        <Text style={styles.errorText}>{errors.permanentAddressWard}</Text>
      )}

      <InputField
        label="Permanent Street Address"
        value={formData.permanentStreetAddress}
        onChangeText={(value) =>
          handleInputChange("permanentStreetAddress", value)
        }
        placeholder="Enter your street address"
      />
       {errors.permanentStreetAddress && (
        <Text style={styles.errorText}>{errors.permanentStreetAddress}</Text>
      )}


      <PickerField
        label="Temporary Address Province"
        items={provinces}
        selectedValue={formData.temporaryAddressProvince}
        onValueChange={(value) => handleProvinceChange(value, "temporary")}
      />
      {errors.temporaryAddressProvince && (
  <Text style={styles.errorText}>{errors.temporaryAddressProvince}</Text>
)}

      <PickerField
        label="Temporary Address District"
        items={temporaryDistricts}
        selectedValue={formData.temporaryAddressDistrict}
        onValueChange={(value) => handleDistrictChange(value, "temporary")}
        enabled={!!formData.temporaryAddressProvince}
      />
      {errors.temporaryAddressDistrict && (
  <Text style={styles.errorText}>{errors.temporaryAddressDistrict}</Text>
)}

      <PickerField
        label="Temporary Address Ward"
        items={temporaryWards}
        selectedValue={formData.temporaryAddressWard}
        onValueChange={(value) =>
          handleInputChange("temporaryAddressWard", value)
        }
        enabled={!!formData.temporaryAddressDistrict}
      />
      {errors.temporaryAddressWard && (
  <Text style={styles.errorText}>{errors.temporaryAddressWard}</Text>
)}

      <InputField
        label="Temporary Street Address"
        value={formData.temporaryStreetAddress}
        onChangeText={(value) =>
          handleInputChange("temporaryStreetAddress", value)
        }
        placeholder="Enter your street address"
      />
      {errors.temporaryStreetAddress && (
  <Text style={styles.errorText}>{errors.temporaryStreetAddress}</Text>
)}

      <DatePickerField
        label="Issue Date"
        value={formData.issueDate}
        onChange={(date) => handleInputChange("issueDate", date)}
      />
        {errors.issueDate && <Text style={styles.errorText}>{errors.issueDate}</Text>}

      <DatePickerField
        label="Expiry Date"
        value={formData.expiryDate}
        onChange={(date) => handleInputChange("expiryDate", date)}
      />
      {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}

      <InputField
        label="Issued By"
        value={formData.issuedBy}
        onChangeText={(value) => handleInputChange("issuedBy", value)}
        placeholder="Enter issuing authority"
      />
        {errors.issuedBy && <Text style={styles.errorText}>{errors.issuedBy}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({

   // ... existing styles
   errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
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
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateDriverIdentificationScreen;
