import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { getUserInfo } from "../../services/ProfileService";

const { width } = Dimensions.get("window");

const HomeScreen = () => {
  const [userInfo, setUserInfo] = useState({});
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const navigation = useNavigation();
    const [userRole, setUserRole] = useState(null);

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

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const userRole = JSON.parse(userInfoString)?.data?.role;
      setUserRole(userRole); // Set role in stat
console.log(userRole);
      const data = await getUserInfo();
      setUserInfo(data);
    };
    fetchUserInfo();
  }, []);

  const banners = [
    { id: 1, image: require("../../assets/zzz.jpg") },
    { id: 2, image: require("../../assets/BgcLogin.jpg") },
    { id: 3, image: require("../../assets/ccc.jpg") },
  ];

  const bannersSale = [
    { id: 1, image: require("../../assets/saleRan.jpg") },
    { id: 2, image: require("../../assets/saleRan.jpg") },
    { id: 3, image: require("../../assets/saleRan.jpg") },
  ];

  const quickActionsCustomer = [
    {
      id: 1,
      icon: "car-outline",
      label: "Đặt xe",
      color: "#2563eb",
      navigate: "Booking",
    },
    {
      id: 2,
      icon: "gift-outline",
      label: "Khuyến mãi",
      color: "#dc2626",
      navigate: "Chat",
      hot: true,
    },
    {
      id: 3,
      icon: "home-outline",
      label: "Thêm nhà",
      color: "#16a34a",
      
    },
    {
      id: 4,
      icon: "chatbubble-outline",
      label: "Chat",
      color: "#eab308",
      navigate: "ChatDriver",
    },
  ];


  const quickActionsDriver = [
    {
      id: 1,
      icon: "calendar-outline", // Đổi từ car-outline sang calendar-outline cho "Đặt Lịch"
      label: "Đặt Lịch",
      color: "#2563eb",
      navigate: "Schedule",
    },
    {
      id: 2,
      icon: "clipboard-outline", // Đổi từ gift-outline sang clipboard-outline cho "Đơn Hàng Mới"
      label: "Đơn Hàng Mới",
      color: "#dc2626",
      navigate: "RightTrip",
    },
    {
      id: 3,
      icon: "list-outline", // Đổi từ home-outline sang list-outline cho "Danh Sách Hành Trình"
      label: "Danh Sách Hành Trình",
      color: "#16a34a",
      navigate: "ScheduleListScreen",
    },
    {
      id: 4,
      icon: "chatbubble-outline", // Đổi từ business-outline sang chatbubble-outline cho "Chat"
      label: "Chat",
      color: "#eab308",
      navigate: "ChatDriver",
    },
  
  
  ];
  const renderBanner = () => (
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
      style={styles.bannerContainer}
    >
      {banners.map((banner) => (
        <Image
          key={banner.id}
          source={banner.image}
          style={styles.bannerImage}
        />
      ))}
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.userSection}>
        <View>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.userName}>{userInfo.fullName || "User"}</Text>
        </View>
        <TouchableOpacity style={styles.pointsBadge}>
          <Text style={styles.pointsText}>12 ✓</Text>
        </TouchableOpacity>
      </View>

       {/* Check if userRole is 'CUSTOMER' */}
    {userRole === 'CUSTOMER' && (
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate("Booking")}
      >
        <Ionicons name="add-outline" size={24} color="#00b5ec" />
        <Text style={styles.searchText}>Tạo đơn hàng?</Text>
      </TouchableOpacity>

      
        )}

      {/* Nút Chat */}
      {/* <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => navigation.navigate("ChatDriver")}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#ffffff" />
        <Text style={styles.chatText}>Chat</Text>
      </TouchableOpacity> */}
    </View>
  );

  const renderQuickActions = () => {
    const quickActionsList =
      userRole === "DRIVER" ? quickActionsDriver : quickActionsCustomer;
  
    return (
      <View style={styles.quickActionsContainer}>
        {quickActionsList.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickAction}
            onPress={() => navigation.navigate(action.navigate)}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: `${action.color}15` },
              ]}
            >
              <Ionicons name={action.icon} size={24} color={action.color} />
              {action.hot && (
                <View style={styles.hotBadge}>
                  <Text style={styles.hotText}>Hot</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  

  const renderPromotions = () => (
    <View style={styles.promotionsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ưu đãi đặc biệt</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllButton}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
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
        contentContainerStyle={styles.promotionScroll}
      >
        {bannersSale.map((banner) => (
          <View key={banner.id} style={styles.promotionCard}>
            <Image source={banner.image} style={styles.promotionImage} />
          </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderBanner()}
        {renderHeader()}
        {renderQuickActions()}
        {renderPromotions()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  userSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#black", // Updated to primary color
  },
  pointsBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#00b5ec", // Updated to primary color
    borderRadius: 20,
  },
  pointsText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    marginTop: 8,
  },
  searchText: {
    marginLeft: 12,
    fontSize: 15,
    color: "#6b7280",
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quickAction: {
    alignItems: "center",
    width: (width - 40) / 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: "#4b5563",
    textAlign: "center",
  },
  hotBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#00b5ec", // Updated to primary color
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hotText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  promotionsContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6b7280", // Updated to primary color
  },
  seeAllButton: {
    fontSize: 14,
    color: "#00b5ec", // Updated to primary color
    fontWeight: "500",
  },
  promotionScroll: {
    paddingRight: 20,
  },
  promotionCard: {
    marginRight: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  promotionImage: {
    width: width - 40,
    height: (width - 40) * 0.5,
    borderRadius: 16,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#00b5ec", // Updated to primary color
  },
  bannerContainer: {
    width: width,
    height: 200,
  },
  bannerImage: {
    width: width,
    height: 200,
    resizeMode: "cover",
  },
  //----------chat
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00b5ec",
    padding: 12,
    borderRadius: 12,
    marginLeft: 10,
  },

  chatText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});

export default HomeScreen;
