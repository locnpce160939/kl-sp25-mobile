import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useContext } from "react";
import Login from "../pages/Auth/LoginScreen";
import Signup from "../pages/Auth/SignupScreen";
import Confirmotp from "../pages/Auth/ConfirmotpScreen";
import { AuthContext, AuthProvider } from "../contexts/AuthContext";
import HomeScreen from "../pages/Home/HomeScreen";
import ForgotpassScreen from "../pages/Auth/ForgotpassScreen";
import NewpassScreen from "../pages/Auth/NewpassScreen";
import HomeNavigation from "./HomeNavigation";
import PlashScreen from "../pages/Auth/PlashScreen";
import ScheduleScreen from "../pages/Schedule/scheduleScreen";
import TripBooking from "../pages/TripBooking";
import LicenseScreen from "../pages/Lincese/licenseScreen";
import VehicleScreen from "../pages/Vehicle/vehicleScreen";
import CurrentLocation from "../pages/CurrentLocation";
import CreateDriverIdentificationScreen from "../pages/Auth/CreateDriverIdentificationScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { userInfo, isPlash } = useContext(AuthContext);

  console.log(userInfo);
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isPlash ? (
          <Stack.Screen
            name="Splash"
            component={PlashScreen}
            options={{ headerShown: false }}
          />
        ) : userInfo.data?.access_token ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeNavigation}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Booking"
              component={TripBooking}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="VehicleScreen"
              component={VehicleScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LicenseScreen"
              component={LicenseScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="CurrentLocation" component={CurrentLocation} />

            <Stack.Screen
              name="CreateDriverIdentificationScreen"
              component={CreateDriverIdentificationScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ConfirmOTP"
              component={Confirmotp}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotpassScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NewPass"
              component={NewpassScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
