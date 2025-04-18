import React, { useContext, useState } from "react";
import {
  Text,
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { AuthContext } from "../../contexts/AuthContext";
import Spinner from "react-native-loading-spinner-overlay";
import { useNavigation } from "@react-navigation/native";

const NewPassScreen = ({route}) => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { newpass, isLoading } = useContext(AuthContext);
  const navigation = useNavigation();

  const { email } = route.params

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <Spinner visible={isLoading}></Spinner>
        <Text style={styles.title}>Đặt lại mật khẩu</Text>
        <Text style={styles.subtitle}>
         Vui lòng nhập OTP và mật khẩu mới để đặt lại mật khẩu
        </Text>



        {/* OTP Input */}
        <TextInput
          style={styles.input}
          placeholder="nhập OTP"
          keyboardType="numeric"
          value={otp}
          onChangeText={(value) => setOtp(value)}
        />

        {/* Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu mới"
          secureTextEntry={true}
          value={newPassword}
          onChangeText={(value) => setNewPassword(value)}
        />

        {/* Confirm Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu mới"
          secureTextEntry={true}
          value={confirmPassword}
          onChangeText={(value) => setConfirmPassword(value)}
        />

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => newpass(email, otp, newPassword, confirmPassword, navigation)}
          >
            <Text style={styles.buttonText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#00b5ec",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default NewPassScreen;
