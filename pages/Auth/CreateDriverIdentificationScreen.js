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
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URl } from "../../configUrl";

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
    <Text style={styles.label}>
      {label} <Text style={styles.required}>*</Text>
    </Text>
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
    setShow(false);
    if (selectedDate) {
      const formattedDate = new Date(selectedDate).toISOString().split(".")[0];
      onChange(formattedDate);
    }
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return "Select a date";
    return dateValue.split("T")[0];
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={styles.inputText}>
          {value ? formatDisplayDate(value) : "Select a date"}
        </Text>
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

  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [permanentDistricts, setPermanentDistricts] = useState([]);
  const [temporaryDistricts, setTemporaryDistricts] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [temporaryWards, setTemporaryWards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getDriverIdentificationById();
      if (data) {
        // Đảm bảo lấy đúng thuộc tính `code` và `fullName` từ `templateLocations`
        setProvinces(
          data.permanentAddress.province.templateLocations.map((province) => ({
            id: province.code,
            fullName: province.fullName,
          }))
        );

        setPermanentDistricts(
          data.permanentAddress.district.templateLocations.map((district) => ({
            id: district.code,
            fullName: district.fullName,
          }))
        );

        setPermanentWards(
          data.permanentAddress.ward.templateLocations.map((ward) => ({
            id: ward.code,
            fullName: ward.fullName,
          }))
        );
        setTemporaryDistricts(
          data.temporaryAddress.district.templateLocations.map((district) => ({
            id: district.code,
            fullName: district.fullName,
          }))
        );

        setTemporaryWards(
          data.temporaryAddress.ward.templateLocations.map((ward) => ({
            id: ward.code,
            fullName: ward.fullName,
          }))
        );

        // Đặt giá trị cho form
        setFormData({
          idNumber: data.idNumber || "",
          permanentAddressWard: data.permanentAddress.ward.id || "",
          permanentAddressDistrict: data.permanentAddress.district.id || "",
          permanentAddressProvince: data.permanentAddress.province.id || "",
          permanentStreetAddress: data.permanentAddress.streetAddress || "",
          temporaryAddressWard: data.temporaryAddress.ward.id || "",
          temporaryAddressDistrict: data.temporaryAddress.district.id || "",
          temporaryAddressProvince: data.temporaryAddress.province.id || "",
          temporaryStreetAddress: data.temporaryAddress.streetAddress || "",
          issueDate: data.issueDate || "",
          expiryDate: data.expiryDate || "",
          issuedBy: data.issuedBy || "",
        });

        // Xử lý thay đổi tỉnh thành nếu có
        if (data.permanentAddress.province.id) {
          handleProvinceChange(data.permanentAddress.province.id, "permanent");
        }
        if (data.temporaryAddress?.province?.id) {
          handleProvinceChange(data.temporaryAddress.province.id, "temporary");
        }
      }
    };

    fetchData();
  }, []);

  const getDriverIdentificationById = async () => {
    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "No user information found. Please login again.");
        setIsLoading(false);
        return null;
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        Alert.alert(
          "Error",
          "Missing accountId or access token. Please login again."
        );
        setIsLoading(false);
        return null;
      }

      const res = await axios.get(
        `${BASE_URl}/api/registerDriver/identification/getByAccountId`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (res.status === 200 && res.data.code === 200) {
        return res.data.data;
      } else {
        Alert.alert(
          "Error",
          res.data.message || "Failed to fetch identification details."
        );
        return null;
      }
    } catch (error) {
      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message || "An error occurred."
        );
      } else {
        Alert.alert("Error", "An unknown error occurred.");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

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

    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
        newErrors.expiryDate = "Expiry date must be after issue date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "No user information found. Please login again.");
        setIsLoading(false);
        return;
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        Alert.alert("Error", "Missing access token. Please login again.");
        setIsLoading(false);
        return;
      }

      const data = await getDriverIdentificationById();
      if (data) {
        // Update existing data
        await updateDriverIdentification(formData, accessToken);
      } else {
        // Create new data
        await createDriverIdentification(formData, navigation);
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      const errorMessage =
        error.response?.data?.message || "An error occurred during submission.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverIdentification = async (updatedData) => {
    try {
      setIsLoading(true); // Bắt đầu loading

      // Lấy token từ AsyncStorage
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Error", "No user information found. Please login again.");
        setIsLoading(false);
        return null;
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        Alert.alert("Error", "Missing access token. Please login again.");
        setIsLoading(false);
        return null;
      }

      // Kiểm tra xem driver identification đã tồn tại chưa
      const driverIdentification = updatedData?.driverIdentification;
      if (!driverIdentification) {
        Alert.alert("Error", "Driver identification not found. Cannot update.");
        setIsLoading(false);
        return null;
      }

      // Gửi yêu cầu update
      const response = await axios.put(
        `${BASE_URl}/api/registerDriver/updateDriverIdentification`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json", // Nếu payload là JSON
          },
        }
      );

      setIsLoading(false); // Kết thúc loading

      // Kiểm tra kết quả
      if (response.status === 200) {
        Alert.alert("Success", "Driver identification updated successfully.");
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to update identification."
        );
      }
    } catch (error) {
      console.error("Error updating driver identification:", error);
      setIsLoading(false); // Kết thúc loading
      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message || "An error occurred."
        );
      } else {
        Alert.alert("Error", "An unknown error occurred.");
      }
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
      {errors.idNumber && (
        <Text style={styles.errorText}>{errors.idNumber}</Text>
      )}

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
        onChange={(value) => handleInputChange("issueDate", value)}
      />
      {errors.issueDate && (
        <Text style={styles.errorText}>{errors.issueDate}</Text>
      )}

      <DatePickerField
        label="Expiry Date"
        value={formData.expiryDate}
        onChange={(value) => handleInputChange("expiryDate", value)}
      />
      {errors.expiryDate && (
        <Text style={styles.errorText}>{errors.expiryDate}</Text>
      )}

      <InputField
        label="Issued By"
        value={formData.issuedBy}
        onChangeText={(value) => handleInputChange("issuedBy", value)}
        placeholder="Enter issuer"
      />
      {errors.issuedBy && (
        <Text style={styles.errorText}>{errors.issuedBy}</Text>
      )}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
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
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
    color: "#00b5ec",
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
