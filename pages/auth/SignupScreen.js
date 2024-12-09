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
import { useNavigation } from "@react-navigation/native";

export default Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [password, setPassword] = useState("");

  const { register } = useContext(AuthContext);
  const navigation = useNavigation();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ImageBackground
            style={styles.bgImage}
            source={require("../../assets/BgcLogin.jpg")}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Full name"
              underlineColorAndroid="transparent"
              value={username}
              onChangeText={(value) => setUsername(value)}
            />
            <Image
              style={styles.inputIcon}
              source={{
                uri: "https://img.icons8.com/color/40/000000/circled-user-male-skin-type-3.png",
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Phone Number"
              value={phone}
              underlineColorAndroid="transparent"
              onChangeText={(value) => setPhone(value)}
            />
            <Image
              style={styles.inputIcon}
              source={{
                uri: "https://img.icons8.com/?size=100&id=wiJhr5r8Bs2I&format=png&color=000000",
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              underlineColorAndroid="transparent"
              onChangeText={(value) => setEmail(value)}
            />
            <Image
              style={styles.inputIcon}
              source={{
                uri: "https://img.icons8.com/flat_round/40/000000/secured-letter.png",
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Password"
              secureTextEntry={true}
              value={password}
              underlineColorAndroid="transparent"
              onChangeText={(value) => setPassword(value)}
            />
            <Image
              style={styles.inputIcon}
              source={{
                uri: "https://img.icons8.com/color/40/000000/password.png",
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.btnByRegister}
            onPress={() => this.onClickListener("restore_password")}
          >
            <Text style={styles.textByRegister}>
              By registering on this App you confirm that you have read and
              accept our policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonContainer, styles.loginButton]}
            onPress={() => {
              // Gọi hàm register và điều hướng khi thành công
              register(username, password, email, phone, role)
                .then(() => {
                  navigation.navigate("ConfirmOTP");
                })
                .catch((err) => {
                  console.error("Error during registration", err);
                });
            }}
          >
            <Text style={styles.loginText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.btnText}>Have an account?</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#DCDCDC",
  },
  inputContainer: {
    borderBottomColor: "#F5FCFF",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderBottomWidth: 1,
    width: 300,
    height: 45,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    elevation: 5,
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
    justifyContent: "center",
  },
  buttonContainer: {
    height: 45,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    width: 300,
    borderRadius: 30,
    backgroundColor: "transparent",
  },
  btnByRegister: {
    height: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    width: 300,
    backgroundColor: "transparent",
  },
  loginButton: {
    backgroundColor: "#00b5ec",

    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12.35,

    elevation: 19,
  },
  loginText: {
    color: "white",
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  textByRegister: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",

    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
