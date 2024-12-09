import axios from "axios";
import React, { createContext } from "react";
import { BASE_URl } from "../configUrl";
import { useNavigation } from "@react-navigation/native";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {


    // ================================== Register ========================================
    const register = (username, password, email, phone, role) => {
    axios.post(`${BASE_URl}/api/account/register/send`, {
      username,
      password,
      email,
      phone,
      role,
    }).then(res => {
        const userInfor = res.data;
        console.log(userInfor);
    })
    .catch(e => {
        console.log(`Register fail ${e}`)
    })
  };




    // ================================== ConfirmOTP ========================================
   











  return (
    <AuthContext.Provider value={{register}}>{children}</AuthContext.Provider>
  );
};
