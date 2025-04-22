import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from "./axiosConfig";

// Function to decode JWT and extract user ID


// Function to get user role from token
function getUserRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));     
    return payload.account.role;
  } catch (error) {
    console.error("Error extracting role from token:", error);
    return null;
  }
}

export const loadStatusDriverDocument = async () => {
  try {
    // Fetch and validate token
    const userInfoString = await AsyncStorage.getItem("userInfo");
    const accessToken = JSON.parse(userInfoString)?.data?.access_token;
    
    if (!accessToken) {
      console.error("No access token found");
      return null;
    }

    // Check if user has DRIVER role
    const userRole = getUserRoleFromToken(accessToken);
    if (userRole !== 'DRIVER') {
      console.log("Access denied: User is not a driver");
      return null;
    }

    // Make API call
    const res = await axiosInstance.get(
      "/api/registerDriver/checkRequiredInformation"
    );

    if (res.status === 200 && res.data.code === 200) {
      return res.data.data;
    } else {
      console.error("Registration Error:", res.data.message);
    }
  } catch (error) {
    console.error("Error during API call:", error);
  }
  return null;
};

// Optional: Fetch token and set current user details
const fetchToken = async () => {
  try {
    const userInfoString = await AsyncStorage.getItem("userInfo");
    const accessToken = JSON.parse(userInfoString)?.data?.access_token;
    
    if (accessToken) {
     
      const userRole = getUserRoleFromToken(accessToken);
      
      // Additional state setting logic
      setToken(accessToken);
    
      setCurrentUserRole(userRole);
    }
  } catch (error) {
    console.error("Error fetching token:", error);
  }
};

export const getUserProfile = async () => {
  try {
    // Fetch and validate token
    const userInfoString = await AsyncStorage.getItem("userInfo");
    const accessToken = JSON.parse(userInfoString)?.data?.access_token;
    
    if (!accessToken) {
      console.error("No access token found");
      return null;
    }

    // Make API call to get user profile
    const response = await axiosInstance.get("/api/account/profile");

    if (response.status === 200 && response.data.code === 200) {
      return response.data.data;
    } else {
      console.error("Profile fetch error:", response.data.message);
      return null;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

