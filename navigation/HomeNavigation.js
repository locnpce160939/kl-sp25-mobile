import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import HomeScreen from "../pages/Home/HomeScreen";
import profileScreen from "../pages/Profile/profileScreen";
import BalanceDriverScreen from "../pages/BalanceDriver/BalanceDriverScreen";

const HomeNavigation = () => {
  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused
              ? "home" // filled home icon when focused
              : "home-outline"; // outline home icon when not focused
          } else if (route.name === "Profile") {
            iconName = focused
              ? "person" // filled person icon when focused
              : "person-outline"; // outline person icon when not focused
          }
          else if (route.name === "Balance") {
            iconName = focused
              ? "wallet" // filled person icon when focused
              : "wallet-outline"; // outline person icon when not focused; 
          }

          // You can return any component that you like here!
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        tabBarActiveTintColor: "#00b5ec",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        animation: "shift",
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: "Trang chủ"
        }}
      />
      <Tab.Screen
        name="Profile"
        component={profileScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: "Hồ sơ"
        }}
      />
      <Tab.Screen
        name="Balance"
        component={BalanceDriverScreen}
        options={{ 
          headerShown: false,
          tabBarLabel: "ví"
        }}
      />
    </Tab.Navigator>
    
  );
};

export default HomeNavigation;
