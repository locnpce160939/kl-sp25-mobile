import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const handleLogout = () => {
    logout();
  };
  const handleNavigation = (label) => {
    if (label === "Hồ sơ Tài xế") {
      navigation.navigate("CreateDriverIdentificationScreen");
    }
  };

  const sections = [
    {
      title: "Phần 1",
      items: [
        { id: 1, icon: "calendar-outline", label: "Đặt lịch", screen: "Schedule" },
        { id: 2, icon: "business-outline", label: "Hồ sơ Tài xế" },
        { id: 3, icon: "person-add-outline", label: "Giới thiệu bạn bè" },
        { id: 4, icon: "card-outline", label: "Gói hội viên" },
        { id: 5, icon: "car-sport-outline", label: "Trở thành tài xế Xanh SM" },
        { id: 6, icon: "car-outline", label: "Hồ sơ phương tiện",screen: "VehicleScreen" },
        { id: 7, icon: "document-outline", label: "Giấy phép lái xe",screen: "LicenseScreen" },
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
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => handleNavigation(item.label)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={24} color="#555" />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            {item.screen && <Ionicons name="chevron-forward-outline" size={20} color="#888" />}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerContainer}>
          <Image source={require("../../assets/BgcLogin.jpg")} style={styles.headerImage} />
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
