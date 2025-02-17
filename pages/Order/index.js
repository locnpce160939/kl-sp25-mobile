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
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import MapView, { Marker } from "react-native-maps";
import io from "socket.io-client";
import { useNavigation } from "@react-navigation/native";
import { CloudCog } from "lucide-react-native";
import { BASE_URl } from "../../configUrl";
import { FlatList, GestureHandlerRootView } from "react-native-gesture-handler";
const Order = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [location, setLocation] = useState({
    latitude: 10.762622,
    longitude: 106.660172,
  });
  const [rating, setRating] = useState(1);
  const [comment, setComment] = useState("");
  const socketRef = useRef(null);
  const lastSendTime = useRef(0);
  const sendInterval = 1000;
  useEffect(() => {
    fetchBookings();
  }, []);
  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        "https://api.ftcs.online/api/tripBookings/getByAccountId",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.code === 200) {
        setBookings(response.data.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const fetchBookingDetails = async (bookingId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URl}/api/tripBookings/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.code === 200) {
        setSelectedBooking(response.data.data);
        setModalVisible(true);
        // Fetch reviews when booking details are loaded
        if (response.data.data.driver) {
          fetchReviews(response.data.data.driver.accountId);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  useEffect(() => {
    // Khởi tạo kết nối socket
    const newSocket = io("wss://api.ftcs.online", {
      transports: ["websocket"],
      query: {
        username: "testCustomer",
        room: "1028",
      },
      upgrade: false,
    });
    // Xử lý kết nối thành công
    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server Customer");
      console.log("Socket ID:", newSocket.id);
      console.log("====================================");
    });
    // Lắng nghe sự kiện LOCATION
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
    // Xử lý các sự kiện lỗi
    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      // Thử kết nối lại sau 5 giây
      setTimeout(() => {
        newSocket.connect();
      }, 5000);
    });
    setSocket(newSocket);
    // Cleanup khi component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);
  const renderBookingCard = (booking) => (
    <TouchableOpacity
      key={booking.bookingId}
      style={styles.card}
      onPress={() => fetchBookingDetails(booking.bookingId)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.bookingId}>Booking #{booking.bookingId}</Text>
        <Text style={styles.status}>{booking.status}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={20} color="#666" />
          <Text style={styles.locationText} numberOfLines={2}>
            From: {booking.startLocationAddress}
          </Text>
        </View>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={20} color="#666" />
          <Text style={styles.locationText} numberOfLines={2}>
            To: {booking.endLocationAddress}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type: {booking.bookingType}</Text>
          <Text style={styles.label}>Capacity: {booking.capacity}</Text>
        </View>
        <Text style={styles.date}>
          Booking Date: {formatDate(booking.bookingDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          <Icon
            name={i <= rating ? "star" : "star-border"}
            size={40}
            color={i <= rating ? "#FFD700" : "#e0e0e0"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const handleRating = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${BASE_URl}/api/review/create/${selectedBooking.bookingId}`,
        {
          rating: rating,
          reviewText: comment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.code === 200) {
        setComment("");
        setRating(1);
        Alert.alert("Rating submitted successfully!");
        setModalVisible(false);
        fetchBookings();
      }
    } catch (err) {
      console.error("Error rating booking:", err);
    }
  };

  // Add new function to fetch reviews
  const fetchReviews = async (driverId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URl}/api/review/driver/${driverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.code === 200) {
        setReviews(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  // Add review history section to the modal content
  const renderReviewHistory = () => (
    <View style={styles.detailCardReview}>
      <Text style={styles.cardTitle}>Lịch sử đánh giá</Text>
      {reviews.map((review, index) => (
        <View key={index} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{review.fullName}</Text>
            <View style={styles.ratingContainer}>
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name={i < review.rating ? "star" : "star-border"}
                  size={16}
                  color={i < review.rating ? "#FFD700" : "#e0e0e0"}
                />
              ))}
            </View>
          </View>
          {review.reviewText && (
            <Text style={styles.reviewText}>{review.reviewText}</Text>
          )}
          <Text style={styles.reviewDate}>{formatDate(review.createAt)}</Text>
        </View>
      ))}
    </View>
  );

  const renderDetailModal = () => {
    const navigation = useNavigation();
    if (!selectedBooking) return null;
    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Booking Details</Text>
          </View>
          <ScrollView style={styles.modalContent}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Icon name="local-taxi" size={24} color="#00b5ec" />
                <Text style={styles.statusTitle}>
                  Status: {selectedBooking.status}
                </Text>
              </View>
              <View style={styles.bookingMeta}>
                <Text style={styles.bookingId}>
                  Booking #{selectedBooking.bookingId}
                </Text>
                <Text style={styles.bookingType}>
                  {selectedBooking.bookingType}
                </Text>
              </View>
            </View>
            {/* Location Card */}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Trip Details</Text>
              <View style={styles.locationItem}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.startDot]} />
                  <View style={styles.verticalLine} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Pickup Location</Text>
                  <Text style={styles.locationAddress}>
                    {selectedBooking.startLocationAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.locationItem}>
                <View style={styles.locationDot}>
                  <View style={[styles.dot, styles.endDot]} />
                </View>
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Dropoff Location</Text>
                  <Text style={styles.locationAddress}>
                    {selectedBooking.endLocationAddress}
                  </Text>
                </View>
              </View>
            </View>
            {/* Driver Card */}
            {selectedBooking.driver && (
              <View style={styles.detailCard}>
                <Text style={styles.cardTitle}>Driver Information</Text>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Icon name="account-circle" size={40} color="#00b5ec" />
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>
                      {selectedBooking.driver.fullName}
                    </Text>
                    <View style={styles.contactInfo}>
                      <Icon name="phone" size={16} color="#666" />
                      <Text style={styles.contactText}>
                        {selectedBooking.driver.phone}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Icon name="email" size={16} color="#666" />
                      <Text style={styles.contactText}>
                        {selectedBooking.driver.email}
                      </Text>
                    </View>

                    {/* Thêm nút chat */}
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => {
                        console.log("Booking ID:", selectedBooking.bookingId); // This will show the correct booking ID
                        navigation.navigate("ChatCustomer", {
                          driverId: selectedBooking.driver.accountId, // Changed from id to accountId
                          driverName: selectedBooking.driver.fullName,
                          bookingId: selectedBooking.bookingId,
                        });
                      }}
                    >
                      <Icon name="chat" size={20} color="#fff" />
                      <Text style={styles.chatButtonText}>
                        Chat with Driver
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            {/* Trip Agreement Card */}
            {selectedBooking.tripAgreement && (
              <View style={styles.detailCard}>
                <Text style={styles.cardTitle}>Trip Agreement</Text>
                <View style={styles.agreementGrid}>
                  <View style={styles.agreementItem}>
                    <Icon name="check-circle" size={20} color="#28a745" />
                    <Text style={styles.agreementLabel}>Agreement Status</Text>
                    <Text style={styles.agreementValue}>
                      {selectedBooking.tripAgreement.agreementStatus}
                    </Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Icon name="payment" size={20} color="#ffc107" />
                    <Text style={styles.agreementLabel}>Payment Status</Text>
                    <Text style={styles.agreementValue}>
                      {selectedBooking.tripAgreement.paymentStatus}
                    </Text>
                  </View>
                  <View style={styles.agreementItem}>
                    <Icon name="timer" size={20} color="#17a2b8" />
                    <Text style={styles.agreementLabel}>Duration</Text>
                    <Text style={styles.agreementValue}>
                      {selectedBooking.tripAgreement.estimatedDuration} mins
                    </Text>
                  </View>
                </View>
              </View>
            )}
            {/* Dates Card */}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Important Dates</Text>
              <View style={styles.dateGrid}>
                <View style={styles.dateItem}>
                  <Icon name="event" size={20} color="#666" />
                  <Text style={styles.dateLabel}>Booking Date</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.bookingDate)}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Icon name="event-busy" size={20} color="#dc3545" />
                  <Text style={styles.dateLabel}>Expiration</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.expirationDate)}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Icon name="update" size={20} color="#666" />
                  <Text style={styles.dateLabel}>Last Updated</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedBooking.updateAt)}
                  </Text>
                </View>
              </View>
            </View>
            {/* Location Tracking */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.mapToggleButton}
                onPress={() => setShowMap(!showMap)}
              >
                {!showMap && <Icon name={"map"} size={20} color="#fff" />}
                <Text style={styles.buttonText}>
                  {showMap ? "Ẩn vị trí tài xế" : "Hiện vị trí tài xế"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Map View */}
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
                    title="Driver Location"
                    pinColor="#00b5ec"
                  >
                    <Icon name="account-circle" size={40} color="#00b5ec" />
                  </Marker>
                </MapView>
              </View>
            )}
            <View>
              <View style={styles.modalContentRate}>
                {/* Avatar Circle */}
                <View style={styles.avatarContainer}>
                  <Icon name="account-circle" size={80} color="#00b5ec" />
                </View>
                {/* Driver Name */}
                <Text style={styles.driverName}>
                  {selectedBooking.driver.fullName}
                </Text>
                {/* Star Rating */}
                <View style={styles.starContainer}>{renderStars()}</View>
                {/* Comments Section */}
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Viết đánh giá của bạn</Text>
                  <TextInput
                    style={styles.commentInput}
                    s
                    placeholder="Đánh giá..."
                    placeholderTextColor="#9E9E9E"
                    multiline={true}
                    numberOfLines={4}
                    value={comment}
                    onChangeText={setComment}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => handleRating()}
                >
                  <Text style={styles.submitButtonText}>Xác nhận</Text>
                </TouchableOpacity>
                {renderReviewHistory()}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00b5ec" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <ScrollView>{bookings.map(renderBookingCard)}</ScrollView>
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
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 100,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  status: {
    color: "#00b5ec",
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
    color: "#00b5ec",
  },
  bookingMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingId: {
    fontSize: 16,
    fontWeight: "500",
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
    margintop: 6,
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
  //_____chat
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

  // Button
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
    height: 400, // Fixed height for the map container
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  // Rating Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 4, 4, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContentRate: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: "#4285F4",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#9e9e9e",
    fontSize: 14,
  },
  driverName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  starContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    gap: 8,
  },
  commentSection: {
    width: "100%",
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  commentInput: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#00b5ec",
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  detailCardReview: {
    marginTop: 26,
    width: "100%",
    justifyContent: "center",
  },
});
export default Order;
