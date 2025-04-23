import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../../configUrl"; // Đảm bảo BASE_URL được định nghĩa đúng
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { getScheduleStatusText } from "../../components/StatusMapper";
import { useAlert } from "../../components/CustomAlert";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/schedule/getScheduleByToken`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const scheduleData = response.data.data || response.data;
      setSchedules(scheduleData);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      if (error.response?.status === 401) {
        showAlert({
          title: "Phiên đăng nhập hết hạn",
          message: "Vui lòng đăng nhập lại",
          type: "error",
          onConfirm: () => logout(),
        });
      } else {
        showAlert({
          title: "Lỗi",
          message: "Không thể tải danh sách lịch trình",
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      await axios.delete(`${BASE_URL}/api/schedule/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchedules(schedules.filter((schedule) => schedule.scheduleId !== scheduleId));
      showAlert({
        title: "Thành công",
        message: "Lịch trình đã được xóa.",
        type: "success",
      });
    } catch (error) {
      showAlert({
          title: "Lỗi",
          message: "Không thể xóa lịch trình khi đã nhận đơn.",
          type: "error",
        });
    }
  };

  const confirmDelete = (scheduleId) => {
    showAlert({
      title: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa lịch trình này?",
      type: "warning",
      showCancelButton: true,
      confirmText: "Xóa",
      cancelText: "Hủy",
      onConfirm: () => deleteSchedule(scheduleId),
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() =>
        navigation.navigate("OrderDriver", { scheduleId: item.scheduleId })
      }
    >
      <View style={styles.headerContainer}>
        <Text style={styles.scheduleId}>Chuyến #{item.scheduleId}</Text>
        <View
          style={[
            styles.statusBadge,
            getScheduleStatusText(item.status) === "Đang chờ giao hàng"
              ? styles.waitingStatus
              : styles.activeStatus,
          ]}
        >
          <Text style={styles.statusText}>
            {getScheduleStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={20} color="#007bff" />
        <View style={styles.locationDetails}>
          <Text style={styles.locationLabel}>Điểm Bắt Đầu:</Text>
          <Text style={styles.locationText}>{item.startLocationAddress}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="flag-outline" size={20} color="#28a745" />
        <View style={styles.locationDetails}>
          <Text style={styles.locationLabel}>Điểm Kết Thúc:</Text>
          <Text style={styles.locationText}>{item.endLocationAddress}</Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateDetail}>
          <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          <Text style={styles.dateText}>
            Bắt Đầu: {new Date(item.startDate).toLocaleString()}
          </Text>
        </View>
        <View style={styles.dateDetail}>
          <Ionicons name="time-outline" size={16} color="#6c757d" />
          <Text style={styles.dateText}>
            Kết Thúc: {new Date(item.endDate).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.capacityContainer}>
        <Ionicons name="cube-outline" size={16} color="#17a2b8" />
        <Text style={styles.capacityText}>
          Sức Chứa: {item.availableCapacity} Kg
        </Text>
      </View>

      {item.goodsImage && (
        <Image
          source={{ uri: item.goodsImage }}
          style={styles.goodsImage}
          resizeMode="cover"
        />
      )}

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(item.scheduleId)}
      >
        <Ionicons name="trash-outline" size={20} color="#dc3545" />
        <Text style={styles.deleteButtonText}>Xóa</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} />
        <Text style={styles.backButtonText}>Danh sách lịch trình</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={schedules}
          renderItem={renderItem}
          keyExtractor={(item) => item.scheduleId.toString()}
          contentContainerStyle={styles.listContainer}
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
  listContainer: {
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 18,
    color: "#343a40",
  },
  itemContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  scheduleId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#495057",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  waitingStatus: {
    backgroundColor: "#ffc107",
  },
  activeStatus: {
    backgroundColor: "#28a745",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationDetails: {
    marginLeft: 10,
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 15,
    color: "#343a40",
  },
  dateContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  dateDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6c757d",
  },
  capacityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  capacityText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#17a2b8",
  },
  goodsImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f8d7da",
    borderRadius: 5,
    alignSelf: "flex-end",
  },
  deleteButtonText: {
    marginLeft: 5,
    color: "#dc3545",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default ScheduleListScreen;