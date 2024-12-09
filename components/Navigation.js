import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import Login from "../pages/auth/LoginScreen";
import Signup from "../pages/auth/SignupScreen";
import Confirmotp from "../pages/auth/ConfirmotpScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={Signup}
          options={{ title: "Welcome" }}
        />
        <Stack.Screen
          name="ConfirmOTP"
          component={Confirmotp}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
