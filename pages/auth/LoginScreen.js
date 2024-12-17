import React, { useContext, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { AuthContext } from "../../contexts/AuthContext";
import Spinner from "react-native-loading-spinner-overlay";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Login = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login, isLoading } = useContext(AuthContext);

  // Kiểm tra thông tin đăng nhập đã lưu khi ứng dụng khởi động
  useEffect(() => {
    const checkRememberedLogin = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem("savedUsername");
        const savedPassword = await AsyncStorage.getItem("savedPassword");
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");

        if (savedRememberMe === "true" && savedUsername && savedPassword) {
          // Tự động đăng nhập và chuyển đến HomeScreen
          login(savedUsername, savedPassword);
          navigation.replace("HomeScreen"); // Chuyển đến HomeScreen
        }
      } catch (error) {
        console.error("Failed to load saved credentials:", error);
      }
    };

    checkRememberedLogin();
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const validateInputs = () => {
    let isValid = true;

    if (!username.trim()) {
      setUsernameError("Username không được để trống");
      isValid = false;
    } else {
      setUsernameError("");
    }

    if (!password.trim()) {
      setPasswordError("Password không được để trống");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password phải có ít nhất 6 ký tự");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (validateInputs()) {
      login(username, password);
      if (rememberMe) {
        try {
          await AsyncStorage.setItem("savedUsername", username);
          await AsyncStorage.setItem("savedPassword", password);
          await AsyncStorage.setItem("rememberMe", "true");
        } catch (error) {
          console.error("Failed to save login credentials:", error);
        }
      } else {
        await AsyncStorage.removeItem("savedUsername");
        await AsyncStorage.removeItem("savedPassword");
        await AsyncStorage.setItem("rememberMe", "false");
      }
      navigation.replace("HomeScreen.js"); // Điều hướng sau khi đăng nhập thành công
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Log in to your account to continue.
          </Text>
        </View>

        <Spinner visible={isLoading} />

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setUsernameError("");
            }}
          />
        </View>
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : null}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={true}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError("");
            }}
          />
        </View>
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        <View style={styles.rememberMeContainer}>
          <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
            <Text style={styles.rememberMeText}>
              {rememberMe ? "☑" : "☐"} Remember Me
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Signup")}
          style={styles.buttonSecondary}
        >
          <Text style={styles.secondaryText}>
            Don’t have an account? Sign up
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.buttonSecondary}
        >
          <Text style={styles.secondaryText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Login;

const styles = StyleSheet.create({
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  rememberMeText: {
    fontSize: 14,
    color: "#333",
  },

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  image: {
    width: 150,
    height: 150,
    resizeMode: "contain",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  inputWrapper: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    fontSize: 16,
    color: "#333",
  },
  buttonPrimary: {
    backgroundColor: "#00b5ec",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonSecondary: {
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 14,
    color: "#00b5ec",
    marginBottom: 10,
    textDecorationLine: "underline",
  },
});
