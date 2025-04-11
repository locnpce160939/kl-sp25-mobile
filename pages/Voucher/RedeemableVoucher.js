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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";
import { LinearGradient } from "expo-linear-gradient";

const RedeemableVoucher = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchRedeemableVouchers();
  }, []);

  const fetchRedeemableVouchers = async () => {
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

      const response = await axios.get(
        `${BASE_URL}/api/voucher/canRedemption`,
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
      console.error("Error fetching redeemable vouchers:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải danh sách voucher");
      setLoading(false);
    }
  };

  const handleRedeemVoucher = (voucher) => {
    Alert.alert(
      "Xác nhận đổi voucher",
      `Bạn có muốn dùng ${voucher.pointsRequired} điểm để đổi ${voucher.title}?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đổi",
          onPress: () => performRedeem(voucher.voucherId),
        },
      ]
    );
  };

  const performRedeem = async (voucherId) => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      const response = await axios.put(
        `${BASE_URL}/api/voucher/redeem/${voucherId}`,
        {}, // Body trống vì API dùng POST với param trong URL
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.code === 200) {
        Alert.alert("Thành công", "Voucher đã được đổi thành công!");
        fetchRedeemableVouchers(); // Refresh danh sách sau khi đổi
      }
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể đổi voucher lúc này"
      );
    }
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

  const renderVoucherItem = ({ item }) => (
    <View style={styles.voucherContainer}>
      <LinearGradient
        colors={["#4CAF50", "#81C784"]}
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
            <Ionicons name="gift-outline" size={16} color="#4CAF50" />
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
            <Ionicons name="star-outline" size={12} color="#888" />
            <Text style={styles.conditionText}>
              Cần {item.pointsRequired} điểm • Rank {item.minimumRank}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.redeemButton}
            onPress={() => handleRedeemVoucher(item)}
          >
            <Text style={styles.redeemButtonText}>Đổi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#00b5ec" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi Voucher</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải voucher...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRedeemableVouchers}
          >
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
              <Ionicons name="gift-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                Không có voucher nào để đổi
              </Text>
              <Text style={styles.emptySubtext}>
                Kiếm thêm điểm để đổi voucher nhé!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

// Styles giữ nguyên như trước
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
    color: "#00b5ec",
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
  redeemButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  redeemButtonText: {
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
    backgroundColor: "#4CAF50",
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

export default RedeemableVoucher;