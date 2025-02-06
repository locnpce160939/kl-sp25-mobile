import { NavigationContainer, useNavigation } from "@react-navigation/native";
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
import ViewTrip from "../pages/TripBooking/view";
import DriverIdentificationScreen from "../pages/Indentification/DriverIdentificationScreen";
import RightTrip from "../pages/RightTrip";
import Order from "../pages/Order";
import ScheduleListScreen from "../pages/Schedule/scheduleListScreen";
import ChatCustomer from '../pages/Chat/ChatCustomer';
import ChatDriver from '../pages/Chat/ChatDriver';

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { userInfo, isPlash } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "black",
        }}
      >
        {isPlash ? (
          <Stack.Screen
            name="Splash"
            component={PlashScreen}
            options={{ headerShown: false }}
          />
        ) : userInfo.data?.access_token ? (
          <>
            <Stack.Screen
              name="HomeScreen"
              component={HomeNavigation}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="Booking" component={TripBooking} />
            
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
            <Stack.Screen
              name="DriverIdentificationScreen"
              component={DriverIdentificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RightTrip"
              component={RightTrip}
            />
              <Stack.Screen
              name="ViewTrip"
              component={ViewTrip}
            />
            <Stack.Screen
              name="Order"
              component={Order}
            />
            <Stack.Screen
              name="ScheduleListScreen"
              component={ScheduleListScreen}
              options={{ headerShown: false }}
            />
             <Stack.Screen 
          name="ChatCustomer" 
          component={ChatCustomer}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
  name="ChatDriver" 
  component={ChatDriver} 
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
