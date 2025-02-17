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
  ScrollView,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOST = "https://api.ftcs.online";
const SOCKET_URL = "wss://api.ftcs.online";


const QUICK_MESSAGES = [
  "Tôi đang trên đường tới điểm hẹn",
  "Tôi sẽ đến điểm nhận hàng trong vài phút nữa",
  "Xin vui lòng đợi trong vài phút !!!",
  "Cảm ơn bạn !",
  "Bạn nhớ chờ điện thoại nhé",
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

const ChatDriverReal = ({ route, navigation }) => {
  const { driverId, customerName, bookingId, scheduleId = null } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socket = useRef(null);
  const flatListRef = useRef(null);
  const quickMessagesHeight = useRef(new Animated.Value(1)).current;
  const [showQuickMessages, setShowQuickMessages] = useState(true);
  
  useEffect(() => {
    if (!driverId || !customerName || !bookingId) {
      console.error("Missing required parameters");
      navigation.goBack();
      return;
    }
  }, [driverId, customerName, bookingId]);
  // Function to scroll to the bottom
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem("userInfo");
        const accessToken = JSON.parse(userInfoString)?.data?.access_token;
        setToken(accessToken);
        if (accessToken) {
          const userId = getUserIdFromToken(accessToken);
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (!token || !currentUserId) return;

    socket.current = io(SOCKET_URL, {
      query: { username: "customer_1028", room: currentUserId.toString() },
      transports: ["websocket"],
      upgrade: false,
      forceNew: true,
    });

    fetchMessages();

    socket.current.on("MESSAGE_RECEIVED", (data) => {
      try {
        const content = JSON.parse(data.content);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            sender: "driver",
            text: content.message,
            timestamp: new Date().toISOString(),
          },
        ]);
        // Scroll to bottom when receiving new message
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    socket.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return () => {
      socket.current.disconnect();
    };
  }, [token, currentUserId, bookingId, scheduleId]);

  // Scroll to bottom when messages are loaded
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length]);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${HOST}/api/chat-message/${bookingId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.code === 200) {
        const formattedMessages = result.data.map((msg) => ({
          id: msg.id.toString(),
          sender: msg.senderId === currentUserId ? "customer" : "driver",
          text: msg.messageContent,
          timestamp: msg.createAt,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = () => {
    if (inputMessage.trim().length > 0) {
      const newMessage = {
        id: Date.now().toString(),
        sender: "customer",
        text: inputMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInputMessage("");

      const payload = {
        messageType: "MESSAGE_SEND",
        content: JSON.stringify({
          tripBookingId: bookingId,
          message: inputMessage.trim(),
        }),
        room: currentUserId.toString(),
        username: "customer_1028",
      };
      socket.current.emit("MESSAGE_SEND", payload);

      // Scroll to bottom after sending message
      setTimeout(scrollToBottom, 100);
    }
  };

  //an hien quck mess
  const toggleQuickMessages = () => {
    const toValue = showQuickMessages ? 0 : 1;
    setShowQuickMessages(!showQuickMessages);
    Animated.timing(quickMessagesHeight, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };


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
            <Text style={styles.avatarText}>N</Text>
          </View>
        )}
        <View style={[
          styles.messageContent,
          isCustomer ? styles.customerMessageContent : styles.driverMessageContent
        ]}>
          <Text style={[styles.messageText, !isCustomer && { color: "#000" }]}>
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              !isCustomer && { color: "rgba(0, 0, 0, 0.5)" },
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

  const renderQuickMessages = () => (
    <Animated.View style={[
      styles.quickMessagesWrapper,
      {
        maxHeight: quickMessagesHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 100]
        }),
        opacity: quickMessagesHeight
      }
    ]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickMessagesContainer}
      >
        {QUICK_MESSAGES.map((message, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickMessageButton}
            onPress={() => {
              setInputMessage(message);
              sendMessage(message);
            }}
          >
            <Text style={styles.quickMessageText}>{message}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{customerName}</Text>
          <Text style={styles.headerSubtitle}>Đang hoạt động</Text>
        </View>
        <TouchableOpacity style={styles.phoneButton}>
          <Icon name="phone" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      {renderQuickMessages()}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TouchableOpacity
          onPress={toggleQuickMessages}
          style={styles.toggleButton}
        >
          <Icon 
            name={showQuickMessages ? "keyboard-arrow-down" : "keyboard-arrow-up"} 
            size={24} 
            color="#666"
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity
          onPress={() => sendMessage(inputMessage)}
          style={styles.sendButton}
          disabled={inputMessage.trim().length === 0}
        >
          <Icon
            name="send"
            size={24}
            color={inputMessage.trim().length > 0 ? "#0099ff" : "#ccc"}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  backButton: {
    marginRight: 16,
  },
  phoneButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 4,
    maxWidth: "80%",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
  },
  customerMessage: {
    alignSelf: "flex-end",
  },
  driverMessage: {
    alignSelf: "flex-start",
  },
  customerMessageContent: {
    backgroundColor: "#0099ff",
  },
  driverMessageContent: {
    backgroundColor: "#f0f0f0",
  },
  messageText: {
    fontSize: 16,
    color: "#fff",
  },
  timestamp: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
  quickMessagesWrapper: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  quickMessagesContainer: {
    padding: 8,
  },
  quickMessageButton: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  quickMessageText: {
    color: "#000",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  toggleButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});

export default ChatDriverReal;
