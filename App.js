import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";
import HomeNavigation from "./navigation/HomeNavigation";


export default function App() {
  return (
  <AuthProvider>
    <Navigation />
  </AuthProvider>
);
};
