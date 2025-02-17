import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URl } from "../../configUrl";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getTripBookingStatusText } from '../../components/StatusMapper';

const RightTrip = () => {
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchTripData();
  }, []);

  const fetchTripData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${BASE_URl}/api/trip-matching`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (response.status === 200) {
        setTripData(response.data.data);
        if (response.data.data.length === 0) {
          setError("No trips found");
        }
      } else {
        setError("Failed to fetch data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URl}/api/trip-matching/accept/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 200) {
        alert("Success", response.data.data);
        fetchTripData();
      } else {
        alert("Failed to accept trip");
        fet;
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error accepting trip");
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-GB"); // dd/mm/yyyy
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} ${formattedTime}`;
  };

  // Render list item (compact view)
  const renderTripItem = (trip) => (
    <TouchableOpacity
      key={trip.id}
      style={styles.tripCard}
      onPress={() => {
        setSelectedTrip(trip);
        setModalVisible(true);
      }}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripId}>Trip #{trip.id}</Text>
        <Text
          style={[
            styles.status,
            { color: trip.sameDirection ? "#28a745" : "#dc3545" },
          ]}
        >
          {trip.sameDirection ? "Same Direction" : "Different Direction"}
        </Text>
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.locationText} numberOfLines={1}>
          From: {trip.customerStartLocationAddress}
        </Text>
        <Text style={styles.locationText} numberOfLines={1}>
          To: {trip.customerEndLocationAddress}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Modal content
  const renderModalContent = () => {
    if (!selectedTrip) return null;

    return (
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <Icon name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Booking details</Text>
        </View>

        <ScrollView style={styles.modalScroll}>
          {/* Pickup Location */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>You're picking up at</Text>
            <View style={styles.modalLocationBox}>
              <Icon
                name="location-on"
                size={24}
                color="#00b5ec"
                style={styles.locationIcon}
              />
              <Text style={styles.modalLocationText}>
                {selectedTrip.driverStartLocationAddress}
              </Text>
            </View>
          </View>

          {/* Destination */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>
              Your customer is going to
            </Text>
            <View style={styles.modalLocationBox}>
              <Icon
                name="location-on"
                size={24}
                color="#00b5ec"
                style={styles.locationIcon}
              />
              <Text style={styles.modalLocationText}>
                {selectedTrip.customerEndLocationAddress || "Not specified"}
              </Text>
            </View>
          </View>

          {/* Common Points */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Common points</Text>
            <View style={styles.timingContainer}>
              <View style={styles.timeBox}>
                <Icon name="schedule" size={20} color="#00b5ec" />
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Pickup</Text>
                  <Text style={styles.timeValue}>
                    {formatDateTime(selectedTrip.startTime) || "5:20 PM"}
                  </Text>
                </View>
              </View>
              <View style={styles.timeBox}>
                <Icon name="schedule" size={20} color="#00b5ec" />
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Dropoff</Text>
                  <Text style={styles.timeValue}>
                    {formatDateTime(selectedTrip.endTime) || "5:30 PM"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Status</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineIconContainer}>
                  <View style={styles.timelineIconWrapper}>
                    <Icon name="local-taxi" size={20} color="#00b5ec" />
                  </View>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineText}>
                    {getTripBookingStatusText('ARRANGING_DRIVER')}
                  </Text>
                  <Text style={styles.timelineTime}>
                    {formatDateTime(selectedTrip.updateAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.timelineItem}>
                <View style={styles.timelineIconContainer}>
                  <View style={styles.timelineIconWrapper}>
                    <Icon name="update" size={20} color="#00b5ec" />
                  </View>
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineText}>Update</Text>
                  <Text style={styles.timelineTime}>
                    {formatDateTime(selectedTrip.updateAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.timelineItem}>
                <View style={styles.timelineIconContainer}>
                  <View style={styles.timelineIconWrapper}>
                    <Icon name="fiber-new" size={20} color="#00b5ec" />
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineText}>Created</Text>
                  <Text style={styles.timelineTime}>
                    {formatDateTime(selectedTrip.createAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton]}
              onPress={() => alert("Deny trip")}
            >
              <Text style={styles.buttonText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(selectedTrip.id)}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>{tripData && tripData.map(renderTripItem)}</ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        {renderModalContent()}
      </Modal>
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
  tripCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  tripInfo: {
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
  },
  // Modal Styles
  modalContent: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomColor: "#e0e0e0",
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "black",
    marginLeft: 16,
  },
  modalScroll: {
    flex: 1,
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
    marginBottom: 12,
  },
  modalLocationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  locationIcon: {
    marginRight: 12,
  },
  modalLocationText: {
    flex: 1,
    color: "black",
    fontSize: 14,
    lineHeight: 20,
  },
  timingContainer: {
    flexDirection: "row",
    gap: 12,
  },
  timeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  timeInfo: {
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
  },
  timeValue: {
    fontSize: 14,
    color: "black",
    fontWeight: "500",
  },
  timeline: {
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 24,
  },
  timelineIconContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  timelineIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  activeIcon: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: "#e0e0e0",
    position: "absolute",
    top: 20,
    left: 9,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    color: "black",
    fontSize: 14,
    fontWeight: "500",
  },
  timelineTime: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  denyButton: {
    backgroundColor: "#ccc",
  },
  acceptButton: {
    backgroundColor: "#00b5ec",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RightTrip;
