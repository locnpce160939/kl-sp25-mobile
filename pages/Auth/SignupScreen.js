import React, { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../contexts/AuthContext";
import Spinner from "react-native-loading-spinner-overlay";

export default Signup = () => {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("CUSTOMER"); 

  const [usernameError, setUsernameError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const navigation = useNavigation();
  const { register, isLoading } = useContext(AuthContext);

  const validateInputs = () => {
    let isValid = true;

    // Validate Username
    if (!username.trim()) {
      setUsernameError("Username không được để trống");
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError("Username phải có ít nhất 3 ký tự");
      isValid = false;
    } else {
      setUsernameError("");
    }

    // Validate Full Name
    if (!fullName.trim()) {
      setFullNameError("Full Name không được để trống");
      isValid = false;
    } else if (fullName.length < 2) {
      setFullNameError("Full Name phải có ít nhất 2 ký tự");
      isValid = false;
    } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(fullName)) {
      setFullNameError("Full Name chỉ được chứa chữ cái và khoảng trắng");
      isValid = false;
    } else {
      setFullNameError("");
    }

    // Validate Phone
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.trim()) {
      setPhoneError("Phone Number không được để trống");
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      setPhoneError("Phone Number phải là số và đúng định dạng 10 số");
      isValid = false;
    } else {
      setPhoneError("");
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email không được để trống");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Email không đúng định dạng");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Validate Password
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.container}>
          <Text style={styles.headerText}>Đăng kí tài khoản</Text>

          <Spinner visible={isLoading} />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Tên đăng nhập"
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setUsernameError("");
              }}
            />
          </View>
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Họ và Tên"
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                setFullNameError("");
              }}
            />
          </View>
          {fullNameError ? (
            <Text style={styles.errorText}>{fullNameError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Số điện thoại"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                setPhoneError("");
              }}
            />
          </View>
          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setEmailError("");
              }}
            />
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputs}
              placeholder="Mật khẩu"
              secureTextEntry={true}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError("");
              }}
            />
          </View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={styles.roleOption}
              onPress={() =>
                setRole((prevRole) =>
                  prevRole === "CUSTOMER" ? "DRIVER" : "CUSTOMER"
                )
              }
            >
              <View
                style={[
                  styles.checkbox,
                  role === "DRIVER" && styles.checkboxSelected,
                ]}
              />
              <Text style={styles.roleText}>Bạn muốn là tài xế?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (validateInputs()) {
                register(username, password, email, phone, role, navigation, fullName);
              }
            }}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>
            Bạn đã có tài khoản ? Đăng nhập
            </Text>
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
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 10,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    width: 300,
    height: 45,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#808080",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputs: {
    flex: 1,
    height: 45,
    marginLeft: 16,
    borderBottomColor: "#FFFFFF",
  },
  inputIcon: {
    width: 30,
    height: 30,
    marginRight: 15,
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#00b5ec",
    height: 50,
    width: 300,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    marginTop: 10,
    shadowColor: "#808080",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loginLink: {
    color: "#00b5ec",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "bold",
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    justifyContent: "space-around",
    width: "100%",
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    borderRadius: 4,
  },
  checkboxSelected: {
    backgroundColor: "#00b5ec",
  },
  roleText: {
    fontSize: 16,
    color: "#333",
  },
});
