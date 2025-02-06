import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Config WebSocket
const HOST = "https://api.ftcs.online";
const SOCKET_URL = "wss://api.ftcs.online";
const TRIP_BOOKING_ID = 4;

const ChatDriver = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [socket, setSocket] = useState(null);

  // Lấy userId từ token
  function getUserIdFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
      return payload.account.id; // Extract user ID
    } catch (error) {
      console.error("❌ Error decoding token:", error);
      return null;
    }
  }

  // Lấy token từ AsyncStorage và thiết lập WebSocket
  const fetchToken = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem("userInfo");
      const accessToken = JSON.parse(userInfoString)?.data?.access_token;
      setToken(accessToken);
      if (accessToken) {
        const userId = getUserIdFromToken(accessToken);
        setCurrentUserId(userId);
        connectWebSocket(accessToken, userId);
        fetchMessageHistory(accessToken, userId);
      }
    } catch (error) {
      console.error("❌ Error fetching token:", error);
    }
  };

  // Kết nối WebSocket
  const connectWebSocket = (accessToken, userId) => {
    const newSocket = io(SOCKET_URL, {
      query: { username: `user_${userId}`, room: userId.toString() },
      transports: ["websocket"],
      extraHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    newSocket.on("connect", () => console.log("✅ WebSocket Connected"));
    newSocket.on("MESSAGE_RECEIVED", (data) => {
      try {
        const content = JSON.parse(data.content);
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: Date.now().toString(), text: content.message, sender: "driver" },
        ]);
      } catch (error) {
        console.error("❌ Error parsing message:", error);
      }
    });

    setSocket(newSocket);
  };

  // Lấy lịch sử tin nhắn từ API
  const fetchMessageHistory = async (accessToken, userId) => {
    try {
      const response = await fetch(`${HOST}/api/chat-message/${TRIP_BOOKING_ID}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result.code === 200) {
        setMessages(
          result.data.map((msg) => ({
            id: msg.createAt,
            text: msg.messageContent,
            sender: msg.senderId === userId ? "user" : "driver",
          }))
        );
      }
    } catch (error) {
      console.error("❌ Error fetching message history:", error);
    }
  };

  // Gửi tin nhắn
  const sendMessage = () => {
    if (inputText.trim() && socket) {
      const payload = {
        messageType: "MESSAGE_SEND",
        content: JSON.stringify({ tripBookingId: TRIP_BOOKING_ID, message: inputText }),
        room: currentUserId.toString(),
        username: `user_${currentUserId}`,
      };

      socket.emit("MESSAGE_SEND", payload);
      setMessages([...messages, { id: Date.now().toString(), text: inputText, sender: "user" }]);
      setInputText("");
    }
  };

  // Load token khi mở màn hình
  useEffect(() => {
    fetchToken();
    return () => socket && socket.disconnect(); // Ngắt kết nối WebSocket khi rời màn hình
  }, []);

  // Render tin nhắn
  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === "user" ? styles.userMessage : styles.driverMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
      />

      {/* Thanh nhập tin nhắn */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  chatContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "flex-end",
  },
  messageContainer: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#00b5ec",
  },
  driverMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e7eb",
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#00b5ec",
    borderRadius: 20,
    padding: 10,
  },
});

export default ChatDriver;
