import React, { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { AuthContext } from "../../contexts/AuthContext";
import Spinner from "react-native-loading-spinner-overlay";

const Login = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login, isLoading } = useContext(AuthContext);

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

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => {
            if (validateInputs()) {
              login(username, password);
            }
          }}
        >
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
