import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOST = "https://api.ftcs.online";
const SOCKET_URL = "wss://api.ftcs.online";

// Function to extract userId from token
function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
    return payload.account.id; // Extract user ID
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

const ChatCustomer = ({ route, navigation }) => {
  const { driverId, driverName, bookingId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socket = useRef(null);
  

  useEffect(() => {
    // Fetch token from AsyncStorage
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

    // Connect to WebSocket only after token and user ID are available
    socket.current = io(SOCKET_URL, {
      query: { username: "customer_1028", room: "1028" },
      transports: ["websocket"],
      upgrade: false,
      forceNew: true,
    });

    // Fetch message history
    fetchMessages();

    // Listen for incoming messages via WebSocket
    socket.current.on("MESSAGE_RECEIVED", (data) => {
      try {
        const content = JSON.parse(data.content);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            sender: 'driver',
            text: content.message,
            timestamp: new Date().toISOString(),
          },
        ]);
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
  }, [token, currentUserId, bookingId]); // Ensure WebSocket reconnects if token or user ID changes

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
        sender: 'customer',
        text: inputMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputMessage('');

      // Send message via WebSocket
      const payload = {
        messageType: "MESSAGE_SEND",
        content: JSON.stringify({ tripBookingId: bookingId, message: inputMessage.trim() }),
        room: "1028",
        username: "customer_1028",
      };
      socket.current.emit("MESSAGE_SEND", payload);
    }
  };

  const renderMessage = ({ item }) => {
    const isCustomer = item.sender === 'customer';
    return (
      <View
        style={[
          styles.messageContainer,
          isCustomer ? styles.customerMessage : styles.driverMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
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
  <Icon name="arrow-back" size={24} color="#000" />
</TouchableOpacity>

        <Text style={styles.headerTitle}>{driverName}</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={styles.sendButton}
          disabled={inputMessage.trim().length === 0}
        >
          <Icon 
            name="send" 
            size={24} 
            color={inputMessage.trim().length > 0 ? '#0066cc' : '#ccc'} 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  customerMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0066cc',
  },
  driverMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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

export default ChatCustomer;