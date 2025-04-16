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
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";
import { LinearGradient } from "expo-linear-gradient";

const MyVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMyVouchers();
  }, []);

  const fetchMyVouchers = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
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

      if (response.data.code === 200) {
        setVouchers(response.data.data || []);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vouchers:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải danh sách voucher");
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount).replace('₫', 'đ');
  };

  const getDiscountText = (voucher) => {
    if (voucher.discountType === "PERCENT") {
      return `Giảm ${voucher.discountValue}%`;
    } else {
      return `Giảm ${formatCurrency(voucher.discountValue)}`;
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
        <Text style={styles.discountValue}>
          {item.discountType === "PERCENT" ? (
            <Text>{item.discountValue}%</Text>
          ) : (
            <Text>{Math.floor(item.discountValue / 1000)}K</Text>
          )}
        </Text>
      </LinearGradient>

      <View style={styles.voucherRightSection}>
        <View style={styles.voucherHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="pricetag-outline" size={16} color="#4CAF50" />
            <Text style={styles.voucherCode}>{item.code}</Text>
          </View>
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.expiryText}>
              HSD: {formatDate(item.endDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.voucherTitle}>{item.title}</Text>
        <Text style={styles.voucherDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.voucherFooter}>
          <View style={styles.conditionContainer}>
            {item.minOrderValue > 0 && (
              <Text style={styles.conditionText}>
                Đơn tối thiểu {formatCurrency(item.minOrderValue)}
              </Text>
            )}
            {item.maxDiscountAmount && (
              <Text style={styles.conditionText}>
                • Giảm tối đa {formatCurrency(item.maxDiscountAmount)}
              </Text>
            )}
          </View>
          <View style={styles.usageLimitContainer}>
            <Text style={styles.usageLimitText}>
              Còn {item.quantity} lượt dùng
            </Text>
          </View>
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
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voucher của tôi</Text>
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
            onPress={fetchMyVouchers}
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
              <Ionicons name="ticket-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                Bạn chưa có voucher nào
              </Text>
              <TouchableOpacity
                style={styles.getVoucherButton}
                onPress={() => navigation.navigate("RedeemableVoucher")}
              >
                <Text style={styles.getVoucherButtonText}>Đổi voucher ngay</Text>
              </TouchableOpacity>
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
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 16,
    color: "#000",
  },
  listContainer: {
    padding: 16,
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
    padding: 12,
  },
  discountValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  voucherRightSection: {
    flex: 1,
    padding: 12,
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
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 4,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryText: {
    fontSize: 12,
    color: "#888",
    marginLeft: 4,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  voucherDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  voucherFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
    marginTop: 4,
  },
  conditionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 12,
    color: "#666",
  },
  usageLimitContainer: {
    alignItems: "flex-end",
  },
  usageLimitText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginBottom: 16,
  },
  getVoucherButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  getVoucherButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default MyVouchers; 