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
    Platform,
    Image,
} from "react-native";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

const VehicleScreen = () => {
    // State và biến
    const [viewMode, setViewMode] = useState("list");
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vehicleId, setVehicleId] = useState(null);
    const { logout } = useContext(AuthContext);
    const navigation = useNavigation();
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
        frontView: null, // Ảnh mặt trước
        backView: null,  // Ảnh mặt sau
    });
    const [errors, setErrors] = useState({});
    const [showPicker, setShowPicker] = useState(false);

    // Effect để fetch danh sách xe khi vào chế độ list
    useEffect(() => {
        if (viewMode === "list") fetchVehicleList();
    }, [viewMode]);

    // Yêu cầu quyền truy cập camera
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Lỗi", "Cần cấp quyền truy cập camera để sử dụng tính năng này!");
            }
        })();
    }, []);

    // Hàm fetch danh sách xe
    const fetchVehicleList = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const response = await axios.get(`${BASE_URl}/api/registerDriver/vehicle`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            });

            const vehicleData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
            setVehicles(vehicleData);
        } catch (error) {
            handleVehicleError(error);
            console.log("Không thể tải danh sách xe.", error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };
    // Hàm xử lý lỗi
    const handleVehicleError = async (error) => {
        if (error.response?.status === 401) {
            Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại.", [
                { text: "OK", onPress: async () => { await logout(); } },
            ], { cancelable: false });
        } else if (error.response?.data?.message === "Vehicle not found") {
            console.log("Không tìm thấy phương tiện.");
        } else if (error.response?.status === 400) {
            Alert.alert(error.response?.data?.message);
            console.log("Error fetching Vehicle details:", error);
        } else {
            Alert.alert("Something went wrong", error);
            console.log("Error fetching Vehicle details:", error);
        }
    };

    // Hàm chọn ảnh
    const selectImage = async (field) => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });

            if (!result.canceled) {
                setFormData((prev) => ({
                    ...prev,
                    [field]: result.assets[0].uri,
                }));
                setErrors((prev) => ({ ...prev, [field]: "" }));
            }
        } catch (error) {
            Alert.alert("Lỗi", "Không thể chọn ảnh");
            console.error("Image picker error:", error);
        }
    };

    // Hàm xử lý thay đổi input
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    // Hàm chọn xe từ danh sách
    const handleSelectVehicle = (vehicle) => {
        setVehicleId(vehicle.vehicleId);
        setFormData({
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year.toString(),
            capacity: vehicle.capacity.toString(),
            dimensions: vehicle.dimensions,
            insuranceStatus: vehicle.insuranceStatus,
            registrationExpiryDate: vehicle.registrationExpiryDate.split("T")[0],
            frontView: vehicle.frontView,
            backView: vehicle.backView
        });
        setViewMode("form");
    };

    // Hàm tạo mới xe
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

    // Hàm quay lại danh sách
    const handleBackToList = () => {
        setViewMode("list");
    };

    // Hàm kiểm tra hợp lệ dữ liệu
    const validateFormData = () => {
        const {
            licensePlate,
            vehicleType,
            make,
            model,
            year,
            capacity,
            dimensions,
            insuranceStatus,
            registrationExpiryDate,
        } = formData;

        let formErrors = {};

        if (!licensePlate) formErrors.licensePlate = "Biển số xe là bắt buộc.";
        if (!vehicleType) formErrors.vehicleType = "Loại xe là bắt buộc.";
        if (!make) formErrors.make = "Hãng xe là bắt buộc.";
        if (!model) formErrors.model = "Mẫu xe là bắt buộc.";
        if (!year) formErrors.year = "Năm sản xuất là bắt buộc.";

        const currentYear = new Date().getFullYear();
        const manufacturingYear = parseInt(year);
        if (isNaN(manufacturingYear)) {
            formErrors.year = "Năm sản xuất phải là số.";
        } else if (currentYear - manufacturingYear > 25) {
            formErrors.year = "Xe không được quá 25 năm tuổi.";
        }
        if (!capacity) formErrors.capacity = "Sức chứa là bắt buộc.";
        if (capacity < 1 || capacity > 15) formErrors.capacity = "Sức chứa phải từ 1 đến 15 tấn.";
        if (!dimensions) formErrors.dimensions = "Kích thước là bắt buộc.";
        if (!insuranceStatus) formErrors.insuranceStatus = "Tình trạng bảo hiểm là bắt buộc.";
        if (!registrationExpiryDate) formErrors.registrationExpiryDate = "Ngày hết hạn đăng ký là bắt buộc.";

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    // Hàm tạo hoặc cập nhật xe
    const createOrUpdateVehicle = async () => {
        if (!validateFormData()) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại");

            const formDataToSend = new FormData();

            const requestDTO = JSON.stringify({
                vehicleId: vehicleId || null,
                licensePlate: formData.licensePlate,
                vehicleType: formData.vehicleType,
                make: formData.make,
                model: formData.model,
                year: parseInt(formData.year),
                capacity: parseInt(formData.capacity),
                dimensions: formData.dimensions,
                insuranceStatus: formData.insuranceStatus,
                registrationExpiryDate: `${formData.registrationExpiryDate}T00:00:00.000`
            });

            formDataToSend.append("requestDTO", requestDTO);

            if (formData.frontView) {
                formDataToSend.append("frontFile", {
                    uri: formData.frontView,
                    type: "image/jpeg",
                    name: "front.jpg"
                });
            }

            if (formData.backView) {
                formDataToSend.append("backFile", {
                    uri: formData.backView,
                    type: "image/jpeg",
                    name: "back.jpg"
                });
            }

            const response = await axios({
                method: vehicleId ? 'put' : 'post',
                url: `${BASE_URl}/api/registerDriver/vehicle`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                data: formDataToSend,
                transformRequest: (data, headers) => {
                    return data;
                },
            });

            if (response.status === 200) {
                Alert.alert("Thông báo", "Thông tin xe đã được lưu");
                setViewMode("list");
            }
        } catch (error) {
            handleVehicleError(error);
        } finally {
            setLoading(false);
        }
    };

    // Render danh sách xe
    const renderList = () => (
        <View style={styles.listContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#000" style={styles.backIcon} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Vehicle</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                ) : (
                    <>
                        {vehicles.length > 0 ? (
                            vehicles.map((vehicle, index) => (
                                <View key={vehicle.vehicleId} style={styles.vehicleItem}>
                                    {vehicle.frontView ? (
                                        <Image
                                            source={{ uri: vehicle.frontView }}
                                            style={styles.vehicleIcon}
                                        />
                                    ) : (
                                        <Ionicons name="car" size={40} color="#007AFF" style={styles.vehicleIcon} />
                                    )}
                                    <View style={styles.vehicleInfo}>
                                        <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>
                                        <Text style={styles.vehicleDetail}>Ngày hết hạn: {new Date(vehicle.registrationExpiryDate).toLocaleDateString()}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.manageButton}
                                        onPress={() => handleSelectVehicle(vehicle)}
                                    >
                                        <Text style={styles.manageButtonText}>Manage</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>Không có xe nào trong danh sách.</Text>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Floating Add Button */}
            <TouchableOpacity style={styles.floatingButton} onPress={handleCreateNew}>
                <Ionicons name="add" size={40} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    //Nhập dữ liệu 
    const inputFields = [
        { field: "licensePlate", label: "Biển số xe" },
        { field: "vehicleType", label: "Loại xe" },
        { field: "make", label: "Hãng xe" },
        { field: "model", label: "Mẫu xe" },
        { field: "year", label: "Năm sản xuất" },
        { field: "capacity", label: "Sức chứa" },
        { field: "dimensions", label: "Kích thước" },
        { field: "insuranceStatus", label: "Tình trạng bảo hiểm" },
        { field: "registrationExpiryDate", label: "Ngày hết hạn đăng ký" },
    ];

    const renderImageSection = (field, label) => (
        <View style={styles.imageContainer}>
            <Text style={styles.label}>{label}</Text>
            {formData[field] ? (
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: formData[field] }} // Sử dụng Image để hiển thị ảnh
                        style={styles.vehicleImage}
                    />
                    <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={() => selectImage(field)}
                    >
                        <Text style={styles.retakeButtonText}>Chụp lại</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.uploadButton, errors[field] && styles.inputError]}
                    onPress={() => selectImage(field)}
                >
                    <Ionicons name="camera" size={24} color="#007AFF" />
                    <Text style={styles.uploadButtonText}>Chụp ảnh</Text>
                </TouchableOpacity>
            )}
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
    );

    // Render form nhập thông tin xe
    const renderForm = () => (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackToList}>
                    <Ionicons name="arrow-back" size={24} color="#000" style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {vehicleId ? "Cập nhật thông tin xe" : "Tạo thông tin xe mới"}
                </Text>
            </View>

            {/* Các trường nhập liệu */}
            {inputFields.map(({ field, label }) => (
                <View key={field} style={styles.inputContainer}>
                    <Text style={styles.label}>{label}</Text>
                    {field === "registrationExpiryDate" ? (
                        <TouchableOpacity onPress={() => setShowPicker(true)}>
                            <TextInput
                                style={[styles.input, errors[field] && styles.inputError]}
                                placeholder="Chọn ngày"
                                value={formData[field]}
                                editable={false}
                            />
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            style={[styles.input, errors[field] && styles.inputError]}
                            placeholder={`Nhập ${label.toLowerCase()}`}
                            value={formData[field]}
                            keyboardType={field === "year" || field === "capacity" ? "numeric" : "default"}
                            onChangeText={(text) => handleInputChange(field, text)}
                        />
                    )}
                    {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
                </View>
            ))}

            {/* Ảnh mặt trước */}
            {renderImageSection("frontView", "Ảnh mặt trước")}

            {/* Ảnh mặt sau */}
            {renderImageSection("backView", "Ảnh mặt sau")}

            <TouchableOpacity style={styles.button} onPress={createOrUpdateVehicle}>
                <Text style={styles.buttonText}>{vehicleId ? "Cập nhật" : "Tạo mới"}</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={new Date(formData.registrationExpiryDate || Date.now())}
                    mode="date"
                    display="spinner"
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
    // Render giao diện chính
    return viewMode === "list" ? renderList() : renderForm();
};

const styles = StyleSheet.create({
    listContainer: {
        flex: 1,
        position: "relative",
    },
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#f9f9f9",
    },
    header: {
        marginTop: Platform.OS === "ios" ? 50 : 30,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backIcon: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
    },
    vehicleItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ddd",
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
    vehicleIcon: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    vehicleDetail: {
        fontSize: 14,
        color: "#666",
    },
    manageButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    manageButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    noDataText: {
        textAlign: "center",
        color: "#999",
        fontSize: 16,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 5,
    },
    input: {
        height: 40,
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        fontSize: 12,
        marginTop: 5,
    },
    button: {
        backgroundColor: "#007AFF",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    floatingButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "#007AFF",
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    loader: {
        marginTop: 20,
    },
    uploadButton: {
        backgroundColor: "#f0f0f0",
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#007AFF",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    uploadButtonText: {
        color: "#007AFF",
        fontSize: 16,
        marginLeft: 10,
        fontWeight: "bold",
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
        fontWeight: "bold",
    },
    vehicleImage: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    imageContainer: {
        marginBottom: 20,
    },
    imageWrapper: {
        alignItems: "center",
    },
});

export default VehicleScreen;