import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";
import { LinearGradient } from "expo-linear-gradient";

const VoucherScreen = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();

  const {
    orderValue = 0,
    paymentMethod = "",
    distanceKm = 0,
    isFirstOrder = false,
    pickupLocation,
    dropoffLocation,
    capacity,
    notes,
    recipientPhoneNumber,
    bookingType,
    bookingDate,
    expirationDate,
    startLocationAddress,
    endLocationAddress,
    titlePickup,
    titleDropoff,
    selectedInsuranceId,
    insuranceName,
    insuranceDescription
  } = route.params || {};

  console.log("orderValue", orderValue);
  console.log("paymentMethod", paymentMethod);
  console.log("distanceKm", distanceKm);
  console.log("isFirstOrder", isFirstOrder);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Token không hợp lệ. Vui lòng đăng nhập lại.");
      }

      const response = await axios.post(
        `${BASE_URL}/api/tripBookings/applicable`,
        {
          orderValue,
          paymentMethod,
          distanceKm,
          isFirstOrder,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const voucherData = response.data.data || [];
      setVouchers(voucherData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vouchers:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApplyVoucher = (voucher) => {
    const voucherCode = voucher.code;
    console.log("Voucher Code (data.code):", voucherCode);

    navigation.navigate("Booking", {
      voucherCode,
      orderValue,
      paymentMethod,
      distanceKm,
      isFirstOrder,
      pickupLocation,
      dropoffLocation,
      capacity,
      recipientPhoneNumber,
      notes,
      bookingType,
      bookingDate,
      expirationDate,
      startLocationAddress,
      endLocationAddress,
      titlePickup,
      titleDropoff,
      selectedInsuranceId: selectedInsuranceId ?? route.params?.selectedInsuranceId,
      insuranceName: insuranceName ?? route.params?.insuranceName,
      insuranceDescription: insuranceDescription ?? route.params?.insuranceDescription,
    });
  };

  const getDiscountText = (item) => {
    if (item.discountType === "PERCENT") {
      return (
        <Text style={styles.discountValue}>
          <Text style={styles.discountValueNumber}>{item.discountValue}</Text>%
        </Text>
      );
    } else {
      return (
        <Text style={styles.discountValue}>
          <Text style={styles.discountValueNumber}>
            {Math.floor(item.discountValue / 1000)}K
          </Text>
        </Text>
      );
    }
  };

  const getVoucherGradientColors = (voucherType) => {
    return voucherType === "REDEMPTION" 
      ? ["#4CAF50", "#81C784"]  // Green gradient for REDEMPTION type
      : ["#FF6B6B", "#FFa06B"]; // Original orange gradient for others
  };

  const renderVoucherItem = ({ item }) => (
    <TouchableOpacity
      style={styles.voucherContainer}
      onPress={() => handleApplyVoucher(item)}
    >
      <LinearGradient
        colors={getVoucherGradientColors(item.voucherType)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.voucherLeftSection}
      >
        {getDiscountText(item)}
        <View style={styles.verticalDots}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </LinearGradient>

      <View style={styles.voucherRightSection}>
        <View style={styles.voucherHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="ticket-outline" size={16} color="#FF6B6B" />
            <Text style={styles.voucherCode}>{item.code || "N/A"}</Text>
          </View>
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.expiryText}>
              HSD: {new Date(item.endDate).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>

        <Text style={styles.voucherTitle}>
          {item.title || "Không có tiêu đề"}
        </Text>
        <Text style={styles.voucherDescription} numberOfLines={2}>
          {item.description || "Không có mô tả"}
        </Text>

        <View style={styles.voucherFooter}>
          <View style={styles.conditionContainer}>
            <Ionicons
              name="information-circle-outline"
              size={12}
              color="#888"
            />
            <Text style={styles.conditionText}>
              Đơn tối thiểu: {(item.minOrderValue / 1000).toFixed(0)}K
              {item.minKm ? ` • ${item.minKm}km` : ""}
              {item.maxDiscountAmount
                ? ` • Tối đa ${(item.maxDiscountAmount / 1000).toFixed(0)}K`
                : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => handleApplyVoucher(item)}
          >
            <Text style={styles.applyButtonText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mã ưu đãi của bạn</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVouchers}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vouchers}
          renderItem={renderVoucherItem}
          keyExtractor={(item) => item.voucherId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                Không có mã ưu đãi nào khả dụng
              </Text>
              <Text style={styles.emptySubtext}>
                Hãy quay lại sau để nhận thêm ưu đãi
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 16,
    color: "#333",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  voucherContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  voucherLeftSection: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  discountValue: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  discountValueNumber: {
    fontSize: 24,
    fontWeight: "900",
  },
  verticalDots: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "space-evenly",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: -3,
  },
  voucherRightSection: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  voucherCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginLeft: 4,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 2,
  },
  voucherTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  voucherDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 18,
  },
  voucherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  conditionContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  conditionText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 4,
    flex: 1,
  },
  applyButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  applyButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
});

export default VoucherScreen;
