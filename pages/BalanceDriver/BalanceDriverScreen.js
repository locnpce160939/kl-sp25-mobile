import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from "../../configUrl";
import Ionicons from "react-native-vector-icons/Ionicons";

const BalanceDriverScreen = ({ navigation }) => {
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

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
      console.log('userInfoString:', userInfoString);
      
      if (!userInfoString) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
  
      const parsedUserInfo = JSON.parse(userInfoString);
      console.log('parsedUserInfo:', parsedUserInfo);
      
      const accessToken = parsedUserInfo?.data?.access_token;
      console.log('accessToken:', accessToken);
  
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
    }
  };

  useEffect(() => {
    fetchProfileData();
    fetchBalanceHistory();
  }, []);

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
        return 'Yêu cầu rút tiền';
      case 'DEPOSIT':
        return 'Nạp tiền';
      case 'WITHDRAW':
        return 'Rút tiền';
      default:
        return type;
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

  const BalanceHeader = () => (
    <View style={styles.balanceContainer}>
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
            {showBalance ? formatAmount(balance) : '******'}
          </Text>
        )}
        
        <View style={styles.balanceActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Deposit')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => navigation.navigate('BalanceHistoryDetail', {
        balanceHistoryId: item.balanceHistoryId
      })}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.transactionType}>
            {getTransactionTypeText(item.transactionType)}
          </Text>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.date}>
            {formatDate(item.transactionDate)}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            item.amount < 0 ? styles.negativeAmount : styles.positiveAmount
          ]}>
            {formatAmount(Math.abs(item.amount))}
          </Text>
          <Text style={styles.balance}>
            Số dư: {formatAmount(item.currentBalance)}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.referenceId}>Mã giao dịch: {item.referenceId}</Text>
        <Text style={styles.accountId}>Tài khoản: {item.accountId}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BalanceHeader />
      <Text style={styles.title}>Lịch sử biến động số dư</Text>
      <FlatList
        data={balanceHistory}
        renderItem={renderItem}
        keyExtractor={item => item.balanceHistoryId.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  balanceContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  balanceCard: {
    backgroundColor: '#00b5ec',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  eyeButton: {
    padding: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff'
  },
  listContainer: {
    padding: 16
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  descriptionContainer: {
    flex: 1,
    marginRight: 16
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  date: {
    fontSize: 14,
    color: '#666'
  },
  amountContainer: {
    alignItems: 'flex-end'
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  positiveAmount: {
    color: '#4CAF50'
  },
  negativeAmount: {
    color: '#f44336'
  },
  balance: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8
  },
  referenceId: {
    fontSize: 12,
    color: '#666'
  },
  accountId: {
    fontSize: 12,
    color: '#666'
  },
  error: {
    color: '#f44336',
    textAlign: 'center'
  }
});

export default BalanceDriverScreen;