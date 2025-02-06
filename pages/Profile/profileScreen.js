import React, { useContext, useState, useEffect, useCallback } from "react"; // Import useEffect
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../../contexts/AuthContext";
import { loadStatusDriverDocument } from "../../services/MenuService";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const [expandedItem, setExpandedItem] = useState(null);

  const handleLogout = () => {
    logout();
  };
  const [driverDocuments, setDriverDocuments] = useState({
    license: false,
    vehicle: false,
    identification: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        const data = await loadStatusDriverDocument();
        if (data) {
          setDriverDocuments(data);
        }
        setIsLoading(false);
      };

      fetchData();
      return () => {};
    }, [])
  );

  const sections = [
    {
      title: "Phần 1",
      items: [
        {
          id: 1,
          icon: "calendar-outline",
          label: "Đặt lịch",
          screen: "Schedule",
        },
        {
          id: 2,
          icon: "document-text-outline",
          label: "Hồ sơ Tài xế",
          subItems: [
            {
              id: 5,
              icon: "card-outline",
              label: "Căn cước công dân",
              screen: "CreateDriverIdentificationScreen",
              status: driverDocuments.identification,
            },
            {
              id: 6,
              icon: "car-outline",
              label: "Hồ sơ phương tiện",
              screen: "VehicleScreen",
              status: driverDocuments.vehicle,
            },
            {
              id: 7,
              icon: "document-outline",
              label: "Giấy phép lái xe",
              screen: "LicenseScreen",
              status: driverDocuments.license,
            },
          ],
        },
        { id: 3, icon: "person-add-outline", label: "Giới thiệu bạn bè" },
        {
          id: 4,
          icon: "car-sport-outline",
          label: "Xem đơn hàng",
          screen: "ViewTrip",
        },
      ],
    },
    {
      title: "Phần 2",
      items: [
        { id: 8, icon: "wallet-outline", label: "Quản lý thanh toán" },
        { id: 9, icon: "document-text-outline", label: "Thông tin hoá đơn" },
        { id: 10, icon: "bookmark-outline", label: "Địa chỉ đã lưu" },
        { id: 11, icon: "map-outline", label: "Đóng góp bản đồ" },
      ],
    },
  ];

  const renderSections = () => {
    return sections.map((section) => (
      <View key={section.title} style={styles.section}>
        {section.items.map((item) => (
          <View key={item.id}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                } else if (item.subItems) {
                  setExpandedItem(expandedItem === item.id ? null : item.id);
                }
              }}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color="#555" />
              </View>
              <Text style={styles.label}>{item.label}</Text>
              {(item.screen || item.subItems) && (
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#888"
                />
              )}
            </TouchableOpacity>

            {item.subItems &&
              expandedItem === item.id &&
              item.subItems.map((subItem) => (
                <TouchableOpacity
                  key={subItem.id}
                  style={{ flexDirection: "row", padding: 10, marginLeft: 20 }}
                  onPress={() => navigation.navigate(subItem.screen)}
                >
                  <View style={{ marginRight: 10 }}>
                    <Ionicons name={subItem.icon} size={20} color="#777" />
                  </View>
                  <Text style={{ flex: 1 }}>{subItem.label}</Text>
                  <Ionicons
                    name={
                      subItem.status
                        ? "checkmark-circle-outline"
                        : "close-circle-outline"
                    }
                    size={20}
                    color={subItem.status ? "green" : "orange"}
                  />
                </TouchableOpacity>
              ))}
          </View>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerContainer}>
          <Image
            source={require("../../assets/BgcLogin.jpg")}
            style={styles.headerImage}
          />
        </View>
        {renderSections()}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    width: "100%",
    height: 200,
    marginBottom: 20,
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  logoutContainer: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
