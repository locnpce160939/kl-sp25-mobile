import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Navigation,
  MapPin,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react-native";
import io from "socket.io-client";
import { Audio } from "expo-av";
import MapView, { Marker } from "react-native-maps"; // Add this import
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BRAND_COLOR = "#00b5ec";
const GOOGLE_MAPS_APIKEY = "t0vRyftUba3uIEnx5JlMJta2ff3B03BEUVg0xHWw"; // Replace with your actual API key

// Hàm trích xuất accountId từ token
function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.account.id; // Trả về accountId
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}
const LocationRow = ({ icon, text }) => (
  <View style={styles.locationRow}>
    <View style={styles.locationIcon}>
      {React.cloneElement(icon, { color: BRAND_COLOR })}
    </View>
    <Text style={styles.locationText} numberOfLines={2}>
      {text}
    </Text>
  </View>
);

const InfoBox = ({ icon, value, label }) => (
  <View style={styles.infoBox}>
    {React.cloneElement(icon, { color: BRAND_COLOR })}
    <Text style={styles.infoValue}>{value}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const SocketNotification = () => {
  const [notification, setNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];
  const [sound, setSound] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchTokenAndConnectSocket = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        const accessToken = JSON.parse(userInfoString)?.data?.access_token;

        if (accessToken) {
          const accountId = getUserIdFromToken(accessToken);
          setCurrentUserId(accountId);

          if (accountId) {
            console.log("room", accountId.toString());
            // Kết nối WebSocket với accountId làm room
            const newSocket = io("wss://api.ftcs.online", {
              transports: ["websocket"],
              query: { username: "admin", room: accountId.toString() }, // Sử dụng accountId thay vì "1"
              upgrade: false,
            });

            newSocket.on("NOTIFICATION", async (data) => {
              try {
                const parsedContent = JSON.parse(data.content);
                setNotification(parsedContent);
                setModalVisible(true);
                Animated.spring(slideAnim, {
                  toValue: 1,
                  useNativeDriver: true,
                  friction: 8,
                  tension: 40,
                }).start();
                await playNotificationSound();
              } catch (error) {
                console.error("Error parsing notification:", error);
              }
            });

            setSocket(newSocket);
          }
        }
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };

    fetchTokenAndConnectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  async function playNotificationSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/NoDon.mp3"),
        { shouldPlay: true }
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setShowMap(false);
    });
  };

  const acceptOrder = () => {
    console.log("Order accepted:", notification);
    closeModal();
  };

  const declineOrder = () => {
    console.log("Order declined");
    closeModal();
  };

  const toggleMapView = () => {
    // Chỉ cho phép toggle nếu có location
    if (
      notification?.customerStartLocation &&
      notification?.customerEndLocation
    ) {
      setShowMap(!showMap);
    }
  };

  const renderMapView = () => {
    // Split the string into latitude and longitude
    const [startLat, startLng] = notification.customerStartLocation
      .split(",")
      .map(parseFloat);
    const [endLat, endLng] = notification.customerEndLocation
      .split(",")
      .map(parseFloat);

    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (startLat + endLat) / 2,
          longitude: (startLng + endLng) / 2,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <Marker
          coordinate={{ latitude: startLat, longitude: startLng }}
          title="Start Point"
          pinColor="green" // Green color for start point
        />
        <Marker
          coordinate={{ latitude: endLat, longitude: endLng }}
          title="End Point"
          pinColor="red" // Red color for end point
        />
      </MapView>
    );
  };
  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
      animationType="none"
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.modalView,
            {
              opacity: slideAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.container}>
            {/* Header remains the same as previous version */}
            <LinearGradient
              colors={[BRAND_COLOR, `${BRAND_COLOR}dd`]}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Navigation size={18} color="#fff" />
                  <Text style={styles.title}>New Trip Request</Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.closeButton}
                >
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Conditionally render map or content */}
            {showMap ? (
              renderMapView()
            ) : (
              <>
                <View style={styles.content}>
                  {/* Previous location and info content */}
                  <LocationRow
                    icon={<MapPin size={16} />}
                    text={
                      notification?.customerStartLocationAddress || "Loading..."
                    }
                  />
                  <View style={styles.divider} />
                  <LocationRow
                    icon={<Navigation size={16} />}
                    text={
                      notification?.customerEndLocationAddress || "Loading..."
                    }
                  />

                  <View style={styles.infoContainer}>
                    <InfoBox
                      icon={<Star size={16} />}
                      value={notification?.totalCustomerPoints || "0"}
                      label="Rating"
                    />
                    <InfoBox
                      icon={<Clock size={16} />}
                      value="~15"
                      label="min"
                    />
                    <InfoBox
                      icon={<Navigation size={16} />}
                      value="2.5"
                      label="km"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Button row with View Map toggle */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={declineOrder}
              >
                <AlertCircle size={16} color="#ff4d4f" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={toggleMapView}
              >
                <Text style={styles.viewMapText}>
                  {showMap ? "Hide Map" : "View Map"}
                </Text>
              </TouchableOpacity>

              <LinearGradient
                colors={[BRAND_COLOR, `${BRAND_COLOR}dd`]}
                style={styles.acceptButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  style={styles.acceptButtonContent}
                  onPress={acceptOrder}
                >
                  <CheckCircle2 size={16} color="#fff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
  modalView: {
    margin: 20,
  },
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    width: width * 0.85,
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: BRAND_COLOR,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    minHeight: 44,
    paddingVertical: 8,
  },
  locationIcon: {
    width: 24,
    alignItems: "center",
    paddingTop: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${BRAND_COLOR}22`,
  },
  infoBox: {
    alignItems: "center",
    gap: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
  },
  buttonRow: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4d4f",
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  acceptButtonContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  declineText: {
    color: "#ff4d4f",
    fontSize: 14,
    fontWeight: "500",
  },
  acceptText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  map: {
    width: "100%",
    height: 300,
  },
  viewMapButton: {
    flex: 1,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  viewMapText: {
    color: BRAND_COLOR,
    fontSize: 14,
    fontWeight: "500",
  },
  mapContainer: {
    width: "100%",
    height: 300,
  },
});

export default SocketNotification;
