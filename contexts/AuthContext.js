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

  // ================================== Create Driver Identification ========================================
  const createDriverIdentification = async (formData, navigation) => {
    try {
      setIsLoading(true);

      // Lấy thông tin từ AsyncStorage
      const userInfoString = await AsyncStorage.getItem("userInfo");

      if (!userInfoString) {
        Alert.alert("Error", "No user information found. Please login again.");
        setIsLoading(false);
        return;
      }

      // Parse thông tin user
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token; // Đảm bảo truy xuất đúng trường `access_token`

      console.log("Access Token: ", accessToken);

      if (!accessToken) {
        Alert.alert("Error", "No access token found. Please login again.");
        setIsLoading(false);
        return;
      }

      // Gọi API với token
      const res = await axios.post(
        `${BASE_URl}/api/registerDriver/createDriverIdentification`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("API response:", res);

      if (res.status === 200 && res.data.code === 200) {
        setIsLoading(false);
        Alert.alert("Success", "Driver identification created successfully!");
        navigation.navigate("CreateDriverId");
      } else {
        setIsLoading(false);
        Alert.alert(
          "Error",
          res.data.message || "Failed to create identification."
        );
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error during API call:", error);

      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message || "An error occurred."
        );
      } else if (error.request) {
        Alert.alert("Error", "No response from server. Please try again.");
      } else {
        Alert.alert("Error", error.message || "An unknown error occurred.");
      }
    }
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
        confirmOtp,
        createDriverIdentification,
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
