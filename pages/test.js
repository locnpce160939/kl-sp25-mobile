import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  Dimensions,
  Keyboard,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import { debounce } from "lodash";
import Icon from "react-native-vector-icons/MaterialIcons";

const MapSearch = ({ onLocationSelect }) => {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef(null);

  const initialRegion = {
    latitude: 10.762622,
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Debounce search function to prevent too many API calls
  const searchPlaces = debounce(async (text) => {
    if (!text.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await axios.get(
        `YOUR_API_ENDPOINT/search?query=${encodeURIComponent(text)}`
      );

      if (response.data.code === 200 && response.data.data.results) {
        setSearchResults(response.data.data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  }, 500);

  const handleLocationSelect = (location) => {
    const { lat, lng } = location.geometry.location;

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address: location.formatted_address,
      name: location.name,
    });

    // Animate map to selected location
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );

    // Hide results
    setShowResults(false);
    Keyboard.dismiss();

    // Pass selected location to parent component if needed
    if (onLocationSelect) {
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        address: location.formatted_address,
        name: location.name,
        place_id: location.place_id,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            name="search"
            size={24}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm địa điểm..."
            value={searchText}
          />
        </View>
      </View>

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleLocationSelect(item)}
              >
                <Icon name="location-on" size={20} color="#666" />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress}>
                    {item.formatted_address}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map */}
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            title={selectedLocation.name}
            description={selectedLocation.address}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  resultsContainer: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "500",
  },
  resultAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});

export default MapSearch;
