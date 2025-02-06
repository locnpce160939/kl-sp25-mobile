import axios from "axios";
import React, { createContext, useEffect, useState } from "react";
import { BASE_URl } from "../configUrl";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import Navigation from "../navigation/Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

      const res = await axios.post(`${BASE_URl}/api/account/register/send`, {
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
        `${BASE_URl}/api/location/wards/${districtId}`,
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
        `${BASE_URl}/api/location/districts/${provinceId}`,
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

      const response = await axios.get(`${BASE_URl}/api/location/provinces`, {
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
        `${BASE_URl}/api/registerDriver/identification/getByAccountId`,
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
      // const checkFileSize = (file) => {
      //   console.log("File size:", file.size);
      //   const maxSize = 5 * 1024 * 1024; // 5MB
      //   if (file.size > maxSize) {
      //     throw new Error("Kích thước file quá lớn. Tối đa 5MB");
      //   }
      // };
  
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
        return;
      }
  
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;
  
      if (!accessToken || typeof accessToken !== 'string') {
        Alert.alert("Lỗi", "Token không hợp lệ. Vui lòng đăng nhập lại.");
        return;
      }
  
      console.log("Access Token:", accessToken);
  
      const formDataToSend = new FormData();
  
      if (formData.frontFile) {
        //checkFileSize(formData.frontFile);
        formDataToSend.append("frontFile", {
          uri: formData.frontFile.uri,
          type: 'image/jpeg',
          name: 'front.jpeg',
        });
      } else {
        throw new Error("Thiếu ảnh mặt trước CCCD/CMND");
      }
  
      if (formData.backFile) {
      //  checkFileSize(formData.backFile);
        formDataToSend.append("backFile", {
          uri: formData.backFile.uri,
          type: 'image/jpeg',
          name: 'back.jpeg',
        });
      } else {
        throw new Error("Thiếu ảnh mặt sau CCCD/CMND");
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
  
      console.log("Data to send:");
      for (let pair of formDataToSend.entries()) {
          console.log(pair[0], pair[1]);
      }
      
      const response = await axios.post(
        `${BASE_URl}/api/registerDriver/identification`,
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          timeout: 300000 // 5 phút
        }
      );
  
      console.log("Response from server:", response.data);
  
      if (response.status === 200 || response.status === 201) {
        Alert.alert("Thành công", "Đã tạo thông tin CCCD/CMND thành công");
        navigation.goBack();
      }
  
    } catch (error) {
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
  
      let errorMessage = "Đã xảy ra lỗi khi tạo thông tin CCCD/CMND";
  
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
  
      Alert.alert("Lỗi", errorMessage);
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
      .post(`${BASE_URl}/api/account/register/confirm`, {
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
      const res = await axios.post(`${BASE_URl}/api/auth`, {
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
      .post(`${BASE_URl}/api/account/forgotSend`, {
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
      .post(`${BASE_URl}/api/account/forgotConfirm`, {
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

  return (
    <AuthContext.Provider
      value={{
        register,
        getWards,
        getDistricts,
        getProvinces,
        getDriverIdentificationById,
        createDriverIdentification,
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
