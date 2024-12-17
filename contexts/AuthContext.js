import axios from "axios";
import React, { createContext, useState } from "react";
import { BASE_URl } from "../configUrl";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import Navigation from "../navigation/Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
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

  // ================================== Login ========================================

  const login = async (username, password) => {
    setIsLoading(true);
    const res = await axios.post(`${BASE_URl}/api/auth`, {
      username,
      password,
    });
    if (res.data.code === 200) {
      const user = res.data;
      setUserInfo(user);
      AsyncStorage.setItem("userInfo", JSON.stringify(user));
      setIsLoading(false);
      console.log(userInfo);
      Alert.alert("Login successfully", res.data.message);
    } else {
      setIsLoading(false);
      Alert.alert("Error", res.data.message);
    }
  };

  //===================================logout=============================================================
  const logout = async () => {
    try {
      setIsLoading(true);
      // Xóa thông tin người dùng khỏi AsyncStorage
      await AsyncStorage.removeItem("userInfo");
      await AsyncStorage.removeItem("savedUsername");
      await AsyncStorage.removeItem("savedPassword");
      await AsyncStorage.setItem("rememberMe", "false");

      // Đặt trạng thái người dùng về rỗng
      setUserInfo({});
      Alert.alert("Logged out successfully");

      // Điều hướng về màn hình Login
      navigation.replace("LoginScreen");
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
        login,
        logout,
        userInfo,
        isLoading,
        forgotPass,
        newpass,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
