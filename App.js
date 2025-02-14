import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import HomeNavigation from "./navigation/HomeNavigation";
import SocketNotification from "./components/SocketNotification";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketNotification />
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
