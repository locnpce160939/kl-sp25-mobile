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
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';

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

    const handleLicenseError = (error) => {
        if (error.response?.data?.message === "License not found") {
            setLicenseId(null);
            resetLicenseDetails();
            Alert.alert("Thông báo", "Không tìm thấy giấy phép. Vui lòng tạo giấy phép mới.");
        } else {
            console.error("Error fetching license details:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu giấy phép.");
        }
    };

    useEffect(() => {
        fetchLicenseDetails();
    }, []);

    const validateInputs = () => {
        if (!licenseDetails.licenseNumber.trim()) {
            Alert.alert("Validation Error", "Số giấy phép là bắt buộc.");
            return false;
        }
        if (!licenseDetails.licenseType.trim()) {
            Alert.alert("Validation Error", "Loại giấy phép là bắt buộc.");
            return false;
        }
        if (!licenseDetails.licenseDetails.trim()) {
            Alert.alert("Validation Error", "Cơ quan cấp là bắt buộc.");
            return false;
        }
        return true;
    };

    const updateLicenseDetails = async () => {
        if (!licenseId) {
            Alert.alert("No License Found", "Bạn chưa có giấy phép, vui lòng tạo mới.");
            return createNewLicense();
        }

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

            console.log("Sending Updated Details:", updatedDetails);

            const { status } = await axios.put(
                `${BASE_URl}/api/registerDriver/updateLicense/${licenseId}`,
                updatedDetails,
                {
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                }
            );

            if (status === 200) {
                Alert.alert("Success", "Cập nhật giấy phép thành công.");
            } else {
                Alert.alert("Error", "Không thể cập nhật giấy phép.");
            }
        } catch (error) {
            console.error("Error updating license details:", error.response?.data || error.message);
            Alert.alert("Error", error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật giấy phép.");
        } finally {
            setLoading(false);
        }
    };

    const createNewLicense = async () => {
        if (licenseId) {
            Alert.alert("Cảnh báo", "Giấy phép đã tồn tại. Bạn có chắc muốn tạo giấy phép mới không?", [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", onPress: proceedWithLicenseCreation },
            ]);
        } else {
            await proceedWithLicenseCreation(); // Tạo mới khi không có `licenseId`
        }
    };

    const proceedWithLicenseCreation = async () => {
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

            const { data, status } = await axios.post(`${BASE_URl}/api/registerDriver/createNewLicense`, newLicenseDetails, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });

            status === 200
                ? (Alert.alert("Thành công", "Tạo giấy phép thành công."), setLicenseId(data.data.licenseId))
                : Alert.alert("Lỗi", "Không thể tạo giấy phép.");
        } catch (error) {
            console.error("Error creating new license:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Đã xảy ra lỗi khi tạo giấy phép mới.");
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes
    const handleInputChange = (field, value) => {
        setLicenseDetails((prev) => ({ ...prev, [field]: value }));
    };

    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date();
        setShowDatePicker(false);
        if (currentField === "issuedDate") {
            setLicenseDetails((prev) => ({ ...prev, issuedDate: currentDate.toISOString() }));
        } else if (currentField === "expiryDate") {
            setLicenseDetails((prev) => ({ ...prev, expiryDate: currentDate.toISOString() }));
        }
    };

    const renderLicenseForm = () => (
        <>
            <Text style={styles.label}>Số giấy phép *</Text>
            <TextInput
                style={styles.input}
                value={licenseDetails.licenseNumber}
                onChangeText={(text) => handleInputChange("licenseNumber", text)}
                placeholder="Nhập số giấy phép"
            />

            <Text style={styles.label}>Loại giấy phép *</Text>
            <TextInput
                style={styles.input}
                value={licenseDetails.licenseType}
                onChangeText={(text) => handleInputChange("licenseType", text)}
                placeholder="Nhập loại giấy phép"
            />

            <Text style={styles.label}>Ngày cấp *</Text>
            <TouchableOpacity onPress={() => { setCurrentField("issuedDate"); setShowDatePicker(true); }}>
                <TextInput
                    style={styles.input}
                    value={licenseDetails.issuedDate ? new Date(licenseDetails.issuedDate).toLocaleDateString() : ""}
                    editable={false}
                    placeholder="Chọn ngày cấp"
                />
            </TouchableOpacity>

            <Text style={styles.label}>Ngày hết hạn *</Text>
            <TouchableOpacity onPress={() => { setCurrentField("expiryDate"); setShowDatePicker(true); }}>
                <TextInput
                    style={styles.input}
                    value={licenseDetails.expiryDate ? new Date(licenseDetails.expiryDate).toLocaleDateString() : ""}
                    editable={false}
                    placeholder="Chọn ngày hết hạn"
                />
            </TouchableOpacity>

            <Text style={styles.label}>Cơ quan cấp *</Text>
            <TextInput
                style={styles.input}
                value={licenseDetails.issuingAuthority}
                onChangeText={(text) => handleInputChange("issuingAuthority", text)}
                placeholder="Nhập cơ quan cấp"
            />
        </>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <>
                    {licenseId ? (
                        <>
                            {renderLicenseForm()}
                            <TouchableOpacity style={styles.saveButton} onPress={updateLicenseDetails}>
                                <Text style={styles.saveButtonText}>Cập nhật</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {renderLicenseForm()}
                            <TouchableOpacity style={styles.createButton} onPress={createNewLicense}>
                                <Text style={styles.createButtonText}>Tạo mới giấy phép</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </>
            )}

            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: "#333",
    },
    input: {
        backgroundColor: "#f5f5f5",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: "#007AFF",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    createButton: {
        backgroundColor: "#28a745",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    createButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default LicenseScreen;