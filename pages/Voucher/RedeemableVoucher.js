import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";
import { LinearGradient } from "expo-linear-gradient";

const ConfirmationDialog = ({ visible, voucher, onConfirm, onCancel, redeemablePoints }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="gift-outline" size={28} color="#4CAF50" />
            <Text style={styles.modalTitle}>Xác nhận đổi voucher</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.voucherDetailTitle}>{voucher?.title}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Ionicons name="ticket-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Giảm {voucher?.discountValue}K khi đổi điểm</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="star-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Điểm cần thiết: {voucher?.pointsRequired} điểm</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="wallet-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Điểm hiện có: {redeemablePoints} điểm</Text>
            </View>

            <View style={styles.pointsAfterRedeem}>
              <Text style={styles.pointsAfterRedeemLabel}>Điểm còn lại sau khi đổi:</Text>
              <Text style={styles.pointsAfterRedeemValue}>
                {redeemablePoints - voucher?.pointsRequired} điểm
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>HỦY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>XÁC NHẬN ĐỔI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const ErrorDialog = ({ visible, message, onClose, onRetry }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.errorModalContent}>
          <View style={styles.errorIconContainer}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="alert-circle" size={40} color="#FF6B6B" />
            </View>
          </View>

          <Text style={styles.errorTitle}>Đổi voucher thất bại</Text>
          
          <Text style={styles.errorMessage}>
            {message || "Bạn đã đổi voucher này rồi"}
          </Text>
          
          <Text style={styles.errorSubtext}>
            Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu lỗi vẫn tiếp tục.
          </Text>

          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.errorButton, styles.errorCloseButton]}
              onPress={onClose}
            >
              <Text style={styles.errorCloseButtonText}>ĐÓNG</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.errorButton, styles.errorRetryButton]}
              onPress={onRetry}
            >
              <Ionicons name="refresh" size={16} color="#fff" style={styles.retryIcon} />
              <Text style={styles.errorRetryButtonText}>THỬ LẠI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const SuccessDialog = ({ visible, voucher, remainingPoints, onClose, onViewVouchers }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={['#4CAF50', '#81C784']}
              style={styles.successIconCircle}
            >
              <Ionicons name="checkmark-sharp" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.successTitle}>Đổi voucher thành công! 🎉</Text>

          <View style={styles.successDetailsContainer}>
            <View style={styles.successDetailRow}>
              <Ionicons name="ticket-outline" size={20} color="#4CAF50" />
              <Text style={styles.successDetailText}>
                {voucher?.title || 'Giảm giá khi đổi điểm'}
              </Text>
            </View>

            <View style={styles.pointsInfoContainer}>
              <View style={styles.pointsInfoRow}>
                <Ionicons name="star-outline" size={18} color="#666" />
                <Text style={styles.pointsInfoLabel}>Điểm đã dùng:</Text>
                <Text style={styles.pointsInfoValue}>
                  {voucher?.pointsRequired || 0} điểm
                </Text>
              </View>

              <View style={styles.pointsDivider} />

              <View style={styles.pointsInfoRow}>
                <Ionicons name="wallet-outline" size={18} color="#666" />
                <Text style={styles.pointsInfoLabel}>Điểm còn lại:</Text>
                <Text style={[styles.pointsInfoValue, styles.remainingPoints]}>
                  {remainingPoints} điểm
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={[styles.successButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>ĐÓNG</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.successButton, styles.viewVouchersButton]}
              onPress={onViewVouchers}
            >
              <Ionicons name="gift-outline" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.viewVouchersButtonText}>XEM VOUCHER CỦA TÔI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const RedeemableVoucher = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeemablePoints, setRedeemablePoints] = useState(0);
  const navigation = useNavigation();
  const [redeemingVoucherId, setRedeemingVoucherId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ visible: false, voucher: null });
  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    message: '',
    retryVoucher: null
  });
  const [successDialog, setSuccessDialog] = useState({
    visible: false,
    voucher: null,
    remainingPoints: 0
  });

  useEffect(() => {
    fetchUserProfile();
    fetchRedeemableVouchers();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken) {
        throw new Error("Token không hợp lệ. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/account/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.code === 200) {
        setRedeemablePoints(response.data.data.redeemablePoints || 0);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const fetchRedeemableVouchers = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      if (!userInfoString) {
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Token không hợp lệ. Vui lòng đăng nhập lại.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/voucher/canRedemption`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const voucherData = response.data.data || [];
      setVouchers(voucherData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching redeemable vouchers:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải danh sách voucher");
      setLoading(false);
    }
  };

  const handleRedeemVoucher = (voucher) => {
    if (redeemablePoints < voucher.pointsRequired) {
      Alert.alert(
        "Không đủ điểm",
        `Bạn cần thêm ${voucher.pointsRequired - redeemablePoints} điểm để đổi voucher này.`,
        [{ text: "Đóng", style: "cancel" }]
      );
      return;
    }

    setConfirmDialog({ visible: true, voucher });
  };

  const handleConfirmRedeem = () => {
    if (confirmDialog.voucher) {
      performRedeem(confirmDialog.voucher);
      setConfirmDialog({ visible: false, voucher: null });
    }
  };

  const performRedeem = async (voucher) => {
    if (redeemingVoucherId) return;
    setRedeemingVoucherId(voucher.voucherId);

    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      const response = await axios.put(
        `${BASE_URL}/api/voucher/redeem/${voucher.voucherId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.code === 200) {
        const newPoints = redeemablePoints - voucher.pointsRequired;
        setRedeemablePoints(newPoints);
        setSuccessDialog({
          visible: true,
          voucher: voucher,
          remainingPoints: newPoints
        });
        fetchRedeemableVouchers();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Không thể đổi voucher lúc này";
      setErrorDialog({
        visible: true,
        message: errorMessage,
        retryVoucher: voucher
      });
    } finally {
      setRedeemingVoucherId(null);
    }
  };

  const handleRetryRedeem = () => {
    if (errorDialog.retryVoucher) {
      setErrorDialog({ visible: false, message: '', retryVoucher: null });
      performRedeem(errorDialog.retryVoucher);
    }
  };

  const getDiscountText = (item) => {
    if (item.discountType === "PERCENT") {
      return (
        <Text style={styles.discountValue}>
          <Text style={styles.discountValueNumber}>{item.discountValue}</Text>%
        </Text>
      );
    } else {
      return (
        <Text style={styles.discountValue}>
          <Text style={styles.discountValueNumber}>
            {Math.floor(item.discountValue / 1000)}K
          </Text>
        </Text>
      );
    }
  };

  const renderVoucherItem = ({ item }) => (
    <View style={styles.voucherContainer}>
      <LinearGradient
        colors={["#4CAF50", "#81C784"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.voucherLeftSection}
      >
        {getDiscountText(item)}
        <View style={styles.verticalDots}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </LinearGradient>

      <View style={styles.voucherRightSection}>
        <View style={styles.voucherHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="gift-outline" size={16} color="#4CAF50" />
            <Text style={styles.voucherCode}>{item.code || "N/A"}</Text>
          </View>
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.expiryText}>
              HSD: {new Date(item.endDate).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>

        <Text style={styles.voucherTitle}>
          {item.title || "Không có tiêu đề"}
        </Text>
        <Text style={styles.voucherDescription} numberOfLines={2}>
          {item.description || "Không có mô tả"}
        </Text>

        <View style={styles.voucherFooter}>
          <View style={styles.conditionContainer}>
            <Ionicons name="star-outline" size={12} color="#888" />
            <Text style={[
              styles.conditionText,
              redeemablePoints < item.pointsRequired && styles.insufficientPoints
            ]}>
              Cần {item.pointsRequired} điểm • Rank {item.minimumRank}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.redeemButton,
              redeemablePoints < item.pointsRequired && styles.disabledButton,
              redeemingVoucherId === item.voucherId && styles.redeemingButton
            ]}
            onPress={() => handleRedeemVoucher(item)}
            disabled={redeemablePoints < item.pointsRequired || redeemingVoucherId === item.voucherId}
          >
            <Text style={styles.redeemButtonText}>
              {redeemingVoucherId === item.voucherId ? "Đang đổi..." : "Đổi"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mã ưu đãi</Text>
      </View>

      <View style={styles.topSection}>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsLabel}>Điểm có thể đổi:</Text>
          <Text style={styles.pointsValue}>{redeemablePoints} điểm</Text>
        </View>

        <TouchableOpacity
          style={styles.viewMyVouchersButton}
          onPress={() => navigation.navigate("MyVouchers")}
        >
          <Ionicons name="ticket-outline" size={20} color="#4CAF50" />
          <Text style={styles.viewMyVouchersText}>Xem mã ưu đãi của bạn</Text>
          <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải voucher...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRedeemableVouchers}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vouchers}
          renderItem={renderVoucherItem}
          keyExtractor={(item) => item.voucherId.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                Không có voucher nào để đổi
              </Text>
              <Text style={styles.emptySubtext}>
                Kiếm thêm điểm để đổi voucher nhé!
              </Text>
            </View>
          }
        />
      )}

      <ConfirmationDialog
        visible={confirmDialog.visible}
        voucher={confirmDialog.voucher}
        onConfirm={handleConfirmRedeem}
        onCancel={() => setConfirmDialog({ visible: false, voucher: null })}
        redeemablePoints={redeemablePoints}
      />

      <ErrorDialog
        visible={errorDialog.visible}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ visible: false, message: '', retryVoucher: null })}
        onRetry={handleRetryRedeem}
      />

      <SuccessDialog
        visible={successDialog.visible}
        voucher={successDialog.voucher}
        remainingPoints={successDialog.remainingPoints}
        onClose={() => setSuccessDialog({ visible: false, voucher: null, remainingPoints: 0 })}
        onViewVouchers={() => {
          setSuccessDialog({ visible: false, voucher: null, remainingPoints: 0 });
          navigation.navigate("MyVouchers");
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF2",
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F7FA",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 16,
    color: "#1A2138",
    flex: 1,
  },
  topSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  pointsContainer: {
    padding: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF2',
    backgroundColor: '#4CAF50',
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewMyVouchersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  viewMyVouchersText: {
    flex: 1,
    fontSize: 15,
    color: '#4CAF50',
    marginLeft: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  voucherContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  voucherLeftSection: {
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    position: 'relative',
  },
  discountValue: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    position: 'relative',
    zIndex: 2,
  },
  discountValueNumber: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  verticalDots: {
    position: "absolute",
    right: -3,
    top: '5%',
    bottom: '5%',
    justifyContent: "space-evenly",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  voucherRightSection: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    backgroundColor: '#fff',
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  voucherCode: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiryText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '500',
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2138",
    marginBottom: 8,
    lineHeight: 22,
  },
  voucherDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 18,
  },
  voucherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  conditionContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  redeemButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    marginLeft: 12,
  },
  redeemButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
  },
  voucherDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#495057',
    marginLeft: 12,
  },
  pointsAfterRedeem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  pointsAfterRedeemLabel: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
  },
  pointsAfterRedeemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    marginRight: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#343A40',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#868E96',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  errorButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  errorCloseButton: {
    backgroundColor: '#F1F3F5',
    marginRight: 12,
  },
  errorRetryButton: {
    backgroundColor: '#4CAF50',
  },
  errorCloseButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  errorRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  retryIcon: {
    marginRight: 6,
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 24,
    textAlign: 'center',
  },
  successDetailsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  successDetailText: {
    fontSize: 16,
    color: '#343A40',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  pointsInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  pointsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pointsInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  pointsInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
  },
  remainingPoints: {
    color: '#2E7D32',
    fontSize: 16,
  },
  pointsDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 8,
  },
  successActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  successButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
  },
  closeButton: {
    backgroundColor: '#F1F3F5',
    marginRight: 12,
  },
  viewVouchersButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  closeButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  viewVouchersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default RedeemableVoucher;