import axios from "axios";
import React, { createContext, useEffect, useState } from "react";
import { BASE_URL } from "../configUrl";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import Navigation from "../navigation/Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DriverIdentificationScreen from "../pages/Indentification/DriverIdentificationScreen";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlash, setIsPlash] = useState(false);
  const [userInfo, setUserInfo] = useState({});

  // ================================== Register ========================================
  const register = async (
    username,
    password,
    email,
    phone,
    role,
    navigation
  ) => {
    try {
      setIsLoading(true);

      const res = await axios.post(`${BASE_URL}/api/account/register/send`, {
        username,
        password,
        email,
        phone,
        role,
      });
      // Kiểm tra status code
      if (res.status === 200) {
        const userInfo = res.data;
        if (userInfo.code === 200) {
          setIsLoading(false);
          navigation.navigate("ConfirmOTP", {
            username,
            password,
            email,
            phone,
            role,
            navigation,
          });
        } else {
          Alert.alert("Registration Error", userInfo.message);
        }
      }
    } catch (error) {
      const message = error.response.data.message;
      Alert.alert("Registe failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  //-----------------------------getWards--------------------------------------------------------
  const getWards = async (districtId) => {
    if (!districtId) {
      Alert.alert("Lỗi", "Vui lòng chọn quận/huyện trước.");
      return [];
    }

    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy access token. Vui lòng đăng nhập lại."
        );
        return [];
      }

      const response = await axios.get(
        `${BASE_URL}/api/location/wards/${districtId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.status === 200 && response.data.code === 200) {
        console.log("Danh sách ấp/xã nhận được:", response.data.data);
        return response.data.data.map((wards) => ({
          fullName: wards.fullName,
          id: wards.code,
        }));
      } else {
        Alert.alert(
          "Lỗi",
          response.data.message || "Không thể lấy danh sách ấp/xã."
        );
        return [];
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ấp/xã:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi không xác định khi lấy danh sách ấp/xã.";
      Alert.alert("Lỗi", errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  //-----------------------------getDistricts ----------------------------------------------------
  const getDistricts = async (provinceId) => {
    if (!provinceId) {
      Alert.alert("Lỗi", "Vui lòng chọn tỉnh/thành phố trước.");
      return [];
    }

    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy access token. Vui lòng đăng nhập lại."
        );
        return [];
      }

      const response = await axios.get(
        `${BASE_URL}/api/location/districts/${provinceId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.status === 200 && response.data.code === 200) {
        return response.data.data.map((district) => ({
          fullName: district.fullName,
          id: district.code,
        }));
      } else {
        Alert.alert(
          "Lỗi",
          response.data.message || "Không thể lấy danh sách quận/huyện."
        );
        return [];
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách quận/huyện:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi không xác định khi lấy danh sách quận/huyện.";
      Alert.alert("Lỗi", errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  //----------------------------getProvinces -----------------------------------------------------
  const getProvinces = async () => {
    try {
      setIsLoading(true); // Bật trạng thái loading
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        Alert.alert("Error", "No access token found. Please login again.");
        return [];
      }

      const response = await axios.get(`${BASE_URL}/api/location/provinces`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 200 && response.data.code === 200) {
        // Lấy danh sách provinces và đảm bảo có key `fullName`
        return response.data.data.map((province) => ({
          id: province.code,
          fullName: province.fullName, // Sử dụng fullName
        }));
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to fetch provinces."
        );
        return [];
      }
    } catch (error) {
      console.error("Error fetching provinces:", error);
      Alert.alert(
        "Error",
        "An unknown error occurred while fetching provinces."
      );
      return [];
    } finally {
      setIsLoading(false); // Tắt trạng thái loading
    }
  };

  //------------------------getDriverIdentificationByAccountId-------------------------------------------
  const getDriverIdentificationById = async () => {
    try {
      setIsLoading(true);

      // Lấy thông tin user từ AsyncStorage
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

      // Gọi API với accountId
      const res = await axios.get(
        `${BASE_URL}/api/registerDriver/identification/getByAccountId`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (res.status === 200 && res.data.code === 200) {
        return res.data.data; // Trả về dữ liệu từ API
      } else {
        Alert.alert(
          "Error",
          res.data.message || "Failed to fetch identification details."
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching identification by ID:", error);
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

  // ================================== Create Driver Identification ========================================

  const createDriverIdentification = async (formData, navigation) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        throw new Error("User information not found");
      }

      const parsedUserInfo = JSON.parse(userInfo);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      // Validate required fields
      const requiredFields = [
        "idNumber",
        "fullName",
        "gender",
        "birthday",
        "country",
        "permanentAddressWard",
        "permanentAddressDistrict",
        "permanentAddressProvince",
        "permanentStreetAddress",
        "issueDate",
        "expiryDate",
        "issuedBy"
      ];

      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Create FormData object
      const formDataToSubmit = new FormData();

      // Format dates properly
      const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00:00`;
        } catch (error) {
          console.warn("Error formatting date:", error);
          return "";
        }
      };

      // Append all fields to FormData
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          if (key === 'birthday' || key === 'issueDate' || key === 'expiryDate') {
            formDataToSubmit.append(key, formatDate(formData[key]));
          } else if (key === 'gender') {
            formDataToSubmit.append(key, formData[key] === "Nam" ? "Male" : "Female");
          } else if (key === 'frontFile' || key === 'backFile') {
            if (formData[key]) {
              formDataToSubmit.append(key, {
                uri: formData[key].uri,
                type: 'image/jpeg',
                name: `${key}.jpeg`
              });
            }
          } else {
            formDataToSubmit.append(key, formData[key]);
          }
        }
      });

      // Log the form data being sent
      console.log("Sending form data:", formData);

      const response = await axios.post(
        `${BASE_URL}/api/registerDriver/identification`,
        formDataToSubmit,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data) {
        // Update local storage with new identification data
        const updatedUserInfo = JSON.parse(userInfo);
        updatedUserInfo.driverIdentification = response.data;
        await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
        
        // Navigate back to profile
        navigation.navigate("Profile");
      }
    } catch (error) {
      console.error("Error creating driver identification:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ================================== ConfirmOTP ========================================
  const confirmOtp = (
    username,
    password,
    email,
    phone,
    role,
    otp,
    navigation
  ) => {
    setIsLoading(true);
    return axios
      .post(`${BASE_URL}/api/account/register/confirm`, {
        username,
        password,
        email,
        phone,
        role,
        otp,
      })
      .then((res) => {
        const userInfo = res.data;
        console.log(userInfo);
        if (userInfo.code === 200) {
          setIsLoading(false);
          Alert.alert("Register successfully");
          navigation.navigate("Login");
        } else {
          setIsLoading(false);
          Alert.alert("Something went wrong");
        }
      })
      .catch((e) => {
        setIsLoading(false);
        console.error(`Registration failed: ${e}`);
        throw e;
      });
  };

  // ================================== Login ========================================

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      const res = await axios.post(`${BASE_URL}/api/auth`, {
        username,
        password,
      });

      if (res.data.code === 200) {
        const user = res.data;
        setUserInfo(user);
        console.log(userInfo);
        AsyncStorage.setItem("userInfo", JSON.stringify(user));
        AsyncStorage.setItem("token", user.data.access_token);
        setIsLoading(false);
        Alert.alert("Login successfully", res.data.message);
      } else {
        setIsLoading(false);
        Alert.alert("Error", res.data.message);
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Login error:", error);
      Alert.alert("Error", error.response.data.message);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsPlash(true);
      let userInfo = await AsyncStorage.getItem("userInfo");
      userInfo = JSON.parse(userInfo);
      if (userInfo) {
        setUserInfo(userInfo);
      }
      setIsPlash(false);
    } catch (error) {
      setIsPlash(false);
      console.log(error);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);
  //=================================== logout =============================================================
  const logout = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem("userInfo");
      setUserInfo({});
      Alert.alert("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ================================== Forgot Pass ========================================

  const forgotPass = (email, navigation) => {
    setIsLoading(true);
    return axios
      .post(`${BASE_URL}/api/account/forgotSend`, {
        email,
      })
      .then((res) => {
        const userInfo = res.data;
        if (userInfo.code === 200) {
          setIsLoading(false);
          navigation.navigate("NewPass", { email });
          console.log("Success");
        } else {
          setIsLoading(false);
          Alert.alert("Something went wrong");
        }
      })
      .catch((e) => {
        setIsLoading(false);
        console.error(`Forgotpass failed: ${e}`);
        throw e; // Để thông báo lỗi nếu cần
      });
  };

  // ================================== New Pass ========================================

  const newpass = (email, otp, newPassword, confirmPassword, navigation) => {
    console.log(typeof otp);
    setIsLoading(true);
    return axios
      .post(`${BASE_URL}/api/account/forgotConfirm`, {
        email,
        otp,
        newPassword,
        confirmPassword,
      })
      .then((res) => {
        const userInfo = res.data;

        if (userInfo.code === 200) {
          setIsLoading(false);
          Alert.alert("Change password successfully");
          navigation.navigate("Login");
        } else {
          setIsLoading(false);
          Alert.alert("Something went wrong");
        }
      })
      .catch((e) => {
        setIsLoading(false);
        Alert.alert("Error", e.response.data.message);
      });
  };
    // ================================== Update Driver Identification ========================================
    const updateDriverIdentification = async (formData) => {
      if (isLoading) return;
  
      setIsLoading(true);
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (!userInfoString) {
          Alert.alert(
            "Lỗi",
            "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
          );
          return;
        }
  
        const parsedUserInfo = JSON.parse(userInfoString);
        const accessToken = parsedUserInfo?.data?.access_token;
  
        if (!accessToken || typeof accessToken !== "string") {
          Alert.alert("Lỗi", "Token không hợp lệ. Vui lòng đăng nhập lại.");
          return;
        }
  
        const formDataToSend = new FormData();
  
        if (formData.frontFile) {
          formDataToSend.append("frontFile", {
            uri: formData.frontFile.uri,
            type: "image/jpeg",
            name: "front.jpeg",
          });
        }
  
        if (formData.backFile) {
          formDataToSend.append("backFile", {
            uri: formData.backFile.uri,
            type: "image/jpeg",
            name: "back.jpeg",
          });
        }
  
        const requestDTO = {
          idNumber: formData.idNumber,
          fullName: formData.fullName,
          gender: formData.gender,
          birthday: formData.birthday,
          country: formData.country,
          permanentAddressWard: formData.permanentAddressWard,
          permanentAddressDistrict: formData.permanentAddressDistrict,
          permanentAddressProvince: formData.permanentAddressProvince,
          permanentStreetAddress: formData.permanentStreetAddress,
          temporaryAddressWard: formData.temporaryAddressWard,
          temporaryAddressDistrict: formData.temporaryAddressDistrict,
          temporaryAddressProvince: formData.temporaryAddressProvince,
          temporaryStreetAddress: formData.temporaryStreetAddress,
          issueDate: formData.issueDate,
          expiryDate: formData.expiryDate,
          issuedBy: formData.issuedBy,
        };
  
        formDataToSend.append("requestDTO", JSON.stringify(requestDTO));
  
        const response = await axios.put(
          `${BASE_URL}/api/registerDriver/identification`,
          formDataToSend,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
            timeout: 60000, // 1 minute timeout
          }
        );
  
        if (response.status === 200 && response.data.code === 200) {
          return response.data;
        }
        throw new Error(response.data.message || "Failed to update identification");
      } catch (error) {
        console.error("Error in updateDriverIdentification:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <AuthContext.Provider
      value={{
        register,
        getWards,
        getDistricts,
        getProvinces,
        getDriverIdentificationById,
        createDriverIdentification,
        updateDriverIdentification,
        confirmOtp,
        login,
        logout,
        userInfo,
        isLoading,
        forgotPass,
        newpass,
        isPlash,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
