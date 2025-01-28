import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = () => {


  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const flatListRef = useRef(null);

  const currentUserId = '1';

  const dummyData = [
    {
      id: '1',
      text: 'Xin chào',
      senderId: '1',
      timestamp: new Date(),
      senderName: 'User 1'
    },
    {
      id: '2',
      text: 'Hello',
      senderId: '2',
      timestamp: new Date(),
      senderName: 'User 2'
    },
  ];

  useEffect(() => {
    setMessages(dummyData);
  }, []);

  const sendMessage = () => {
    if (inputMessage.trim().length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      senderId: currentUserId,
      timestamp: new Date(),
      senderName: 'User 1'
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputMessage('');
    
    // Scroll to bottom after sending message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd();
    }, 100);
  };

  const renderMessage = ({ item }) => {
    const isSender = item.senderId === currentUserId;

    return (
      <View style={[
        styles.messageContainer,
        isSender ? styles.senderMessage : styles.receiverMessage
      ]}>
        <Text style={styles.senderName}>{item.senderName}</Text>
        <Text style={[
          styles.messageText,
          isSender ? styles.senderText : styles.receiverText
        ]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={inputMessage.trim().length === 0}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={inputMessage.trim().length === 0 ? '#ccc' : '#007AFF'} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  senderMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receiverMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  senderText: {
    color: '#fff',
  },
  receiverText: {
    color: '#000',
  },
  senderName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
