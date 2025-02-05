import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import HomeNavigation from "./navigation/HomeNavigation";
import SocketNotification from './components/SocketNotification';  // Đảm bảo rằng đường dẫn chính xác


export default function App() {
  return (
  <AuthProvider>
   
    <SocketNotification />
    <Navigation />
  </AuthProvider>
);
};
