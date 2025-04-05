import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../configUrl";

const SOCKET_URL = "wss://api.ftcs.online";

const suggestedMessages = [
  "Tôi đang đợi ở điểm nhận hàng",
  "Bạn sắp đến chưa?",
  "Cảm ơn bạn!",
  "Khi nào bạn tới thì nhớ gọi cho tôi!",
  "Tôi đang ở đây rồi",
  "Bạn có thể đến sớm hơn không?",
];

function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.account.id;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

const ChatCustomer = ({ route, navigation }) => {
  const { driverId, driverName, driverPhone, bookingId } = route.params;

  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [driverStatus, setDriverStatus] = useState("Đang hoạt động");
  const [showQuickMessages, setShowQuickMessages] = useState(true);

  // Refs
  const socket = useRef(null);
  const flatListRef = useRef(null);
  const quickMessagesHeight = useRef(new Animated.Value(80)).current;
  const inputRef = useRef(null);

  // Handle socket connection and disconnection
  const connectSocket = () => {
    if (!token || !currentUserId) return;

    socket.current = io(SOCKET_URL, {
      query: {
        username: `customer_${currentUserId}`,
        room: currentUserId.toString(),
      },
      transports: ["websocket"],
      upgrade: false,
      forceNew: true,
    });

    socket.current.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    socket.current.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socket.current.on("MESSAGE_RECEIVED", handleIncomingMessage);
    socket.current.on("DRIVER_STATUS_CHANGE", handleDriverStatusChange);
    socket.current.on("connect_error", handleConnectionError);
  };

  const handleIncomingMessage = (data) => {
    try {
      const content = JSON.parse(data.content);
      const newMessage = {
        id: Date.now().toString(),
        sender: "driver",
        text: content.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  const handleDriverStatusChange = (status) => {
    setDriverStatus(status);
  };

  const handleConnectionError = (error) => {
    console.error("Connection error:", error);
    Alert.alert(
      "Lỗi kết nối",
      "Không thể kết nối với máy chủ. Vui lòng thử lại sau.",
      [{ text: "OK" }]
    );
  };

  // Message handling
  const handleSendMessage = (messageText) => {
    if (!messageText.trim() || !socket.current) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: "customer",
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    const payload = {
      messageType: "MESSAGE_SEND",
      content: JSON.stringify({
        tripBookingId: bookingId,
        message: messageText.trim(),
      }),
      room: currentUserId.toString(),
      username: `customer_${currentUserId}`,
    };

    socket.current.emit("MESSAGE_SEND", payload);
    scrollToBottom();
  };

  const sendMessage = () => {
    if (inputMessage.trim()) {
      handleSendMessage(inputMessage);
      setInputMessage("");
      inputRef.current?.blur();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Animation handlers
  const toggleQuickMessages = () => {
    setShowQuickMessages(!showQuickMessages);
    Animated.timing(quickMessagesHeight, {
      toValue: showQuickMessages ? 0 : 80,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Handle phone call
  const handlePhoneCall = () => {
    if (driverPhone) {
      // Use your preferred method to handle phone calls
      // For example: Linking.openURL(`tel:${driverPhone}`);
      Alert.alert("Gọi tài xế", `Gọi ${driverName} - ${driverPhone}?`, [
        { text: "Hủy", style: "cancel" },
        { text: "Gọi", onPress: () => {} },
      ]);
    }
  };

  // Data fetching
  const fetchMessages = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${BASE_URL}/api/chat-message/${bookingId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.code === 200) {
        const formattedMessages = result.data.map((msg) => ({
          id: msg.id.toString(),
          sender: msg.senderId === currentUserId ? "customer" : "driver",
          text: msg.messageContent,
          timestamp: msg.createAt,
        }));
        setMessages(formattedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      Alert.alert("Lỗi", "Không thể tải tin nhắn. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Component lifecycle
  useEffect(() => {
    const initialize = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        const accessToken = JSON.parse(userInfoString)?.data?.access_token;
        setToken(accessToken);

        if (accessToken) {
          const userId = getUserIdFromToken(accessToken);
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error initializing:", error);
        Alert.alert("Lỗi", "Không thể khởi tạo ứng dụng. Vui lòng thử lại.", [
          { text: "OK" },
        ]);
      }
    };

    initialize();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (token && currentUserId) {
      connectSocket();
      fetchMessages();
    }
  }, [token, currentUserId]);

  // Render functions
  const renderMessage = ({ item }) => {
    const isCustomer = item.sender === "customer";

    return (
      <View
        style={[
          styles.messageContainer,
          isCustomer ? styles.customerMessage : styles.driverMessage,
        ]}
      >
        {!isCustomer && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {driverName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageContent,
            isCustomer ? styles.customerContent : styles.driverContent,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isCustomer ? styles.customerBubble : styles.driverBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isCustomer
                  ? styles.customerMessageText
                  : styles.driverMessageText,
              ]}
            >
              {item.text}
            </Text>
          </View>

          <Text
            style={[
              styles.timestamp,
              isCustomer ? styles.customerTimestamp : styles.driverTimestamp,
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuickMessage = ({ item }) => (
    <TouchableOpacity
      style={styles.quickMessageButton}
      onPress={() => {
        handleSendMessage(item);
        toggleQuickMessages();
      }}
    >
      <Text style={styles.quickMessageText}>{item}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B2D42" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Icon name="arrow-back" size={24} color="#2B2D42" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{driverName}</Text>
          <Text style={styles.headerStatus}>
            {isConnected ? driverStatus : "Đang kết nối lại..."}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={handlePhoneCall}>
          <Icon name="phone" size={24} color="#2B2D42" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      {/* Quick Messages */}
      <Animated.View
        style={[styles.quickMessages, { height: quickMessagesHeight }]}
      >
        <FlatList
          data={suggestedMessages}
          renderItem={renderQuickMessage}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickMessagesList}
        />
      </Animated.View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={toggleQuickMessages}
            style={styles.quickMessagesButton}
          >
            <Icon
              name={
                showQuickMessages ? "keyboard-arrow-down" : "keyboard-arrow-up"
              }
              size={24}
              color="#2B2D42"
            />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#8D99AE"
            multiline
            maxHeight={100}
          />

          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.sendButton,
              inputMessage.trim().length > 0 && styles.sendButtonActive,
            ]}
            disabled={inputMessage.trim().length === 0}
          >
            <Icon
              name="send"
              size={24}
              color={inputMessage.trim().length > 0 ? "#2B2D42" : "#8D99AE"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00b5ec",
  },

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F4",
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EDF2F4",
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2B2D42",
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 12,
    color: "#8D99AE",
  },

  // Messages styles
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 8,
    width: "100%",
    justifyContent: "flex-start", // Default alignment for driver messages
  },

  customerMessage: {
    justifyContent: "flex-end", // Align customer messages to the right
  },

  driverMessage: {
    justifyContent: "flex-start", // Align driver messages to the left
  },

  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDF2F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  messageContent: {
    maxWidth: "70%", // Limit the width of the message content
  },

  messageBubble: {
    padding: 12,
    borderRadius: 20,
    alignSelf: "flex-start", // Default alignment for the bubble
  },

  customerBubble: {
    backgroundColor: "#00b5ec",
    borderTopRightRadius: 4,
    alignSelf: "flex-end", // Align customer bubbles to the right
  },

  driverBubble: {
    backgroundColor: "#EDF2F4",
    borderTopLeftRadius: 4,
    alignSelf: "flex-start", // Align driver bubbles to the left
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  customerMessageText: {
    color: "#FFFFFF",
  },
  driverMessageText: {
    color: "#2B2D42",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12,
  },
  customerTimestamp: {
    color: "#8D99AE",
    textAlign: "right",
  },
  driverTimestamp: {
    color: "#8D99AE",
    textAlign: "left",
  },

  // Quick messages styles
  quickMessages: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDF2F4",
    overflow: "hidden",
  },
  quickMessagesList: {
    padding: 12,
  },
  quickMessageButton: {
    backgroundColor: "#EDF2F4",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(43, 45, 66, 0.1)",
  },
  quickMessageText: {
    fontSize: 14,
    color: "#2B2D42",
    fontWeight: "500",
  },

  // Input area styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDF2F4",
  },
  quickMessagesButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EDF2F4",
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#EDF2F4",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    color: "#2B2D42",
    maxHeight: 100,
    minHeight: 45,
  },
  sendButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EDF2F4",
  },
  sendButtonActive: {
    backgroundColor: "#EDF2F4",
  },

  // Connection status styles
  connectionStatus: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: "#FF9F1C",
    alignItems: "center",
  },
  connectionStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#8D99AE",
    textAlign: "center",
    marginTop: 12,
  },
});

export default ChatCustomer;
