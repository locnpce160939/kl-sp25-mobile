import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
  Alert,
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
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../configUrl";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");
const BRAND_COLOR = "#00b5ec";

function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.account.id;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}
function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.account.role;
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
  const [role, setRole] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const lastSendTime = useRef(0);
  const sendInterval = 10000;

  const sendLocation = async () => {
    if (socket && socket.connected) {
      try {
        // Request permission first
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          console.error("Permission to access location was denied");
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;

        const payload = {
          messageType: "LOCATION_SEND",
          content: JSON.stringify({
            id: currentUserId.toString(),
            locationDriver: `${latitude},${longitude}`,
          }),
          room: currentUserId.toString(),
          username: `user_${currentUserId}`,
        };

        // Emit the location if socket is connected
        socket.emit("LOCATION_SEND", payload);
        console.log("Location sent:", payload);

        // Optionally, update UI with the location
        setLocation({
          latitude,
          longitude,
        });
      } catch (error) {
        //console.error("Error getting location:", error);
      }
    } else {
      //console.error("Socket is not connected.");
    }
  };

  useEffect(() => {
    const fetchTokenAndConnectSocket = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        const userInfo = JSON.parse(userInfoString);
        const accessToken = userInfo?.data?.access_token;

        if (accessToken) {
          const accountId = getUserIdFromToken(accessToken);
          setCurrentUserId(accountId);
          const role = getRoleFromToken(accessToken);
          setRole(role);

          if (accountId) {
            console.log("Connecting to room:", accountId.toString());
            const newSocket = io("wss://api.ftcs.online", {
              transports: ["websocket"],
              query: { username: "admin", room: accountId.toString() },
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

            newSocket.on("connect", () => {
              console.log("Socket connected successfully");
            });

            newSocket.on("connect_error", (error) => {
              console.error("Socket connection error:", error);
            });

            setSocket(newSocket);

            // Example of sending location every time the socket connects
            const sendIntervalId = setInterval(() => {
              // Only send location if the role is DRIVER
              if (role === "DRIVER") {
                console.log("Sending location as role is DRIVER");
                sendLocation();
              }
            }, sendInterval);

            // Cleanup the interval on component unmount
            return () => {
              clearInterval(sendIntervalId);
              if (newSocket) {
                newSocket.disconnect();
              }
            };
          }
        }
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };

    fetchTokenAndConnectSocket();

    // Clean up function for socket disconnection
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [role]); // Dependency on role to ensure the role value is considered in the effect

  // useEffect(() => {
  //   // Kết nối với Socket.IO server
  //   socketRef.current = io("wss://api.ftcs.online", {
  //     query: {
  //       username: "testDriver",
  //       room: "1029",
  //     },
  //     transports: ["websocket"],
  //     upgrade: false,
  //     forceNew: true,
  //   });
  //   socketRef.current.on("connect", () => {
  //     console.log("Socket.IO connected");
  //   });
  //   socketRef.current.on("LOCATION_SEND", (data) => {
  //     console.log("Received LOCATION_SEND event:", data);
  //     try {
  //       let locationData =
  //         typeof data.content === "string"
  //           ? JSON.parse(data.content)
  //           : data.content;
  //       if (locationData && locationData.locationDriver) {
  //         const [lat, lng] = locationData.locationDriver.split(",");
  //         setLocation({
  //           latitude: parseFloat(lat),
  //           longitude: parseFloat(lng),
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error processing location data:", error);
  //     }
  //   });
  //   socketRef.current.on("disconnect", () => {
  //     console.log("Socket.IO disconnected");
  //   });
  //   return () => {
  //     socketRef.current.disconnect();
  //   };
  // }, []);
  // const sendLocation = (latLng) => {
  //   const now = Date.now();
  //   if (now - lastSendTime.current >= sendInterval) {
  //     const payload = {
  //       messageType: "LOCATION_SEND",
  //       content: JSON.stringify({
  //         id: 1,
  //         locationDriver: `${latLng.latitude},${latLng.longitude}`,
  //       }),
  //     };
  //     console.log("Sending location:", payload);
  //     socketRef.current.emit("LOCATION_SEND", payload);
  //     lastSendTime.current = now;
  //   }
  // };
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
      setNotification(null);
    });
  };

  const acceptOrder = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (!notification?.id) {
        Alert.alert("Error", "No trip ID found in notification");
        return;
      }

      if (role !== "DRIVER") {
        Alert.alert("Error", "Only drivers can accept trips");
        return;
      }

      const userInfoString = await AsyncStorage.getItem("userInfo");
      const userInfo = JSON.parse(userInfoString);
      const token = userInfo?.data?.access_token;

      if (!token) {
        Alert.alert("Error", "Authentication required");
        return;
      }

      const response = await axios.get(
        `${BASE_URL}/api/trip-matching/accept/${notification.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        console.log("Trip accepted successfully:", response.data);
        Alert.alert("Success", "Trip accepted successfully");
        closeModal();
      }
    } catch (error) {
      console.error("Error accepting trip:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to accept trip"
      );
    } finally {
      setLoading(false);
    }
  };

  const declineOrder = () => {
    closeModal();
  };

  const toggleMapView = () => {
    if (
      notification?.customerStartLocation &&
      notification?.customerEndLocation
    ) {
      setShowMap(!showMap);
    }
  };

  const renderMapView = () => {
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
          pinColor="green"
        />
        <Marker
          coordinate={{ latitude: endLat, longitude: endLng }}
          title="End Point"
          pinColor="red"
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

            {showMap ? (
              renderMapView()
            ) : (
              <>
                <View style={styles.content}>
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

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={declineOrder}
                disabled={loading}
              >
                <AlertCircle size={16} color="#ff4d4f" />
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={toggleMapView}
                disabled={loading}
              >
                <Text style={styles.viewMapText}>
                  {showMap ? "Hide Map" : "View Map"}
                </Text>
              </TouchableOpacity>

              <LinearGradient
                colors={[BRAND_COLOR, `${BRAND_COLOR}dd`]}
                style={[styles.acceptButton, loading && styles.disabledButton]}
              >
                <TouchableOpacity
                  style={styles.acceptButtonContent}
                  onPress={acceptOrder}
                  disabled={loading}
                >
                  <CheckCircle2 size={16} color="#fff" />
                  <Text style={styles.acceptText}>
                    {loading ? "Accepting..." : "Accept"}
                  </Text>
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
  disabledButton: {
    opacity: 0.6,
  },
});

export default SocketNotification;
