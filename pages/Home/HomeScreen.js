import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import Navigation from "../../navigation/Navigation";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { getUserInfo } from "../../services/ProfileService";
const { width } = Dimensions.get("window");

const HomeScreen = () => {
  const [userInfo, setUserInfo] = useState({});

  useEffect(() => {
    const fetchUserInfo = async () => {
      const data = await getUserInfo();
      setUserInfo(data);
    };

    fetchUserInfo();
  }, []);

  const navigation = useNavigation();

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const banners = [
    { id: 1, image: require("../../assets/BgcLogin.jpg") },
    { id: 2, image: require("../../assets/BgcLogin.jpg") },
    { id: 3, image: require("../../assets/BgcLogin.jpg") },
  ];

  const services = [
    // { id: 1, name: "Khuyến mãi", icon: require("../../assets/BgcLogin.jpg") },
    // { id: 2, name: "Xe máy", icon: require("../../assets/BgcLogin.jpg") },
    // { id: 3, name: "Taxi 👋", icon: require("../../assets/BgcLogin.jpg") },
    // { id: 4, name: "Xanh thổ địa", icon: require("../../assets/BgcLogin.jpg") },
    {
      id: 1,
      name: "Khuyến mãi",
      icon: require("../../assets/gift.png"),
      hot: true,
    },
    // { id: 6, name: "Gói hội viên", icon: require("../../assets/BgcLogin.jpg") },
    // { id: 7, name: "Xanh Tour", icon: require("../../assets/BgcLogin.jpg") },
  ];

  const renderHeader = () => (
    <View>
      <Image
        source={require("../../assets/BgcLogin.jpg")}
        style={styles.headerBanner}
        resizeMode="cover"
      />
    </View>
  );

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      let current = await Location.getCurrentPositionAsync({});
      if (status == "granted") {
        const storeCurrent = await AsyncStorage.setItem(
          "currentLocation",
          JSON.stringify(current.coords)
        );
      }
    })();
  }, []);

  const renderGreeting = () => (
    <View style={styles.greetingContainer}>
      <Text style={styles.greeting}>
        Xin chào, {userInfo.fullName || "User"}
      </Text>
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>12 ✓</Text>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate("Booking")}
      >
        <Ionicons name="add-outline" size={30} color="#888" />
        <Text style={styles.searchText}>Tạo đơn hàng?</Text>
      </TouchableOpacity>
      <View style={styles.quickAddressContainer} >
        <TouchableOpacity style={styles.quickAddressButton}>
          <Image
            source={require("../../assets/BgcLogin.jpg")}
            style={styles.addIcon}
          />
          <Text style={styles.quickAddressText}>Thêm Nhà</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.quickAddressButton}
          onPress={() => navigation.navigate("Test")}
        >
          <Image
            source={require("../../assets/BgcLogin.jpg")}
            style={styles.addIcon}
          />
          <Text style={styles.quickAddressText}>Thêm Công ty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAddressButton}>
          <Image
            source={require("../../assets/BgcLogin.jpg")}
            style={styles.addIcon}
          />
          <Text style={styles.quickAddressText}>Thêm</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );

  const renderServices = () => (
    <View style={styles.servicesGrid}>
      {services.map((service) => (
        <TouchableOpacity key={service.id} style={styles.serviceItem} onPress={() => navigation.navigate("Chat")}>
          <View style={styles.serviceIconContainer}>
            {service.hot && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotText}>Hot</Text>
              </View>
            )}
            <Image source={service.icon} style={styles.serviceIcon} />
          </View>
          <Text style={styles.serviceName}>{service.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPromotionBanner = () => (
    <View style={styles.bannerContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const slideIndex = Math.floor(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentBannerIndex(slideIndex);
        }}
      >
        {banners.map((banner) => (
          <Image
            key={banner.id}
            source={banner.image}
            style={styles.promotionBanner}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      <View style={styles.paginationContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentBannerIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderHeader()}
        {renderGreeting()}
        {renderSearchBar()}
        {renderServices()}
        {renderPromotionBanner()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  headerBanner: {
    width: "100%",
    height: 200,
  },
  greetingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  pointsBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    color: "#fff",
    fontWeight: "500",
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 26,
  },
  locationIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    tintColor: "#00b5ec",
  },
  searchText: {
    color: "#999",
    fontSize: 16,
  },
  quickAddressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00b5ec",
  },
  addIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    tintColor: "#00b5ec",
  },
  quickAddressText: {
    color: "#00b5ec",
    fontSize: 14,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  serviceItem: {
    width: "25%",
    alignItems: "center",
    padding: 8,
  },
  serviceIconContainer: {
    position: "relative",
    width: 56,
    height: 56,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  serviceIcon: {
    width: 32,
    height: 32,
  },
  serviceName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  hotBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hotText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  bannerContainer: {
    position: "relative",
    marginTop: 16,
  },
  promotionBanner: {
    width: width - 32,
    height: 160,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff80",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#fff",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
  },
  navIcon: {
    width: 24,
    height: 24,
    tintColor: "#999",
  },
  activeNavIcon: {
    tintColor: "#00b5ec",
  },
  navText: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
  activeNavText: {
    color: "#00b5ec",
  },
});

export default HomeScreen;
