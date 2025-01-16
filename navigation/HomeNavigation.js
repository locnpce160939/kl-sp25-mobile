import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import HomeScreen from "../pages/Home/HomeScreen";
import profileScreen from "../pages/Profile/profileScreen";

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

          // You can return any component that you like here!
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        tabBarActiveTintColor: "#00b5ec",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        animation: 'shift',
        
      })}
      
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={profileScreen}

        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );

};

export default HomeNavigation;
