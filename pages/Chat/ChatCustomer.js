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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOST = "https://api.ftcs.online";
const SOCKET_URL = "wss://api.ftcs.online";

const suggestedMessages = [
  "Tôi đang đợi ở điểm nhận hàng",
  "Bạn sắp đến chưa?",
  "Cảm ơn bạn!",
  "khi nào bạn tới thì nhớ gọi cho tôi !!!",
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
  const { driverId, driverName, bookingId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socket = useRef(null);
  const flatListRef = useRef(null);
  const [showQuickMessages, setShowQuickMessages] = useState(true);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSendMessage = (messageText) => {
    if (messageText.trim().length > 0 && socket.current) {
      const newMessage = {
        id: Date.now().toString(),
        sender: "customer",
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);

      const payload = {
        messageType: "MESSAGE_SEND",
        content: JSON.stringify({
          tripBookingId: bookingId,
          message: messageText.trim(),
        }),
        room: currentUserId.toString(),
        username: "customer_1028",
      };

      socket.current.emit("MESSAGE_SEND", payload);
      setTimeout(scrollToBottom, 100);
    }
  };

  const sendMessage = () => {
    if (inputMessage.trim().length > 0) {
      handleSendMessage(inputMessage);
      setInputMessage("");
    }
  };

  const sendSuggestedMessage = (message) => {
    handleSendMessage(message);
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
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    socket.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [token, currentUserId, bookingId]);

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
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
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
        <Text 
          style={[
            styles.messageText, 
            !isCustomer && styles.driverMessageText
          ]}
        >
          {item.text}
        </Text>
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Order")}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#00b5ec" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{driverName}</Text>

        <TouchableOpacity style={styles.callButton}>
          <Icon name="phone" size={24} color="#00b5ec" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      <View style={styles.suggestedMessagesWrapper}>
        <View style={styles.suggestedMessagesHeader}>
          <Text style={styles.suggestedMessagesTitle}></Text>
          <TouchableOpacity 
            onPress={() => setShowQuickMessages(!showQuickMessages)}
            style={styles.toggleQuickMessagesButton}
          >
            <Icon 
              name={showQuickMessages ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color="#00b5ec" 
            />
          </TouchableOpacity>
        </View>

        {showQuickMessages && (
          <View style={styles.suggestedMessagesContainer}>
            <FlatList
              data={suggestedMessages}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestedMessage}
                  onPress={() => sendSuggestedMessage(item)}
                >
                  <Text style={styles.suggestedMessageText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[
            styles.sendButton,
            inputMessage.trim().length > 0 && styles.sendButtonActive
          ]}
          disabled={inputMessage.trim().length === 0}
        >
          <Icon
            name="send"
            size={24}
            color={inputMessage.trim().length > 0 ? "#00b5ec" : "#ccc"}
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

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 8,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 8,
  },

  // Messages list
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    maxWidth: "80%",
    marginVertical: 4,
    padding: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  customerMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#00b5ec",
    borderTopRightRadius: 4,
    marginLeft: "20%",
  },
  driverMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f8f9fa",
    borderTopLeftRadius: 4,
    marginRight: "20%",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  messageText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 22,
  },
  driverMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  customerTimestamp: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
  },
  driverTimestamp: {
    color: "#999",
    textAlign: "left",
  },

  // Suggested messages section
  suggestedMessagesContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#fff",
  },
  suggestedMessagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestedMessagesTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  suggestedMessagesContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestedMessage: {
    backgroundColor: "#f0f7ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 181, 236, 0.12)", // #00b5ec with 12% opacity
  },
  suggestedMessageText: {
    fontSize: 14,
    color: "#00b5ec",
    fontWeight: "500",
  },

  // Input section
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  sendButton: {
    padding: 8,
    borderRadius: 50,
  },
  sendButtonActive: {
    backgroundColor: "#f0f7ff",
  },
  
});

export default ChatCustomer;