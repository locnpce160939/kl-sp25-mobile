import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VehicleScreen = () => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vehicleId, setVehicleId] = useState(null);
    const [formData, setFormData] = useState({
        licensePlate: "",
        vehicleType: "",
        make: "",
        model: "",
        year: "",
        capacity: "",
        dimensions: "",
        insuranceStatus: "",
        registrationExpiryDate: "",
    });

    useEffect(() => {
        if (!vehicleId) {
            fetchVehicleInfo();
        }
    }, [vehicleId]);

    const fetchVehicleInfo = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const response = await axios.get(`${BASE_URl}/api/registerDriver/vehicle/getByAccountId`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const vehicleData = response.data.data;

            if (vehicleData && vehicleData.vehicleId) {
                setVehicleId(vehicleData.vehicleId);
                setFormData({
                    licensePlate: vehicleData.licensePlate,
                    vehicleType: vehicleData.vehicleType,
                    make: vehicleData.make,
                    model: vehicleData.model,
                    year: vehicleData.year,
                    capacity: vehicleData.capacity,
                    dimensions: vehicleData.dimensions,
                    insuranceStatus: vehicleData.insuranceStatus,
                    registrationExpiryDate: formatDate(vehicleData.registrationExpiryDate),
                });
            } else {
                setVehicleId(null);
                resetForm();
            }
        } catch (error) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải thông tin xe.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            licensePlate: "",
            vehicleType: "",
            make: "",
            model: "",
            year: "",
            capacity: "",
            dimensions: "",
            insuranceStatus: "",
            registrationExpiryDate: "",
        });
    };

    const handleInputChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    const validateInputs = () => {
        if (!formData.licensePlate.trim() || !formData.vehicleType.trim()) {
            Alert.alert("Validation Error", "Vui lòng điền đầy đủ thông tin bắt buộc.");
            return false;
        }
        return true;
    };

    const createOrUpdateVehicle = async () => {
        if (!validateInputs()) return;

        setLoading(true);

        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const url = vehicleId
                ? `${BASE_URl}/api/registerDriver/updateVehicle/${vehicleId}`
                : `${BASE_URl}/api/registerDriver/createNewVehicle`;
            const method = vehicleId ? "put" : "post";

            const formatDateForBackend = (date) => {
                const d = new Date(date);
                const pad = (n) => (n < 10 ? `0${n}` : n);
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00`;
            };

            const data = {
                ...formData,
                registrationExpiryDate: formatDateForBackend(formData.registrationExpiryDate),
                year: parseInt(formData.year, 10) || 0,
                capacity: parseInt(formData.capacity, 10) || 0,
            };

            const { status } = await axios[method](url, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });

            if (status === 200 || status === 201) {
                Alert.alert("Thành công", vehicleId ? "Thông tin xe đã được cập nhật!" : "Tạo xe mới thành công.");
                fetchVehicleInfo();
            } else {
                throw new Error("Đã xảy ra lỗi trong quá trình lưu thông tin xe.");
            }
        } catch (error) {
            if (error.response) {
                Alert.alert("Lỗi", error.response.data.message || "Không thể lưu thông tin xe. Vui lòng thử lại sau.");
            } else {
                Alert.alert("Lỗi", error.message || "Có lỗi xảy ra, vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => new Date(date).toISOString().split("T")[0];

    const getFieldLabel = (field) => ({
        licensePlate: "Biển số xe",
        vehicleType: "Loại xe",
        make: "Hãng xe",
        model: "Dòng xe",
        year: "Năm sản xuất",
        capacity: "Sức chứa",
        dimensions: "Kích thước",
        insuranceStatus: "Tình trạng bảo hiểm",
        registrationExpiryDate: "Ngày hết hạn đăng ký",
    }[field]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <>
                    <Text style={styles.header}>
                        {vehicleId ? "Cập nhật thông tin xe" : "Tạo thông tin xe mới"}
                    </Text>
                    {Object.keys(formData).map((field) => (
                        <View key={field}>
                            <Text style={styles.label}>{getFieldLabel(field)}</Text>
                            {field === "registrationExpiryDate" ? (
                                <>
                                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.registrationExpiryDate}
                                            editable={false}
                                            placeholder="YYYY-MM-DD"
                                        />
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={formData.registrationExpiryDate
                                                ? new Date(formData.registrationExpiryDate)
                                                : new Date()}
                                            mode="date"
                                            onChange={(event, date) => {
                                                setShowDatePicker(false);
                                                if (date) handleInputChange(field, formatDate(date));
                                            }}
                                        />
                                    )}
                                </>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    placeholder={getFieldLabel(field)}
                                    value={formData[field]?.toString() || ""}
                                    keyboardType={["year", "capacity"].includes(field) ? "numeric" : "default"}
                                    onChangeText={(value) => {
                                        const numericFields = ["year", "capacity"];
                                        handleInputChange(
                                            field,
                                            numericFields.includes(field) ? value.replace(/[^0-9]/g, "") : value
                                        );
                                    }}
                                />
                            )}
                        </View>
                    ))}
                    <TouchableOpacity style={styles.button} onPress={createOrUpdateVehicle}>
                        <Text style={styles.buttonText}>
                            {vehicleId ? "Cập nhật" : "Tạo mới"}
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: "#fff" },
    header: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
    label: { fontSize: 16, marginBottom: 8 },
    input: { backgroundColor: "#f5f5f5", padding: 15, borderRadius: 8, marginBottom: 20 },
    button: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 20 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default VehicleScreen;
