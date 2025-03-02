import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Share,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URl } from "../../configUrl";

// Define color palette
const COLORS = {
  primary: '#00b5ec',    // Main blue
  success: '#4CAF50',    // Green for success
  error: '#f44336',      // Red for error
  warning: '#FFB300',    // Amber for pending
  background: '#F5F5F5', // Light grey background
  cardBg: 'rgba(255, 255, 255, 0.95)',
  textPrimary: '#333333',
  textSecondary: '#757575',
  border: 'rgba(0, 0, 0, 0.05)',
  accentLight: '#fff', // Light blue accent
};

const BalanceHistoryDetailScreen = ({ route, navigation }) => {
  const balanceHistoryId = route.params?.balanceHistoryId;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!balanceHistoryId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin giao dịch', [
        { text: 'Quay lại', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    fetchBalanceDetail();
  }, [balanceHistoryId]);

  const fetchBalanceDetail = async () => {
    if (!balanceHistoryId) return;

    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      
      if (!userInfoString) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại.');
      }

      const response = await axios.get(`${BASE_URl}/api/balanceHistory/${balanceHistoryId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 15000,
      });

      if (response.data.code === 200 && response.data.message === 'success') {
        setDetail(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || 'Lỗi không xác định');
      }
    } catch (err) {
      console.error('Error fetching balance detail:', err);
      
      let errorMessage = 'Không thể tải chi tiết giao dịch. Vui lòng thử lại sau.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối tới máy chủ quá chậm. Vui lòng thử lại.';
      } else if (axios.isAxiosError(err)) {
        if (!err.response) {
          errorMessage = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
        } else if (err.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (err.response.status === 404) {
          errorMessage = 'Không tìm thấy thông tin giao dịch.';
        }
      }

      setError(errorMessage);
      Alert.alert(
        'Lỗi',
        errorMessage,
        [
          { 
            text: 'Thử lại', 
            onPress: () => fetchBalanceDetail() 
          },
          { 
            text: 'Quay lại',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const getStatusInfo = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
        return { 
          text: 'Yêu cầu rút tiền', 
          color: COLORS.error,
          icon: 'pending',
          bgColor: COLORS.background,
          statusBarColor: COLORS.accentLight
        };
      case 'WITHDRAW_APPROVED':
        return { 
          text: 'Rút tiền thành công', 
          color: COLORS.success,
          icon: 'check-circle',
          bgColor: COLORS.background,
          statusBarColor: COLORS.accentLight
        };
      case 'PAYMENT_RECEIVED':
        return { 
          text: 'Đã nhận thanh toán', 
          color: COLORS.success,
          icon: 'check-circle',
          bgColor: COLORS.background,
          statusBarColor: COLORS.accentLight
        };
      case 'WITHDRAW_REJECTED':
        return { 
          text: 'Rút tiền bị từ chối', 
          color: COLORS.warning,
          icon: 'cancel',
          bgColor: COLORS.background,
          statusBarColor: COLORS.accentLight
        };
      default:
        return { 
          text: type, 
          color: COLORS.textSecondary,
          icon: 'info',
          bgColor: COLORS.background,
          statusBarColor: COLORS.accentLight
        };
    }
  };
  
  const shareTransaction = async () => {
    if (!detail) return;
  
    try {
      const statusInfo = getStatusInfo(detail.transactionType);
      const message = `
Chi tiết giao dịch #${balanceHistoryId}
Trạng thái: ${statusInfo.text}
Số tiền: ${formatAmount(Math.abs(detail.amount))}
Thời gian: ${formatDate(detail.transactionDate)}
Mã tham chiếu: #${detail.referenceId}
Mô tả: ${detail.description}
      `;
  
      await Share.share({
        message,
        title: `Chi tiết giao dịch #${balanceHistoryId}`,
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chia sẻ thông tin giao dịch.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.accentLight} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin giao dịch...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.accentLight} />
        <View style={styles.centered}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={48} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchBalanceDetail}
          >
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.accentLight} />
        <View style={styles.centered}>
          <View style={styles.emptyIconContainer}>
            <Icon name="search-off" size={48} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Không tìm thấy dữ liệu</Text>
          <Text style={styles.emptyText}>Thông tin giao dịch này không tồn tại hoặc đã bị xóa</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(detail.transactionType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: statusInfo.bgColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={statusInfo.statusBarColor} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: statusInfo.statusBarColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>
        <TouchableOpacity onPress={shareTransaction} style={styles.shareIcon}>
          <Icon name="share" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Transaction Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconContainer, { borderColor: statusInfo.color }]}>
            <Icon name={statusInfo.icon} size={40} color={statusInfo.color} />
          </View>
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
          <Text style={styles.transactionId}>Mã giao dịch: #{balanceHistoryId}</Text>
        </View>
        
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Số tiền</Text>
          <Text style={[
  styles.amountValue, // Thêm style cơ bản trước
  detail.transactionType === 'WITHDRAW_REJECTED' 
    ? styles.warningAmount 
    : detail.amount < 0 
      ? styles.negativeAmount 
      : styles.positiveAmount
]}>
  {formatAmount(Math.abs(detail.amount))}
</Text>
          <Text style={styles.dateValue}>{formatDate(detail.transactionDate)}</Text>
        </View>
        
        {/* Transaction Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Chi tiết giao dịch</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <Icon name="account-balance-wallet" size={20} color={statusInfo.color} />
              <Text style={styles.infoLabel}>Số dư trước</Text>
            </View>
            <Text style={styles.infoValue}>{formatAmount(detail.previousBalance)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <Icon name="account-balance" size={20} color={statusInfo.color} />
              <Text style={styles.infoLabel}>Số dư sau</Text>
            </View>
            <Text style={styles.infoValue}>{formatAmount(detail.currentBalance)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <Icon name="fingerprint" size={20} color={statusInfo.color} />
              <Text style={styles.infoLabel}>Mã tham chiếu</Text>
            </View>
            <Text style={styles.infoValue}>#{detail.referenceId}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <Icon name="account-circle" size={20} color={statusInfo.color} />
              <Text style={styles.infoLabel}>Tài khoản</Text>
            </View>
            <Text style={styles.infoValue}>#{detail.accountId}</Text>
          </View>
        </View>
        
        {/* Description Card */}
        <View style={styles.descriptionCard}>
          <Text style={styles.cardTitle}>Mô tả</Text>
          <View style={[styles.descriptionContent, { borderLeftColor: statusInfo.color }]}>
            <Text style={styles.descriptionText}>{detail.description || "Không có mô tả"}</Text>
          </View>
        </View>
        
        {/* Support Action */}
        <TouchableOpacity style={[styles.supportButton, { backgroundColor: COLORS.primary }]}>
          <Icon name="headset-mic" size={20} color="#fff" />
          <Text style={styles.supportButtonText}>Liên hệ hỗ trợ</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cập nhật lần cuối: {formatDate(detail.transactionDate)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  backIcon: {
    padding: 4,
  },
  shareIcon: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  transactionId: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  amountCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  positiveAmount: {
    color: COLORS.success, // Green for success
  },
  negativeAmount: {
    color: COLORS.error, // Red for error
  },
  warningAmount: {
    color: COLORS.warning, // Amber for warning (e.g., WITHDRAW_REJECTED)
  },
  dateValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  descriptionCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  descriptionContent: {
    backgroundColor: COLORS.cardBg,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
 
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BalanceHistoryDetailScreen;