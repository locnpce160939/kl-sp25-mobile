import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../configUrl";

const BonusScreen = () => {
  const [bonusTask, setBonusTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigation = useNavigation();

  const fetchBonusTask = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString)
        throw new Error("Vui lòng đăng nhập lại. Phiên hết hạn.");

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Token không hợp lệ. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(`${BASE_URL}/api/driverBonusProgress`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const taskData = response.data.data || null;
      setBonusTask(taskData);
      setLoading(false);
    } catch (err) {
      console.error("Lỗi khi lấy nhiệm vụ thưởng:", err);
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  }, []);

  const claimReward = async (driverBonusProgressId) => {
    setIsClaiming(true);
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      console.log("Calling API with Token:", accessToken);
      console.log("Driver Bonus Progress ID:", driverBonusProgressId);

      const response = await axios.put(
        `${BASE_URL}/api/driverBonusProgress/approvedReward/${driverBonusProgressId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("Reward claimed successfully:", response.data);

      setSuccessMessage("Bạn đã nhận thưởng thành công!");
      fetchBonusTask();
      setIsClaiming(false);

      // Xóa thông báo sau 3 giây
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(
        "Lỗi chi tiết khi nhận thưởng:",
        err.response ? err.response.data : err.message
      );
      setError(
        err.response?.data?.message ||
          "Không thể nhận thưởng. Vui lòng thử lại."
      );
      setIsClaiming(false);

      // Xóa lỗi sau 3 giây
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    fetchBonusTask();
  }, [fetchBonusTask]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã nhận thưởng":
        return "#28a745";
      case "Đã đạt":
        return "#007bff";
      default:
        return "#FF6B6B";
    }
  };

  const formatCurrency = (amount) => {
    return (amount / 1000).toFixed(0) + "K";
  };

  const isNewTask = (item) => {
    return (
      item.completedTrips === 0 &&
      item.currentRevenue === 0 &&
      item.progressPercentage === 0 &&
      !item.isAchieved &&
      !item.isRewarded
    );
  };

  const renderBonusItem = ({ item }) => {
    const bonusConfig = item.bonusConfiguration;
    const progressPercentage = Math.min(item.progressPercentage, 100);
    const status = item.isRewarded
      ? "Đã nhận thưởng"
      : item.isAchieved
      ? "Đã đạt"
      : "Đang thực hiện";

    return (
      <View style={styles.taskContainer}>
        {isNewTask(item) && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>Mới</Text>
          </View>
        )}
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{bonusConfig.bonusName}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {status}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {bonusConfig.description}
        </Text>

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Chuyến xe: {item.completedTrips}/{bonusConfig.targetTrips}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Doanh thu: {formatCurrency(item.currentRevenue)}/
              {formatCurrency(bonusConfig.revenueTarget)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="gift-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Thưởng: {formatCurrency(bonusConfig.bonusAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercentage}%`,
                backgroundColor: getStatusColor(status),
              },
            ]}
          />
        </View>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Kết thúc:{" "}
            {new Date(bonusConfig.endDate).toLocaleDateString("vi-VN")}
          </Text>
          {item.isRewarded && (
            <Text style={styles.dateText}>
              Nhận thưởng:{" "}
              {new Date(item.rewardedDate).toLocaleDateString("vi-VN")}
            </Text>
          )}
        </View>

        {item.isAchieved && !item.isRewarded && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => claimReward(item.driverBonusProgressId)}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.claimButtonText}>Nhận thưởng</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Tiến độ Nhận Thưởng</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Đang tải nhiệm vụ thưởng...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBonusTask}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bonusTask ? [bonusTask] : []}
          renderItem={renderBonusItem}
          keyExtractor={(item) => item.driverBonusProgressId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ribbon-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>Không có nhiệm vụ thưởng nào</Text>
              <Text style={styles.emptySubtext}>
                Hãy quay lại sau để nhận thêm cơ hội
              </Text>
            </View>
          }
        />
      )}
      {successMessage && (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorMessage}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF2",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 16,
    color: "#1A1F3C",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  taskContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: "relative",
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },
  newBadge: {
    position: "absolute",
    top: 5,
    right: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    elevation: 2,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1F3C",
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  taskDetails: {
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#4B5563",
    marginLeft: 8,
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#E8ECF2",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    borderRadius: 5,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: "#4B5563",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },
  errorMessage: {
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1F3C",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },
  claimButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  successMessage: {
    padding: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successText: {
    color: "#065F46",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
});

export default BonusScreen;
