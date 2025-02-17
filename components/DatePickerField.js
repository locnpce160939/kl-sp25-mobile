import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DatePickerField = ({ label, value, onChange, error }) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const minDate = new Date(new Date().getFullYear() - 100, 0, 1);
  const maxDate = new Date();

  const isValidDate = (date) => {
    return date >= minDate && date <= maxDate;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate && event.type === "set") {
        if (!isValidDate(selectedDate)) {
          return onChange("Ngày không hợp lệ");
        }
        onChange(formatDate(selectedDate));
      }
    } else {
      setTempDate(selectedDate || tempDate);
    }
  };

  const handleIOSConfirm = () => {
    setShow(false);
    if (!isValidDate(tempDate)) {
      return onChange("Ngày không hợp lệ");
    }
    onChange(formatDate(tempDate));
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={() => setShow(true)}>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value ? new Date(value).toLocaleDateString("vi-VN") : ""}
          editable={false}
          placeholder="Chọn ngày"
          placeholderTextColor="#999"
          pointerEvents="none"
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {show && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDatePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.iosDatePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.iosDatePicker}
              />
            </View>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
  iosDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  iosDatePicker: {
    height: 200,
  },
  iosDatePickerCancel: {
    color: '#007AFF',
    fontSize: 16,
  },
  iosDatePickerDone: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DatePickerField;
