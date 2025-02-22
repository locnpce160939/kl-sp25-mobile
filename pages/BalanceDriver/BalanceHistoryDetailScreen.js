import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URl } from "../../configUrl";

const BalanceHistoryDetailScreen = ({ route, navigation }) => {
  // Get balanceHistoryId from route params with validation
  const balanceHistoryId = route.params?.balanceHistoryId;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate balanceHistoryId on component mount
  useEffect(() => {
    if (!balanceHistoryId) {
      Alert.alert(
        'Lỗi',
        'Không tìm thấy thông tin giao dịch',
        [
          { 
            text: 'Quay lại', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
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

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'WITHDRAW_REQUESTED':
        return 'Yêu cầu rút tiền';
      default:
        return type;
    }
  };

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
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text>Không tìm thấy thông tin giao dịch</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.title}>Chi tiết giao dịch #{balanceHistoryId}</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Loại giao dịch</Text>
            <Text style={styles.value}>{getTransactionTypeText(detail.transactionType)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Số tiền</Text>
            <Text style={[
              styles.value,
              detail.amount < 0 ? styles.negativeAmount : styles.positiveAmount
            ]}>
              {formatAmount(Math.abs(detail.amount))}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Số dư trước</Text>
            <Text style={styles.value}>{formatAmount(detail.previousBalance)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Số dư sau</Text>
            <Text style={styles.value}>{formatAmount(detail.currentBalance)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Thời gian</Text>
            <Text style={styles.value}>{formatDate(detail.transactionDate)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Mã tham chiếu</Text>
            <Text style={styles.value}>#{detail.referenceId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tài khoản</Text>
            <Text style={styles.value}>#{detail.accountId}</Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.label}>Mô tả</Text>
            <Text style={styles.description}>{detail.description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  descriptionContainer: {
    paddingVertical: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
  },
  positiveAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  error: {
    color: '#f44336',
    textAlign: 'center',
    padding: 16,
  },
});

export default BalanceHistoryDetailScreen;