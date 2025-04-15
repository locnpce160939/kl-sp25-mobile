import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import MapView, { Marker } from "react-native-maps";
import io from "socket.io-client";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../configUrl";
import {
  getTripBookingStatusText,
  getAgreementStatusText,
  getPaymentStatusText,
} from "../../components/StatusMapper"; // Import các hàm từ StatusMapper

const OrderDriver = ({ route }) => {
  const [userId, setUserId] = useState(null);
  const { scheduleId } = route.params;
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [location, setLocation] = useState({
    latitude: 10.762622,
    longitude: 106.660172,
  });
  const [location2, setLocation2] = useState({
    latitude: 10.762622,
    longitude: 106.660172,
  });
  const socketRef = useRef(null);
  const lastSendTime = useRef(0);
  const sendInterval = 1000;
  const navigation = useNavigation();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/tripBookings/schedule/${scheduleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // Thêm timeout để tránh treo
        }
      );

      if (response.data.code === 200) {
        setBookings(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        throw new Error("Dữ liệu từ server không đúng định dạng");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err.message);
      setError(err.message || "Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async (bookingId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/tripBookings/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data.code === 200 && response.data.data) {
        setSelectedBooking(response.data.data);

        const [latitude2, longitude2] =
          response.data.data.pickupLocation?.split(",") || [];
        if (latitude2 && longitude2) {
          setLocation2({
            latitude: parseFloat(latitude2),
            longitude: parseFloat(longitude2),
          });
        }
        setModalVisible(true);
      } else {
        throw new Error("Dữ liệu chi tiết đơn hàng không hợp lệ");
      }
    } catch (err) {
      console.error("Error fetching booking details:", err.message);
      Alert.alert("Lỗi", err.message || "Không thể tải chi tiết đơn hàng");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Không xác định";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCompleteTrip = async () => {
    try {
      if (!selectedBooking?.bookingId) {
        throw new Error("Không tìm thấy bookingId");
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await axios.put(
        `${BASE_URL}/api/tripBookings/updateStatus/${selectedBooking.bookingId}`,
        {
          status: "ORDER_COMPLETED", 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.code === 200) {
        Alert.alert("Thành công", "Hoàn tất chuyến đi");
        fetchBookings();
        setModalVisible(false);
      } else {
        throw new Error("Không thể cập nhật trạng thái chuyến đi");
      }
    } catch (err) {
      console.error("Error completing trip:", err.message);
      Alert.alert("Lỗi", err.message || "Không thể hoàn tất chuyến đi");
    }
  };

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        const userId = JSON.parse(userInfoString)?.data?.userId;
        setUserId(userId);
      } catch (error) {
        console.error("Error loading userId:", error);
      }
    };

    loadUserId();

    const newSocket = io("wss://api.ftcs.online", {
      transports: ["websocket"],
      query: {
        username: "testCustomer",
        room: userId,
      },
      upgrade: false,
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server Customer");
      console.log("Socket ID:", newSocket.id);
    });

    newSocket.on("LOCATION", (data) => {
      try {
        const locationData = JSON.parse(data.content);
        if (locationData && locationData.locationDriver) {
          const [lat, lng] = locationData.locationDriver.split(",").map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            setLocation({
              latitude: lat,
              longitude: lng,
            });
          }
        }
      } catch (error) {
        console.error("Error processing location data:", error);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      setTimeout(() => {
        newSocket.connect();
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]); // Thêm userId vào dependencies để khởi tạo socket khi userId thay đổi

  const renderBookingCard = (booking) => (
    <TouchableOpacity
      key={booking.bookingId}
      style={styles.card}
      onPress={() => fetchBookingDetails(booking.bookingId)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.bookingId}>Booking #{booking.bookingId}</Text>
        <Text style={styles.status}>
          {getTripBookingStatusText(booking.status)} {/* Áp dụng hàm ánh xạ */}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={20} color="#666" />
          <Text style={styles.locationText} numberOfLines={2}>
            Từ: {booking.startLocationAddress || "Không xác định"}
          </Text>
        </View>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={20} color="#666" />
          <Text style={styles.locationText} numberOfLines={2}>
            Đến: {booking.endLocationAddress || "Không xác định"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Loại: {booking.bookingType || "N/A"}</Text>
          <Text style={styles.label}>
            Trọng tải: {booking.capacity || "0"} Kg
          </Text>
        </View>
        <Text style={styles.date}>
          Ngày đặt: {formatDate(booking.bookingDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedBooking) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Icon name="local-taxi" size={24} color="#0066cc" />
                <Text style={styles.statusTitle}>
                  Trạng thái: {getTripBookingStatusText(selectedBooking.status)}
                </Text>
              </View>
              <View style={styles.bookingMeta}>
                <Text style={styles.bookingId}>
                  Booking #{selectedBooking.bookingId}
                </Text>
                <Text style={styles.bookingType}>
                  {selectedBooking.bookingType || "N/A"}
                </Text>
              </View>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Chi tiết chuyến đi</Text>
              <View style={styles.locationItem}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.startDot]} />
                  <View style={styles.verticalLine} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Điểm lấy hàng</Text>
                  <Text style={styles.locationAddress}>
                    {selectedBooking.startLocationAddress || "Không xác định"}
                  </Text>
                </View>
              </View>
              <View style={styles.locationItem}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.endDot]} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Điểm giao hàng</Text>
                  <Text style={styles.locationAddress}>
                    {selectedBooking.endLocationAddress || "Không xác định"}
                  </Text>
                </View>
              </View>
            </View>
            {selectedBooking.customer && (
              <View style={styles.detailCard}>
                <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Icon name="account-circle" size={40} color="#00b5ec" />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>
                      {selectedBooking.customer.fullName || "N/A"}
                    </Text>
                    <View style={styles.contactInfo}>
                      <Icon name="phone" size={16} color="#666" />
                      <Text style={styles.contactText}>
                        {selectedBooking.customer.phone || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Icon name="email" size={16} color="#666" />
                      <Text style={styles.contactText}>
                        {selectedBooking.customer.email || "N/A"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => {
                        navigation.navigate("ChatDriverReal", {
                          driverId: selectedBooking.customer.accountId,
                          driverName: selectedBooking.customer.fullName,
                          bookingId: selectedBooking.bookingId,
                        });
                      }}
                    >
                      <Icon name="chat" size={20} color="#fff" />
                      <Text style={styles.chatButtonText}>
                        Chat với khách hàng
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            {selectedBooking.tripAgreement && (
              <View style={styles.detailCard}>
                <Text style={styles.cardTitle}>Thông tin thỏa thuận</Text>
                <View style={styles.agreementGrid}>
                  <View style={styles.agreementItem}>
                    <Icon name="check-circle" size={20} color="#28a745" />
                    <Text style={styles.agreementLabel}>Trạng thái thỏa thuận</Text>
                    <Text style={styles.agreementValue}>
                      {getAgreementStatusText(
                        selectedBooking.tripAgreement.agreementStatus
                      )}
                    </Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Icon name="payment" size={20} color="#ffc107" />
                    <Text style={styles.agreementLabel}>
                      Trạng thái thanh toán
                    </Text>
                    <Text style={styles.agreementValue}>
                      {getPaymentStatusText(
                        selectedBooking.tripAgreement.paymentStatus
                      )}
                    </Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Icon name="timer" size={20} color="#17a2b8" />
                    <Text style={styles.agreementLabel}>Thời gian dự kiến</Text>
                    <Text style={styles.agreementValue}>
                      {selectedBooking.tripAgreement.estimatedDuration || 0} phút
                    </Text>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Ngày quan trọng</Text>
              <View style={styles.dateGrid}>
                <View style={styles.dateItem}>
                  <Icon name="event" size={20} color="#666" />
                  <Text style={styles.dateLabel}>Ngày đặt hàng</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.bookingDate)}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Icon name="event-busy" size={20} color="#dc3545" />
                  <Text style={styles.dateLabel}>Ngày hết hạn</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.expirationDate)}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Icon name="update" size={20} color="#666" />
                  <Text style={styles.dateLabel}>Cập nhật lần cuối</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.updateAt)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.mapToggleButton}
                onPress={() => setShowMap(!showMap)}
              >
                <Icon
                  name={showMap ? "map-off" : "map"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {showMap ? "Ẩn bản đồ" : "Hiện bản đồ"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleCompleteTrip}
              >
                <Icon name="check-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Hoàn tất chuyến đi</Text>
              </TouchableOpacity>
            </View>
            {showMap && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  showsUserLocation={true}
                  followsUserLocation={true}
                >
                  <Marker
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }}
                    title="Vị trí tài xế"
                    pinColor="#0066cc"
                  >
                    <Icon name="account-circle" size={40} color="#0066cc" />
                  </Marker>
                  {location2.latitude && location2.longitude && (
                    <Marker
                      coordinate={{
                        latitude: location2.latitude,
                        longitude: location2.longitude,
                      }}
                      title="Điểm lấy hàng"
                      pinColor="#28a745"
                    />
                  )}
                </MapView>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchBookings}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {bookings.length > 0 ? (
          bookings.map(renderBookingCard)
        ) : (
          <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
        )}
      </ScrollView>
      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    margin: 10,
    borderRadius: 10,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  status: {
    color: "#0066cc",
    fontWeight: "500",
  },
  cardContent: {
    gap: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  locationText: {
    flex: 1,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#666",
  },
  date: {
    color: "#666",
    fontSize: 12,
  },
  modalContainer: {
    marginTop: 24,
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#0066cc",
  },
  bookingMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingType: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  detailCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  locationItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationDot: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startDot: {
    backgroundColor: "#28a745",
  },
  endDot: {
    backgroundColor: "#dc3545",
  },
  verticalLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#e0e0e0",
    position: "absolute",
    top: 12,
    left: 11,
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: "#333",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatar: {
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  contactText: {
    marginLeft: 8,
    color: "#666",
  },
  agreementGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  agreementItem: {
    alignItems: "center",
    width: "30%",
  },
  agreementLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  agreementValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  dateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  dateItem: {
    alignItems: "center",
    width: "30%",
  },
  dateLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  dateValue: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: "#00b5ec",
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00b5ec",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  chatButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00b5ec",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: "center",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  mapContainer: {
    height: 400,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

export default OrderDriver;