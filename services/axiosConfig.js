import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URl } from "../configUrl";

const axiosInstance = axios.create({
  baseURL: BASE_URl,
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const userInfoString = await AsyncStorage.getItem("userInfo");
    const accessToken = JSON.parse(userInfoString)?.data?.access_token;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("Response error:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
