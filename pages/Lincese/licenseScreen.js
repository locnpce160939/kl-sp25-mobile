import React, { useState, useEffect, useContext } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from "../../contexts/AuthContext";

const LicenseScreen = () => {
    const [licenseDetails, setLicenseDetails] = useState({
        licenseNumber: "",
        licenseType: "",
        issuedDate: "",
        expiryDate: "",
        issuingAuthority: "",
    });
    const [licenseId, setLicenseId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const [errors, setErrors] = useState({});
    const { logout } = useContext(AuthContext);

    const fetchLicenseDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const { data: { data: licenseData } } = await axios.get(`${BASE_URl}/api/registerDriver/license/getByAccountId`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (licenseData) {
                setLicenseId(licenseData.licenseId);
                setLicenseDetails({
                    ...licenseData,
                    issuedDate: new Date(licenseData.issuedDate).toISOString(),
                    expiryDate: new Date(licenseData.expiryDate).toISOString(),
                });
            } else {
                setLicenseId(null);
                resetLicenseDetails();
            }
        } catch (error) {
            handleLicenseError(error);
        } finally {
            setLoading(false);
        }
    };

    const resetLicenseDetails = () => {
        setLicenseDetails({
            licenseNumber: "",
            licenseType: "",
            issuedDate: "",
            expiryDate: "",
            issuingAuthority: "",
        });
    };

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
        } else if (error.response?.data?.message === "License not found") {
            setLicenseId(null);
            resetLicenseDetails();
            console.log("Không tìm thấy giấy phép.");
        } else {
            console.log("Error fetching license details:", error);
        }
    };

    useEffect(() => {
        fetchLicenseDetails();
    }, []);

    const validateInputs = () => {
        const newErrors = {};

        if (!licenseDetails.licenseNumber.trim()) {
            newErrors.licenseNumber = "Số giấy phép là bắt buộc.";
        }
        if (!licenseDetails.licenseType.trim()) {
            newErrors.licenseType = "Loại giấy phép là bắt buộc.";
        }
        if (!licenseDetails.issuingAuthority.trim()) {
            newErrors.issuingAuthority = "Cơ quan cấp là bắt buộc.";
        }
        if (!licenseDetails.issuedDate) {
            newErrors.issuedDate = "Ngày cấp là bắt buộc.";
        }
        if (!licenseDetails.expiryDate) {
            newErrors.expiryDate = "Ngày hết hạn là bắt buộc.";
        }
        if (
            licenseDetails.issuedDate &&
            licenseDetails.expiryDate &&
            new Date(licenseDetails.expiryDate) <= new Date(licenseDetails.issuedDate)
        ) {
            newErrors.expiryDate = "Ngày hết hạn phải sau ngày cấp.";
        }

        console.log("Validation Errors:", newErrors);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateLicenseDetails = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const updatedDetails = {
                ...licenseDetails,
                issuedDate: new Date(licenseDetails.issuedDate).toISOString(),
                expiryDate: new Date(licenseDetails.expiryDate).toISOString(),
            };

            const { status } = await axios.put(
                `${BASE_URl}/api/registerDriver/updateLicense/${licenseId}`,
                updatedDetails,
                {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                }
            );

            if (status === 200) {
                Alert.alert("Thành công", "Cập nhật giấy phép thành công.");
            } else {
                Alert.alert("Lỗi", "Không thể cập nhật giấy phép.");
            }
        } catch (error) {
            handleLicenseError(error);
        } finally {
            setLoading(false);
        }
    };

    const createNewLicense = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const newLicenseDetails = {
                ...licenseDetails,
                issuedDate: new Date(licenseDetails.issuedDate).toISOString(),
                expiryDate: new Date(licenseDetails.expiryDate).toISOString(),
            };

            const { data, status } = await axios.post(
                `${BASE_URl}/api/registerDriver/createNewLicense`,
                newLicenseDetails,
                {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                }
            );

            if (status === 200) {
                Alert.alert("Thành công", "Tạo giấy phép thành công.");
                setLicenseId(data.data.licenseId);
            } else {
                Alert.alert("Lỗi", "Không thể tạo giấy phép.");
            }
        } catch (error) {
            handleLicenseError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setLicenseDetails((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const handleDateChange = (event, selectedDate) => {
        if (event.type === "set") {
            const currentDate = selectedDate || new Date();
            if (
                currentField === "expiryDate" &&
                licenseDetails.issuedDate &&
                currentDate < new Date(licenseDetails.issuedDate)
            ) {
                Alert.alert("Lỗi", "Ngày hết hạn phải sau ngày cấp.");
                setShowDatePicker(false);
                return;
            }

            setLicenseDetails((prev) => ({
                ...prev,
                [currentField]: currentDate.toISOString(),
            }));
        }
        setShowDatePicker(false);
    };

    const renderInputField = (label, field, placeholder) => (
        <View>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, errors[field] && styles.inputError]}
                value={licenseDetails[field]}
                onChangeText={(text) => handleInputChange(field, text)}
                placeholder={placeholder}
                placeholderTextColor={"#ccc"}
            />
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
    );

    const renderDateField = (label, field) => (
        <View>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                onPress={() => {
                    setCurrentField(field);
                    setShowDatePicker(true);
                }}
            >
                <TextInput
                    style={[styles.input, errors[field] && styles.inputError]}
                    value={licenseDetails[field] ? new Date(licenseDetails[field]).toLocaleDateString() : ""}
                    editable={false}
                    placeholder={"Chọn ngày"}
                    placeholderTextColor={"#ccc"}
                />
            </TouchableOpacity>
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" />
                ) : (
                    <>
                        <Text style={styles.formTitle}>Hồ sơ Giấy Phép Lái Xe</Text>
                        {renderInputField("Số giấy phép", "licenseNumber", "123123123123")}
                        {renderInputField("Loại giấy phép", "licenseType", "B1,C,D,E,....")}
                        {renderDateField("Ngày cấp", "issuedDate")}
                        {renderDateField("Ngày hết hạn", "expiryDate")}
                        {renderInputField("Cơ quan cấp", "issuingAuthority", "GTVT Can Tho,GTVT Soc Trang")}

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={licenseId ? updateLicenseDetails : createNewLicense}
                        >
                            <Text style={styles.saveButtonText}>
                                {licenseId ? "Cập nhật" : "Tạo mới giấy phép"}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {showDatePicker && (
                    <DateTimePicker
                        value={currentField === "issuedDate"
                            ? (licenseDetails.issuedDate ? new Date(licenseDetails.issuedDate) : new Date())
                            : (licenseDetails.expiryDate ? new Date(licenseDetails.expiryDate) : new Date())}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#f9f9f9",
        paddingTop: 50,
    },
    container: {
        flexGrow: 1,
        padding: 20,
    },
    formTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#007AFF",
        textAlign: "center",
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: "#333",
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        fontSize: 12,
        marginBottom: 10,
    },
    saveButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    }
});

export default LicenseScreen;