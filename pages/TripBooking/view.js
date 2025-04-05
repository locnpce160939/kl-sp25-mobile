import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTripBookingStatusText } from "../../components/StatusMapper";

const TripCard = ({ booking }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.bookingId}>Booking #{booking.bookingId}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                booking.status === "Arranging driver" ? "#FFA500" : "#4CAF50",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {getTripBookingStatusText(booking?.status)}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{booking.bookingType}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Booking Date:</Text>
        <Text style={styles.value}>{formatDate(booking.bookingDate)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Pickup:</Text>
        <Text style={styles.value}>{booking.startLocationAddress}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Dropoff:</Text>
        <Text style={styles.value}>{booking.endLocationAddress}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Capacity:</Text>
        <Text style={styles.value}>{booking.capacity} kg</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Expiration:</Text>
        <Text style={styles.value}>{formatDate(booking.expirationDate)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Created:</Text>
        <Text style={styles.value}>{formatDate(booking.createAt)}</Text>
      </View>
    </View>
  );
};

const ViewTrip = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      let token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/tripBookings/getByAccountId`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.code === 200) {
        setBookings(response.data.data);
      } else {
        setError("Failed to fetch bookings");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No bookings found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.bookingId.toString()}
        renderItem={({ item }) => <TripCard booking={item} />}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchBookings}
      />
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    backgroundColor: "#fff",
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bookingId: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: 100,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    flex: 1,
    fontSize: 14,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
});

export default ViewTrip;
