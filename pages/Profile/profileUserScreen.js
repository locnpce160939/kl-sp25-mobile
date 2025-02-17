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
    Platform,
    Image,
    Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";

const ProfileUserScreen = () => {
    const navigation = useNavigation();
    const [userDetails, setUserDetails] = useState({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        profilePicture: null,
        status: "",
    });
    const [loading, setLoading] = useState(false);
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token)
                throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const {
                data: { data: userData },
            } = await axios.get(`${BASE_URl}/api/account/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (userData) {
                setUserDetails(userData);
            }
        } catch (error) {
            handleUserError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserError = async (error) => {
        if (error.response?.status === 401) {
            Alert.alert(
                "Phiên đăng nhập đã hết hạn",
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
        } else {
            // Only alert if userDetails is empty
            if (!userDetails || !userDetails.username) {
                Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
            }
        }
    };

    const handleInputChange = (field, value) => {
        setUserDetails((prev) => ({ ...prev, [field]: value }));
    };

    const updateUserDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");

            const updatedDetails = {
                fullName: userDetails.fullName,
                phone: userDetails.phone,
            };

            const { status } = await axios.put(
                `${BASE_URl}/api/account/editProfile`,
                updatedDetails,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                }
            );

            if (status === 200) {
                Alert.alert("Thành công", "Cập nhật thông tin thành công.");
            } else {
                Alert.alert("Lỗi", "Không thể cập nhật thông tin.");
            }
        } catch (error) {
            handleUserError(error);
        } finally {
            setLoading(false);
        }
    };

    const selectProfilePicture = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Lỗi", "Cần cho phép truy cập thư viện ảnh để sử dụng tính năng này!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setUserDetails((prev) => ({
                ...prev,
                profilePicture: result.assets[0].uri,
            }));
        }
    };

    const renderInputField = (label, field, placeholder, icon) => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
                <Text style={styles.label}>{label}</Text>
            </View>
            <TextInput
                style={[
                    styles.input,
                    (field === "username" || field === "email") && styles.disabledInput
                ]}
                value={userDetails[field]}
                onChangeText={(text) => handleInputChange(field, text)}
                placeholder={placeholder}
                placeholderTextColor={"#999"}
                editable={field === "fullName" || field === "phone"}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeContainer}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
                <View style={styles.headerRight} />
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.profileHeader}>
                        <View style={styles.profilePictureContainer}>
                            {userDetails.profilePicture ? (
                                <Image
                                    source={{ uri: userDetails.profilePicture }}
                                    style={styles.profilePicture}
                                />
                            ) : (
                                <View style={styles.defaultProfilePicture}>
                                    <Ionicons name="person" size={50} color="#fff" />
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.editPictureButton}
                                onPress={selectProfilePicture}
                            >
                                <Ionicons name="camera" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userName}>{userDetails.fullName || "Chưa cập nhật"}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {renderInputField("Tên đăng nhập", "username", "Nhập tên đăng nhập", "person-outline")}
                        {renderInputField("Họ tên", "fullName", "Nhập họ tên", "card-outline")}
                        {renderInputField("Email", "email", "Nhập email", "mail-outline")}
                        {renderInputField("Số điện thoại", "phone", "Nhập số điện thoại", "call-outline")}

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={updateUserDetails}
                        >
                            <Text style={styles.saveButtonText}>Cập nhật</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        ...Platform.select({
            ios: {
                paddingTop: 20,
            },
            android: {
                paddingTop: 15,
            },
        }),
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#000",
    },
    headerRight: {
        width: 44,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        flexGrow: 1,
    },
    profileHeader: {
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    profilePictureContainer: {
        position: "relative",
        marginBottom: 16,
    },
    profilePicture: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: "#fff",
    },
    defaultProfilePicture: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },
    editPictureButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#007AFF",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },
    userName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 4,
    },
    formContainer: {
        padding: 16,
        backgroundColor: "#fff",
        marginTop: 12,
    },
    inputContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    input: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
        color: "#000",
        borderWidth: 1,
        borderColor: "#ccc",
        marginBottom: 8,
    },
    disabledInput: {
        backgroundColor: "#f0f0f0",
        color: "#666",
        borderColor: "#bbb",
        borderWidth: 1,
        borderStyle: "dotted",
    },
    saveButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
        ...Platform.select({
            ios: {
                shadowColor: "#007AFF",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default ProfileUserScreen;
