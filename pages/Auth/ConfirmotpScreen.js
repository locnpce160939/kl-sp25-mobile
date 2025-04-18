import React, { useContext, useState } from "react";
import axios from "axios";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { AuthContext } from "../../contexts/AuthContext";

export default Confirmotp = ({ navigation, route }) => {
  console.log("Route params:", route.params);
  const { confirmOtp } = useContext(AuthContext);
  const [otp, setOtp] = useState("");
  const { username, password, email, phone, role, fullName } = route.params;
  return (
    <View style={styles.container}>
      <ImageBackground
        style={styles.bgImage}
        source={require("../../assets/BgcLogin.jpg")}
      />
      <Text style={styles.title}>Xác nhận mã OTP</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputs}
          placeholder="nhập OTP ở đây"
          keyboardType="phone-pad"
          value={otp}
          onChangeText={(text) => setOtp(text)}
        />
        <Image
          style={styles.inputIcon}
          source={{
            uri: "https://img.icons8.com/color/40/000000/password.png",
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.buttonContainer, styles.loginButton]}
        onPress={() => {
          confirmOtp(username, password, email, phone, role, otp, fullName, navigation);
        }}
      >
        <Text style={styles.loginText}>Xác nhận</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.btnText}>Quay lại đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 50,
    color: "#fff",
  },
  bgImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  inputContainer: {
    borderBottomColor: "#F5FCFF",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderBottomWidth: 1,
    width: 250,
    height: 45,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  inputs: {
    height: 45,
    marginLeft: 16,
    borderBottomColor: "#FFFFFF",
    flex: 1,
  },
  inputIcon: {
    width: 30,
    height: 30,
    marginRight: 15,
  },
  buttonContainer: {
    height: 45,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    width: 250,
    borderRadius: 30,
  },
  loginButton: {
    backgroundColor: "#00b5ec",
  },
  loginText: {
    color: "white",
  },
  btnText: {
    color: "#fff",
  },
});
