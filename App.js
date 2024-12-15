import React from "react";
import Navigation from "./navigation/Navigation";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
  <AuthProvider>
    <Navigation />
  </AuthProvider>
);
};
