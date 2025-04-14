import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import PropTypes from 'prop-types';

const DatePickerField = ({ 
  label, 
  value, 
  onChange, 
  error,
  placeholder = "Chọn ngày",
  minDate = new Date(new Date().getFullYear() - 100, 0, 1),
  maxDate = new Date(new Date().getFullYear() + 10, 11, 31),
  disabled = false,
  required = false,
  testID = 'date-picker-field'
}) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      setTempDate(new Date(value));
    }
  }, [value]);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const isValidDate = (date) => {
    if (!date) return false;
    return date >= minDate && date <= maxDate;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate && event.type === "set") {
        if (!isValidDate(selectedDate)) {
          onChange("Ngày không hợp lệ");
          return;
        }
        onChange(selectedDate.toISOString().split('T')[0]);
      }
    } else {
      setTempDate(selectedDate || tempDate);
    }
  };

  const handleIOSConfirm = () => {
    setShow(false);
    if (!isValidDate(tempDate)) {
      onChange("Ngày không hợp lệ");
      return;
    }
    onChange(tempDate.toISOString().split('T')[0]);
  };

  const handlePress = () => {
    if (disabled) return;
    setShow(true);
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity 
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} date picker`}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            isFocused && styles.inputFocused,
            disabled && styles.inputDisabled
          ]}
          value={value ? formatDate(value) : ""}
          editable={false}
          placeholder={placeholder}
          placeholderTextColor="#999"
          pointerEvents="none"
          onBlur={handleBlur}
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {show && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setShow(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date selection"
                >
                  <Text style={styles.iosDatePickerCancel}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleIOSConfirm}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm date selection"
                >
                  <Text style={styles.iosDatePickerDone}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.iosDatePicker}
                minimumDate={minDate}
                maximumDate={maxDate}
              />
            </View>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={minDate}
              maximumDate={maxDate}
            />
          )}
        </>
      )}
    </View>
  );
};

DatePickerField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  testID: PropTypes.string,
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
  required: {
    color: 'red',
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
  inputFocused: {
    borderColor: "#007AFF",
  },
  inputError: {
    borderColor: "red",
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#999",
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
