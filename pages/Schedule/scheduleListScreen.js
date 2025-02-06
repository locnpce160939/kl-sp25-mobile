import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const ScheduleListScreen = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                // Lấy token từ AsyncStorage
                const token = await AsyncStorage.getItem("token");
                console.log("Token:", token); // Log token để kiểm tra
    
                // Kiểm tra nếu token không tồn tại
                if (!token) {
                    throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
                }
    
                // Gọi API để lấy dữ liệu lịch trình
                const response = await axios.get(`${BASE_URl}/api/schedule/getScheduleByToken`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("Response data:", response.data); // Log dữ liệu từ response
    
                // Kiểm tra cấu trúc dữ liệu trả về
                const scheduleData = response.data.data || response.data;
                console.log("Received data:", scheduleData); // Log dữ liệu nhận được
                console.log("Data type:", typeof scheduleData); // Kiểm tra kiểu dữ liệu
                console.log("Data length:", scheduleData.length); // Kiểm tra độ dài dữ liệu
                // Cập nhật state với dữ liệu nhận được
                setSchedules(scheduleData);
            } catch (error) {
                console.error("Error fetching schedules:", error); // Log lỗi
    
                // Xử lý lỗi từ phản hồi API
                if (error.response) {
                    console.error("Error response:", error.response.data);
    
                    // Xử lý lỗi 401 (Unauthorized)
                    if (error.response.status === 401) {
                        Alert.alert(
                            "Phiên đăng nhập hết hạn",
                            "Vui lòng đăng nhập lại",
                            [{ text: "OK", onPress: () => logout() }],
                            { cancelable: false }
                        );
                    } else {
                        Alert.alert("Lỗi", "Không thể tải danh sách lịch trình");
                    }
                } else {
                    Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến máy chủ");
                }
            } finally {
                // Dừng trạng thái loading
                setLoading(false);
            }
        };
    
        // Gọi hàm fetchSchedules
        fetchSchedules();
    }, []); // Dependency array rỗng để đảm bảo useEffect chỉ chạy một lần khi component mount

        // Kiểm tra nếu token không tồn tại
        if (!token) {
          throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
        }

        // Gọi API để lấy dữ liệu lịch trình
        const response = await axios.get(
          `${BASE_URl}/api/schedule/getScheduleByToken`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Full response:", response); // Log toàn bộ response
        console.log("Response data:", response.data); // Log dữ liệu từ response

        // Kiểm tra cấu trúc dữ liệu trả về
        const scheduleData = response.data.data || response.data;

        console.log("Received data:", scheduleData); // Log dữ liệu nhận được
        console.log("Data type:", typeof scheduleData); // Kiểm tra kiểu dữ liệu
        console.log("Data length:", scheduleData.length); // Kiểm tra độ dài dữ liệu

        // Cập nhật state với dữ liệu nhận được
        setSchedules(scheduleData);
      } catch (error) {
        console.error("Error fetching schedules:", error); // Log lỗi

        // Xử lý lỗi từ phản hồi API
        if (error.response) {
          console.error("Error response:", error.response.data);

          // Xử lý lỗi 401 (Unauthorized)
          if (error.response.status === 401) {
            Alert.alert(
              "Phiên đăng nhập hết hạn",
              "Vui lòng đăng nhập lại",
              [{ text: "OK", onPress: () => logout() }],
              { cancelable: false }
            );
          } else {
            Alert.alert("Lỗi", "Không thể tải danh sách lịch trình");
          }
        } else {
          Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối đến máy chủ");
        }
      } finally {
        // Dừng trạng thái loading
        setLoading(false);
      }
    };

    // Gọi hàm fetchSchedules
    fetchSchedules();
  }, []); // Dependency array rỗng để đảm bảo useEffect chỉ chạy một lần khi component mount

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() =>
        navigation.navigate("OrderDriver", { scheduleId: item.scheduleId })
      }
    >
      <View style={styles.headerContainer}>
        <Text style={styles.scheduleId}>Mã Lộ Trình #{item.scheduleId}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "Waiting for delivery"
              ? styles.waitingStatus
              : styles.activeStatus,
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
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
});

export default ScheduleListScreen;
