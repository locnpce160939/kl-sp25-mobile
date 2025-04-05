import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import HomeNavigation from "./navigation/HomeNavigation";
import SocketNotification from "./components/SocketNotification";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AlertProvider } from "./components/CustomAlert";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AlertProvider>
          <SocketNotification />
          <Navigation />
        </AlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}