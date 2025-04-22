import axios from "axios";
import React, { createContext, useEffect, useState } from "react";
import { BASE_URL } from "../configUrl";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import Navigation from "../navigation/Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DriverIdentificationScreen from "../pages/Indentification/DriverIdentificationScreen";
import { useAlert } from "../components/CustomAlert"; // Import hook useAlert

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlash, setIsPlash] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const { showAlert } = useAlert(); // Sử dụng hook useAlert

  // ================================== Register ========================================
  const register = async (
    username,
    password,
    email,
    phone,
    role,
    navigation,
    fullName
  ) => {
    try {
      setIsLoading(true);
      console.log("Registering with data:", { username, password, email, phone, role, fullName });

      const res = await axios.post(`${BASE_URL}/api/account/register/send`, {
        fullName,
        username,
        password,
        email,
        phone,
        role,
      });
      if (res.status === 200) {
        const userInfo = res.data;
        if (userInfo.code === 200) {
          setIsLoading(false);
          console.log("Navigation to ConfirmOTP with params:", {
            fullName,
            username,
            password,
            email,
            phone,
            role,
          });
          navigation.navigate("ConfirmOTP", {
            fullName,
            username,
            password,
            email,
            phone,
            role,
          });
        } else {
          showAlert({
            title: "Lỗi",
            message: "Đăng ký thất bại",
            type: "error",
          });
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || "Đăng ký thất bại";
      showAlert({
        title: "Lỗi",
        message: message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  //-----------------------------getWards--------------------------------------------------------
  const getWards = async (districtId) => {
    if (!districtId) {
      showAlert({
        title: "Lỗi",
        message: "Vui lòng chọn quận/huyện trước.",
        type: "error",
      });
      return [];
    }

    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        showAlert({
          title: "Lỗi",
          message: "Không tìm thấy access token. Vui lòng đăng nhập lại.",
          type: "error",
        });
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
        showAlert({
          title: "Lỗi",
          message: response.data.message || "Không thể lấy danh sách ấp/xã.",
          type: "error",
        });
        return [];
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách ấp/xã:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi không xác định khi lấy danh sách ấp/xã.";
      showAlert({
        title: "Lỗi",
        message: errorMessage,
        type: "error",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  //-----------------------------getDistricts ----------------------------------------------------
  const getDistricts = async (provinceId) => {
    if (!provinceId) {
      showAlert({
        title: "Lỗi",
        message: "Vui lòng chọn tỉnh/thành phố trước.",
        type: "error",
      });
      return [];
    }

    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        showAlert({
          title: "Lỗi",
          message: "Không tìm thấy access token. Vui lòng đăng nhập lại.",
          type: "error",
        });
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
        showAlert({
          title: "Lỗi",
          message: response.data.message || "Không thể lấy danh sách quận/huyện.",
          type: "error",
        });
        return [];
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách quận/huyện:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi không xác định khi lấy danh sách quận/huyện.";
      showAlert({
        title: "Lỗi",
        message: errorMessage,
        type: "error",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  //----------------------------getProvinces -----------------------------------------------------
  const getProvinces = async () => {
    try {
      setIsLoading(true);
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;

      if (!accessToken) {
        showAlert({
          title: "Lỗi",
          message: "Không tìm thấy access token. Vui lòng đăng nhập lại.",
          type: "error",
        });
        return [];
      }

      const response = await axios.get(`${BASE_URL}/api/location/provinces`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 200 && response.data.code === 200) {
        return response.data.data.map((province) => ({
          id: province.code,
          fullName: province.fullName,
        }));
      } else {
        showAlert({
          title: "Lỗi",
          message: response.data.message || "Không thể lấy danh sách tỉnh/thành phố.",
          type: "error",
        });
        return [];
      }
    } catch (error) {
      console.error("Error fetching provinces:", error);
      showAlert({
        title: "Lỗi",
        message: "Đã xảy ra lỗi không xác định khi lấy danh sách tỉnh/thành phố.",
        type: "error",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  //------------------------getDriverIdentificationByAccountId-------------------------------------------
  const getDriverIdentificationById = async () => {
    try {
      setIsLoading(true);

      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        showAlert({
          title: "Lỗi",
          message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
          type: "error",
        });
        setIsLoading(false);
        return null;
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        showAlert({
          title: "Lỗi",
          message: "Không tìm thấy access token. Vui lòng đăng nhập lại.",
          type: "error",
        });
        setIsLoading(false);
        return null;
      }

      const res = await axios.get(
        `${BASE_URL}/api/registerDriver/identification/getByAccountId`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (res.status === 200 && res.data.code === 200) {
        return res.data.data;
      } else {
        showAlert({
          title: "Lỗi",
          message: res.data.message || "Không thể lấy thông tin định danh.",
          type: "error",
        });
        return null;
      }
    } catch (error) {
      console.error("Error fetching identification by ID:", error);
      if (error.response) {
        showAlert({
          title: "Lỗi",
          message: error.response.data.message || "Đã xảy ra lỗi.",
          type: "error",
        });
      } else {
        showAlert({
          title: "Lỗi",
          message: "Đã xảy ra lỗi không xác định.",
          type: "error",
        });
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
    fullName,
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
        otp: parseInt(otp), // Convert otp to number since API expects numeric value
        fullName,
      })
      .then((res) => {
        const userInfo = res.data;
        console.log("API Response:", userInfo);
        if (userInfo.code === 200) {
          setIsLoading(false);
          showAlert({
            title: "Thành công",
            message: "Bạn đã đăng ký thành công.",
            type: "success",
          });
          navigation.navigate("Login");
        } else {
          setIsLoading(false);
          showAlert({
            title: "Lỗi",
            message: userInfo.message || "Xác nhận OTP thất bại.",
            type: "error",
          });
        }
      })
      .catch((error) => {
        setIsLoading(false);
        console.error("OTP Confirmation Error:", error.response?.data || error);
        const errorMessage = error.response?.data?.message || "Xác nhận OTP thất bại";
        showAlert({
          title: "Lỗi",
          message: errorMessage,
          type: "error",
        });
        throw error;
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
        showAlert({
          title: "Thành công",
          message: "Đăng nhập thành công",
          type: "success",
        });
      } else {
        setIsLoading(false);
        showAlert({
          title: "Lỗi",
          message: "Đăng nhập thất bại",
          type: "error",
        });
      }
    } catch (error) {
      setIsLoading(false);
      showAlert({
        title: "Lỗi",
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
        type: "error",
      });
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
      showAlert({
        title: "Thành công",
        message: "Đăng xuất thành công",
        type: "success",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      showAlert({
        title: "Lỗi",
        message: "Đăng xuất thất bại. Vui lòng thử lại",
        type: "error",
      });
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
          showAlert({
            title: "Thành công",
            message: "Mã xác nhận đã được gửi đến email của bạn",
            type: "success",
          });
        } else {
          setIsLoading(false);
          showAlert({
            title: "Lỗi",
            message: "Không thể gửi mã xác nhận",
            type: "error",
          });
        }
      })
      .catch((e) => {
        setIsLoading(false);
        showAlert({
          title: "Lỗi",
          message: "Email không tồn tại trong hệ thống",
          type: "error",
        });
        console.error(`Quên mật khẩu thất bại: ${e}`);
        throw e;
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
          showAlert({
            title: "Thành công",
            message: "Đổi mật khẩu thành công",
            type: "success",
          });
          navigation.navigate("Login");
        } else {
          setIsLoading(false);
          showAlert({
            title: "Lỗi",
            message: "Đổi mật khẩu thất bại",
            type: "error",
          });
        }
      })
      .catch((e) => {
        setIsLoading(false);
        showAlert({
          title: "Lỗi",
          message: "Mã OTP không đúng hoặc đã hết hạn",
          type: "error",
        });
      });
  };
    // ================================== Update Driver Identification ========================================
    const updateDriverIdentification = async (formData) => {
      if (isLoading) return;
  
      setIsLoading(true);
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        if (!userInfoString) {
          showAlert({
            title: "Lỗi",
            message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
            type: "error",
          });
          return;
        }
  
        const parsedUserInfo = JSON.parse(userInfoString);
        const accessToken = parsedUserInfo?.data?.access_token;
  
        if (!accessToken || typeof accessToken !== "string") {
          showAlert({
            title: "Lỗi",
            message: "Token không hợp lệ. Vui lòng đăng nhập lại.",
            type: "error",
          });
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
