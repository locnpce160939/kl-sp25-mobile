import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useContext } from "react";
import Login from "../pages/auth/LoginScreen";
import Signup from "../pages/auth/SignupScreen";
import Confirmotp from "../pages/auth/ConfirmotpScreen";
import { AuthContext, AuthProvider } from "../contexts/AuthContext";
import HomeScreen from "../pages/Home/HomeScreen";
import ForgotpassScreen from "../pages/auth/ForgotpassScreen";
import NewpassScreen from "../pages/auth/NewpassScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { userInfo } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {userInfo.data?.access_token ? (
          <Stack.Screen name="Home" component={HomeScreen} />
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
