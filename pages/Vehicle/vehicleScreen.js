import React, { useState, useEffect, useContext } from "react";
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
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";

const VehicleScreen = () => {
    const [viewMode, setViewMode] = useState("list");
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vehicleId, setVehicleId] = useState(null);
    const { logout } = useContext(AuthContext);
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
    const [errors, setErrors] = useState({});
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (viewMode === "list") fetchVehicleList();
    }, [viewMode]);

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
            } else if (error.response?.data?.message === "Vehicle not found") {
                setLicenseId(null);
                resetLicenseDetails();
                console.log("Không tìm thấy thông tin xe.");
            } else {
                console.log("Error fetching vehicle details:", error);
            }
        };
 
    const fetchVehicleList = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const response = await axios.get(`${BASE_URl}/api/registerDriver/vehicles/getByAccountId`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            });

            console.log("Vehicle data:", response.data);

            const vehicleData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
            setVehicles(vehicleData);
        } catch (error) {
            console.log("Không thể tải danh sách xe.",error.response?.data?.message);
            //Alert.alert("Thông báo", error.response?.data?.message || "Không thể tải danh sách xe.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" })); 
    };

    const handleSelectVehicle = (vehicle, index) => {
        setVehicleId(vehicle.vehicleId);
        setFormData({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year.toString(), // Ensure it's a string for TextInput
            capacity: vehicle.capacity.toString(), // Ensure it's a string for TextInput
            dimensions: vehicle.dimensions,
            insuranceStatus: vehicle.insuranceStatus,
            registrationExpiryDate: vehicle.registrationExpiryDate.split("T")[0], // Show only YYYY-MM-DD
        });
        setViewMode("form");
    };

    const handleCreateNew = () => {
        setVehicleId(null);
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
        setViewMode("form");
    };

    const handleBackToList = () => {
        setViewMode("list");
    };

    const validateFormData = () => {
        const { licensePlate, vehicleType, make, model, year, capacity, dimensions, insuranceStatus, registrationExpiryDate } = formData;
        let formErrors = {};

        if (!licensePlate) formErrors.licensePlate = "Biển số xe là bắt buộc.";
        if (!vehicleType) formErrors.vehicleType = "Loại xe là bắt buộc.";
        if (!make) formErrors.make = "Hãng xe là bắt buộc.";
        if (!model) formErrors.model = "Mẫu xe là bắt buộc.";
        if (!year) formErrors.year = "Năm sản xuất là bắt buộc.";

        // New validation for year
        const currentYear = new Date().getFullYear();
        const manufacturingYear = parseInt(year);
        if (isNaN(manufacturingYear)) {
            formErrors.year = "Năm sản xuất phải là số.";
        } else if (currentYear - manufacturingYear > 25) {
            formErrors.year = "Xe không được quá 25 năm tuổi.";
        }
        if (!capacity) formErrors.capacity = "Sức chứa là bắt buộc.";
        if (capacity < 1 || capacity > 15) formErrors.capacity = "Sức chứa phải nằm trong khoảng từ 1 đến 15 tấn.";
        if (!dimensions) formErrors.dimensions = "Kích thước là bắt buộc.";
        if (!insuranceStatus) formErrors.insuranceStatus = "Tình trạng bảo hiểm là bắt buộc.";
        if (!registrationExpiryDate) formErrors.registrationExpiryDate = "Ngày hết hạn đăng ký là bắt buộc.";

        setErrors(formErrors);

        return Object.keys(formErrors).length === 0;
    };

    const createOrUpdateVehicle = async () => {
        if (!validateFormData()) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const formattedDate = `${formData.registrationExpiryDate}T00:00:00.000`;
            const url = vehicleId
                ? `${BASE_URl}/api/registerDriver/updateVehicle/${vehicleId}`
                : `${BASE_URl}/api/registerDriver/createNewVehicle`;

            const method = vehicleId ? "put" : "post";

            const response = await axios({
                method,
                url,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                data: { ...formData, registrationExpiryDate: formattedDate },
            });

            if (response.status === 200) {
                Alert.alert("Thông báo", "Thông tin xe đã được lưu.");
                setViewMode("list");
            } else {
                Alert.alert("Thông báo", response.data.message || "Có lỗi xảy ra.");
            }
        } catch (error) {
            console.log("Error: ", error.response?.status || error);
            handleLicenseError(error);
            //Alert.alert("Thông báo", error.response?.data?.message || "Không thể lưu thông tin xe.");
        } finally {
            setLoading(false);
        }
    };

    const renderList = () => (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Danh sách xe</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <>
                    {vehicles.length > 0 ? (
                        vehicles.map((vehicle, index) => (
                            <TouchableOpacity
                                key={vehicle.vehicleId}
                                style={styles.item}
                                onPress={() => handleSelectVehicle(vehicle, index)}
                            >
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>STT: </Text>{index + 1}
                                </Text>
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>Biển số: </Text>{vehicle.licensePlate}
                                </Text>
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>Loại xe: </Text>{vehicle.vehicleType}
                                </Text>
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>Hãng xe: </Text>{vehicle.make}
                                </Text>
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>Mẫu xe: </Text>{vehicle.model}
                                </Text>
                                <Text style={styles.itemText}>
                                    <Text style={styles.boldText}>Trọng tải: </Text>{vehicle.capacity}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>Không có xe nào trong danh sách.</Text>
                    )}
                    <TouchableOpacity style={styles.button} onPress={handleCreateNew}>
                        <Text style={styles.buttonText}>Tạo xe mới</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );

    const renderForm = () => (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>
                {vehicleId ? "Cập nhật thông tin xe" : "Tạo thông tin xe mới"}
            </Text>
            {Object.keys(formData).map((field) => (
                <View key={field}>
                    <Text style={styles.label}>
                        {field === "licensePlate" && "Biển số xe"}
                        {field === "vehicleType" && "Loại xe"}
                        {field === "make" && "Hãng xe"}
                        {field === "model" && "Mẫu xe"}
                        {field === "year" && "Năm sản xuất"}
                        {field === "capacity" && "Sức chứa"}
                        {field === "dimensions" && "Kích thước"}
                        {field === "insuranceStatus" && "Tình trạng bảo hiểm"}
                        {field === "registrationExpiryDate" && "Ngày hết hạn đăng ký"}
                    </Text>
                    {field === "registrationExpiryDate" ? (
                        <TouchableOpacity onPress={showDatePicker}>
                            <TextInput
                                style={[styles.input, errors[field] ? styles.inputError : null]}
                                placeholder="Chọn ngày"
                                value={formData[field]}
                                editable={false} // Disable manual editing
                            />
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            style={[styles.input, errors[field] ? styles.inputError : null]}
                            placeholder="Nhập thông tin"
                            value={formData[field]}
                            keyboardType={field === "year" || field === "capacity" ? "numeric" : "default"}
                            onChangeText={(value) => handleInputChange(field, value)}
                        />
                    )}
                    {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
                </View>
            ))}
            <TouchableOpacity style={styles.button} onPress={createOrUpdateVehicle}>
                <Text style={styles.buttonText}>
                    {vehicleId ? "Cập nhật" : "Tạo mới"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#aaa" }]} onPress={handleBackToList}>
                <Text style={styles.buttonText}>Quay lại danh sách</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={new Date(formData.registrationExpiryDate || Date.now())}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowPicker(false);
                        if (selectedDate) {
                            const formattedDate = selectedDate.toISOString().split("T")[0];
                            setFormData((prev) => ({ ...prev, registrationExpiryDate: formattedDate }));
                        }
                    }}
                />
            )}
        </ScrollView>
    );

    const showDatePicker = () => {
        setShowPicker(true); // Show the DatePicker
    };

    return viewMode === "list" ? renderList() : renderForm();
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    header: {
        paddingTop: 30,
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    item: {
        padding: 15,
        backgroundColor: "#f8f8f8",
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1, // Add border
        borderColor: "#ddd", // Border color
    },
    itemText: {
        fontSize: 18,
        color: "#333",
    },
    noDataText: {
        textAlign: "center",
        color: "#999",
    },
    label: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: "bold",
    },
    input: {
        height: 40,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingLeft: 10,
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        fontSize: 12,
        marginBottom: 10,
    },
    button: {
        backgroundColor: "#007AFF",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    boldText: {
        fontWeight: "bold",
    },
});

export default VehicleScreen;
