import React, { use, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";

const PaymentScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);

  const { bookingId } = route.params;

  useEffect(() => {
    initiatePayment();
  }, []);

  const initiatePayment = async () => {
    try {
      let token = await AsyncStorage.getItem("token");
      const paymentResponse = await axios.get(
        `${BASE_URL}/api/payment/tripBooking/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setPaymentData(paymentResponse.data.data);
      setQrCode(paymentResponse.data?.data?.qrData);
    } catch (err) {
      setError("An error occurred while processing payment");
      console.log(err);
      Alert.alert("Error", "Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00b5ec" />
        <Text style={styles.loadingText}>Đang tạo mã QR...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.paymentInfo}>
        <Text style={styles.title}>Chi tiết thanh toán</Text>
        <Text style={styles.amount}>
          Số tiền: {paymentData?.amount?.toLocaleString()} VNĐ
        </Text>
      </View>

      {qrCode && (
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: `${qrCode}` }}
            style={styles.qrCode}
            resizeMode="contain"
          />
          <Text style={styles.instruction}>
            Quét mã QR để hoàn tất thanh toán
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  paymentInfo: {
    width: "100%",
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  amount: {
    fontSize: 18,
    marginBottom: 10,
  },
  qrContainer: {
    alignItems: "center",
  },
  qrCode: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default PaymentScreen;
