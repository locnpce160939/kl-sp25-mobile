import axiosInstance from "./axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getUserInfo = async () => {
  try {
    const userInfo = await AsyncStorage.getItem("userInfo");
    const data = JSON.parse(userInfo)?.data || {};
    return data;
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    return {};
  }
};
