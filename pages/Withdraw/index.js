import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import {
  MaterialIcons,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import axios from "axios";
import { BASE_URl } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BANKS = [
  {
    id: "VIETCOMBANK",
    name: "Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam",
  },
  { id: "BIDV", name: "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  {
    id: "VIETINBANK",
    name: "VietinBank - Ngân hàng TMCP Công Thương Việt Nam",
  },
  {
    id: "AGRIBANK",
    name: "Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam",
  },
  {
    id: "TECHCOMBANK",
    name: "Techcombank - Ngân hàng TMCP Kỹ Thương Việt Nam",
  },
  { id: "MBBANK", name: "MB Bank - Ngân hàng TMCP Quân đội" },
  { id: "TPBANK", name: "TPBank - Ngân hàng TMCP Tiên Phong" },
  { id: "ACB", name: "ACB - Ngân hàng TMCP Á Châu" },
  { id: "VPBANK", name: "VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { id: "SACOMBANK", name: "Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín" },
  { id: "HDBANK", name: "HDBank - Ngân hàng TMCP Phát triển TP Hồ Chí Minh" },
  { id: "OCEANBANK", name: "OceanBank - Ngân hàng TMCP Đại Dương" },
  { id: "EXIMBANK", name: "Eximbank - Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam" },
  { id: "SHB", name: "SHB - Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { id: "MSB", name: "MSB - Ngân hàng TMCP Hàng Hải Việt Nam" },
  { id: "OCB", name: "OCB - Ngân hàng TMCP Phương Đông" },
  { id: "ABBANK", name: "ABBank - Ngân hàng TMCP An Bình" },
  { id: "BAOVIETBANK", name: "BaoVietBank - Ngân hàng TMCP Bảo Việt" },
  { id: "VIETABANK", name: "VietABank - Ngân hàng TMCP Việt Á" },
  { id: "NAMABANK", name: "NamABank - Ngân hàng TMCP Nam Á" },
  { id: "SEABANK", name: "SeABank - Ngân hàng TMCP Đông Nam Á" },
  { id: "VIETBANK", name: "VietBank - Ngân hàng TMCP Việt Nam Thương Tín" },
  { id: "LPB", name: "LPBank - Ngân hàng TMCP Bưu điện Liên Việt" },
  { id: "NCB", name: "NCB - Ngân hàng TMCP Quốc Dân" },
  { id: "PGBANK", name: "PGBank - Ngân hàng TMCP Xăng dầu Petrolimex" },
  { id: "KIENLONGBANK", name: "KienlongBank - Ngân hàng TMCP Kiên Long" },
  { id: "DONGABANK", name: "DongABank - Ngân hàng TMCP Đông Á" },
  { id: "GPBank", name: "GPBank - Ngân hàng TMCP Dầu khí Toàn Cầu" },
  { id: "BACABANK", name: "BacABank - Ngân hàng TMCP Bắc Á" },
  { id: "SAIGONBANK", name: "SaigonBank - Ngân hàng TMCP Sài Gòn Công Thương" },
  { id: "PVCOMBANK", name: "PVcomBank - Ngân hàng TMCP Đại Chúng Việt Nam" },
  { id: "CAKE", name: "CAKE by VPBank - Ngân hàng số" },
  { id: "TIMO", name: "Timo - Ngân hàng số" },
  { id: "TNEX", name: "TNEX - Ngân hàng số MSB" },
  { id: "UBANK", name: "Ubank - Ngân hàng số VPBank" },
  { id: "WOORI", name: "Woori Bank - Ngân hàng TNHH MTV Woori Việt Nam" },
  { id: "SHINHAN", name: "Shinhan Bank - Ngân hàng TNHH MTV Shinhan Việt Nam" },
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const Withdraw = () => {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Animation value for bottom sheet
  const bottomSheetAnimation = useRef(new Animated.Value(0)).current;

  const validateForm = () => {
    const errors = {};

    if (!amount || parseFloat(amount.replace(/[,.]/g, "")) <= 0) {
      errors.amount = "Vui lòng nhập số tiền hợp lệ";
    }

    if (!bankName) {
      errors.bankName = "Vui lòng chọn ngân hàng";
    }

    if (!bankAccountNumber || bankAccountNumber.length < 8) {
      errors.bankAccountNumber = "Vui lòng nhập số tài khoản hợp lệ";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatCurrency = (value) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");

    // Format with commas
    if (numericValue) {
      const formatted = Number(numericValue).toLocaleString("vi-VN");
      return formatted;
    }
    return "";
  };

  const handleAmountChange = (text) => {
    const formattedValue = formatCurrency(text);
    setAmount(formattedValue);
  };

  const handleWithdraw = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const numericAmount = parseFloat(amount.replace(/[,.]/g, ""));
      let token = await AsyncStorage.getItem("token");

      const response = await axios.post(
        `${BASE_URl}/api/withdraw`,
        {
          amount: numericAmount,
          bankName,
          bankAccountNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      Alert.alert("Thành công", "Yêu cầu rút tiền của bạn đã được xử lý", [
        { text: "OK", onPress: () => resetForm() },
      ]);
    } catch (error) {
      console.error("Withdraw error:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Đã xảy ra lỗi khi xử lý yêu cầu rút tiền";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setBankName("");
    setBankAccountNumber("");
    setFormErrors({});
  };

  const openBottomSheet = () => {
    setShowBottomSheet(true);
    Animated.timing(bottomSheetAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(bottomSheetAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
    });
  };

  const selectBank = (bank) => {
    setBankName(bank.id);
    closeBottomSheet();
  };

  const getSelectedBankName = () => {
    const selected = BANKS.find((bank) => bank.id === bankName);
    return selected ? selected.name : "Chọn ngân hàng";
  };

  // Bottom sheet translation
  const translateY = bottomSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  // Background opacity for modal backdrop
  const backdropOpacity = bottomSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Rút tiền</Text>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Số tiền rút</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="attach-money"
            size={20}
            color="#555"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="Nhập số tiền"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          <Text style={styles.currencyLabel}>VND</Text>
        </View>
        {formErrors.amount ? (
          <Text style={styles.errorText}>{formErrors.amount}</Text>
        ) : null}
        <Text style={styles.minAmount}>Số tiền tối thiểu: 100,000 VND</Text>
      </View>

      {/* Bank Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ngân hàng</Text>
        <TouchableOpacity
          style={styles.bankSelector}
          onPress={openBottomSheet}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="bank"
            size={20}
            color="#555"
            style={styles.inputIcon}
          />
          <Text
            style={[
              styles.bankSelectorText,
              bankName ? styles.selectedText : null,
            ]}
          >
            {getSelectedBankName()}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color="#555" />
        </TouchableOpacity>
        {formErrors.bankName ? (
          <Text style={styles.errorText}>{formErrors.bankName}</Text>
        ) : null}
      </View>

      {/* Account Number Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Số tài khoản</Text>
        <View style={styles.inputContainer}>
          <FontAwesome
            name="credit-card"
            size={20}
            color="#555"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            placeholder="Nhập số tài khoản ngân hàng"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>
        {formErrors.bankAccountNumber ? (
          <Text style={styles.errorText}>{formErrors.bankAccountNumber}</Text>
        ) : null}
      </View>

      {/* Withdraw Button */}
      <TouchableOpacity
        style={[
          styles.withdrawButton,
          isLoading ? styles.withdrawButtonDisabled : null,
        ]}
        onPress={handleWithdraw}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.withdrawButtonText}>Rút tiền</Text>
        )}
      </TouchableOpacity>

      {/* Notice */}
      <View style={styles.noticeContainer}>
        <Text style={styles.noticeText}>
          Lưu ý: Yêu cầu rút tiền sẽ được xử lý trong vòng 24 giờ làm việc. Vui
          lòng đảm bảo thông tin tài khoản ngân hàng chính xác.
        </Text>
      </View>

      {/* Bottom Sheet Modal */}
      {showBottomSheet && (
        <Modal
          transparent={true}
          visible={showBottomSheet}
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeBottomSheet}
        >
          <Pressable style={styles.modalOverlay} onPress={closeBottomSheet}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: backdropOpacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.bottomSheetContainer,
                {
                  transform: [{ translateY: translateY }],
                },
              ]}
            >
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Chọn ngân hàng</Text>
                <TouchableOpacity onPress={closeBottomSheet}>
                  <MaterialIcons name="close" size={24} color="#555" />
                </TouchableOpacity>
              </View>
              <View style={styles.bottomSheetDivider} />
              <ScrollView style={styles.bottomSheetContent}>
                {BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank.id}
                    style={styles.bankItemBottomSheet}
                    onPress={() => selectBank(bank)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.bankItemText}>{bank.name}</Text>
                    {bankName === bank.id ? (
                      <MaterialIcons name="check" size={22} color="#007AFF" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE2E8",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#333",
    fontSize: 16,
  },
  currencyLabel: {
    color: "#777",
    fontWeight: "500",
  },
  minAmount: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  bankSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE2E8",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 50,
    justifyContent: "space-between",
  },
  bankSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#999",
  },
  selectedText: {
    color: "#333",
  },
  withdrawButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  withdrawButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noticeContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  errorText: {
    color: "#E53935",
    fontSize: 12,
    marginTop: 4,
  },

  // Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  bottomSheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 20, // For iOS safe area
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  bottomSheetDivider: {
    height: 1,
    backgroundColor: "#EEF0F4",
    marginBottom: 8,
  },
  bottomSheetContent: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  bankItemBottomSheet: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  bankItemText: {
    fontSize: 16,
    color: "#333",
  },
});

export default Withdraw;
