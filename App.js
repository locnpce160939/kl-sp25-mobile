import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import HomeNavigation from "./navigation/HomeNavigation";
import SocketNotification from "./components/SocketNotification";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AlertProvider } from "./components/CustomAlert";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AlertProvider>
      <AuthProvider>
        <AlertProvider>
          <SocketNotification />
          <Navigation />
        </AlertProvider>
      </AuthProvider>
      </AlertProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
    
  );
}