import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  TouchableWithoutFeedback,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Thêm icon tương ứng cho từng loại thông báo
const alertIcons = {
  success: "checkmark-circle",
  error: "close-circle",
  warning: "warning",
  info: "information-circle"
};

// Custom Alert Component cho React Native với thiết kế mới, không có nút X
const CustomAlert = ({ 
  isOpen = false, 
  onClose, 
  title = "Thông báo", 
  message, 
  confirmText = "Đồng ý",
  cancelText = "Hủy", 
  type = "info", 
  autoClose = false,
  autoCloseTime = 3000,
  showCancelButton = false,
  onConfirm,
  onCancel
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  // Các màu sắc theo từng loại thông báo
  const alertColors = {
    success: '#00b5ec',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  // Xử lý đóng thông báo
  const handleClose = () => {
    // Animation khi đóng
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsVisible(false);
      if (onClose) onClose();
    });
  };
  
  // Xử lý khi nhấn nút xác nhận
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    handleClose();
  };
  
  // Xử lý khi nhấn nút hủy
  const handleCancel = () => {
    if (onCancel) onCancel();
    handleClose();
  };
  
  // Animation khi mở thông báo
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      // Tự động đóng thông báo nếu cần
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseTime);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose, autoCloseTime]);
  
  // Nếu không hiện, không render gì cả
  if (!isVisible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <Animated.View 
              style={[
                styles.alertContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Icon và tiêu đề */}
              <View style={styles.headerContainer}>
                <View style={[styles.iconContainer, { backgroundColor: alertColors[type] }]}>
                  <Ionicons name={alertIcons[type]} size={28} color="white" />
                </View>
                <Text style={styles.title}>{title}</Text>
              </View>
              
              {/* Nội dung thông báo */}
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{message}</Text>
              </View>
              
              {/* Các nút */}
              <View style={[
                styles.buttonContainer, 
                showCancelButton ? styles.doubleButtonContainer : styles.singleButtonContainer
              ]}>
                {showCancelButton && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={[styles.button, styles.cancelButton]}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={[
                    styles.button, 
                    styles.confirmButton,
                    { backgroundColor: alertColors[type] }
                  ]}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Alert Provider Context (cập nhật)
const AlertContext = React.createContext();

export const useAlert = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "Thông báo",
    message: "",
    confirmText: "Đồng ý",
    cancelText: "Hủy",
    type: "info",
    autoClose: false,
    autoCloseTime: 3000,
    showCancelButton: false,
    onConfirm: null,
    onCancel: null
  });
  
  const showAlert = (options) => {
    setAlertState({ ...alertState, isOpen: true, ...options });
  };
  
  const hideAlert = () => {
    setAlertState({ ...alertState, isOpen: false });
  };
  
  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        {...alertState}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertContainer: {
    width: width > 500 ? 380 : width - 40,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  messageContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center'
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  singleButtonContainer: {
    alignItems: 'center',
  },
  doubleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 16
  }
});

export default CustomAlert;