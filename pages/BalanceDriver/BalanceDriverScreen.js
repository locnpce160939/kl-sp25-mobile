import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from "../../configUrl";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BalanceDriverScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const parsedUserInfo = JSON.parse(userInfoString);
      const accessToken = parsedUserInfo?.data?.access_token;

      const response = await axios.get(`${BASE_URl}/api/account/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.code === 200) {
        setBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchBalanceHistory = async () => {
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

      const response = await axios.get(`${BASE_URl}/api/balanceHistory/account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 15000,
        validateStatus: status => status >= 200 && status < 300,
      });

      if (response.data.code === 200 && response.data.message === 'success') {
        setBalanceHistory(response.data.data || []);
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error(response.data.message || 'Lỗi không xác định');
      }
    } catch (err) {
      console.error('Error fetching balance history:', err);
      
      let errorMessage = 'Không thể tải lịch sử giao dịch. Vui lòng thử lại sau.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối tới máy chủ quá chậm. Vui lòng thử lại.';
      } else if (axios.isAxiosError(err)) {
        if (!err.response) {
          errorMessage = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
        } else if (err.response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
      }

      setError(errorMessage);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchBalanceHistory();
        }, 2000 * (retryCount + 1));
      } else {
        Alert.alert(
          'Lỗi',
          errorMessage,
          [
            { 
              text: 'Thử lại', 
              onPress: () => {
                setRetryCount(0);
                fetchBalanceHistory();
              }
            },
            { text: 'Đóng' }
          ]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
    fetchBalanceHistory();
  }, []);

  const groupTransactionsByDate = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const groups = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transactionDate);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([dateKey, data]) => ({
        title: formatDateHeader(dateKey),
        data: data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      }))
      .sort((a, b) => new Date(b.data[0].transactionDate) - new Date(a.data[0].transactionDate));
  };

  const formatDateHeader = (dateKey) => {
    const [year, month, day] = dateKey.split('-');
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Hôm nay';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Hôm qua';
    } else {
      return `${day}/${month}/${year}`;
    }
  };

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
        return 'Yêu cầu rút tiền';
      case 'DEPOSIT':
        return 'Nạp tiền';
      case 'WITHDRAW':
        return 'Rút tiền';
      case 'WITHDRAW_APPROVED':
        return 'Chấp thuận rút tiền';
      case 'WITHDRAW_REJECTED':
        return 'Từ chối rút tiền';
      case 'PAYMENT_RECEIVED':
        return 'Đã nhận thanh toán';
      default:
        return type;
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
      case 'WITHDRAW':
        return "arrow-down-circle-outline";
      case 'DEPOSIT':
      case 'PAYMENT_RECEIVED':
        return "arrow-up-circle-outline";
      case 'WITHDRAW_APPROVED':
        return "checkmark-circle-outline";
      case 'WITHDRAW_REJECTED':
        return "close-circle-outline";
      default:
        return "cash-outline";
    }
  };

  const getTransactionIconColor = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
      case 'WITHDRAW':
        return "#f44336";
      case 'DEPOSIT':
      case 'PAYMENT_RECEIVED':
        return "#4CAF50";
      case 'WITHDRAW_APPROVED':
        return "#4CAF50";
      case 'WITHDRAW_REJECTED':
        return "#FF9800";
      default:
        return "#757575";
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const BalanceHeader = () => (
    <View style={[styles.balanceContainer, { paddingTop: insets.top > 0 ? 0 : 16 }]}>
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeaderRow}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <TouchableOpacity 
            onPress={() => setShowBalance(!showBalance)}
            style={styles.eyeButton}
          >
            <Ionicons 
              name={showBalance ? "eye-outline" : "eye-off-outline"} 
              size={24} 
              color="#fff"
            />
          </TouchableOpacity>
        </View>
        
        {loadingBalance ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.balanceAmount}>
            {showBalance ? formatAmount(balance) : '• • • • • •'}
          </Text>
        )}
        
        <View style={styles.balanceActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Deposit')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Nạp tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Withdraw')}
          >
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Rút tiền</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => navigation.navigate('BalanceHistoryDetail', {
        balanceHistoryId: item.balanceHistoryId
      })}
      activeOpacity={0.7}
    >
      <View style={styles.transactionIcon}>
        <Ionicons 
          name={getTransactionIcon(item.transactionType)} 
          size={28} 
          color={getTransactionIconColor(item.transactionType)} 
        />
      </View>
      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.transactionType}>
              {getTransactionTypeText(item.transactionType)}
            </Text>
            <Text style={styles.description}>{item.description || 'Không có mô tả'}</Text>
            <Text style={styles.referenceId}>Mã GD: {item.referenceId}</Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={[
              styles.amount,
              item.amount < 0 ? styles.negativeAmount : styles.positiveAmount
            ]}>
              {item.amount < 0 ? '-' : '+'}{formatAmount(Math.abs(item.amount))}
            </Text>
            <Text style={styles.time}>
              {formatTime(item.transactionDate)}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.balance}>
          Số dư: {formatAmount(item.currentBalance)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={56} color="#ccc" />
      <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
      <Text style={styles.emptySubText}>Các giao dịch của bạn sẽ hiển thị ở đây</Text>
    </View>
  );

  useEffect(() => {
    const fetchData = async () => {
      await fetchProfileData();
      await fetchBalanceHistory();
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00b5ec" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <BalanceHeader />
      <View style={styles.historyHeaderContainer}>
        <Text style={styles.title}>Lịch sử giao dịch</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#00b5ec" />
        </TouchableOpacity>
      </View>
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setRetryCount(0);
              setLoading(true);
              fetchBalanceHistory();
            }}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={groupTransactionsByDate(balanceHistory)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.balanceHistoryId.toString()}
          contentContainerStyle={[
            styles.listContainer,
            balanceHistory.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#00b5ec']}
              tintColor="#00b5ec"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  balanceContainer: {
    padding: 16,
    backgroundColor: '#00b5ec',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 20,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  historyHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    backgroundColor: 'rgba(0, 181, 236, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00b5ec',
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  transactionIcon: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  transactionContent: {
    flex: 1,
    padding: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  descriptionContainer: {
    flex: 1,
    marginRight: 12,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  time: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#f44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 8,
  },
  balance: {
    fontSize: 14,
    color: '#666',
  },
  referenceId: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#00b5ec',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BalanceDriverScreen;