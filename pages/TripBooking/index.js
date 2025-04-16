import React, { use, useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker } from "react-native-maps";
import { Dropdown } from "react-native-element-dropdown";
import { BASE_URL } from "../../configUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location"; // Thêm import này

const TripBooking = () => {
  // Form state
  const [bookingType, setBookingType] = useState("");
  const [bookingDate, setBookingDate] = useState(new Date());
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [capacity, setCapacity] = useState("");
  const [startLocationAddress, setStartLocationAddress] = useState("");
  const [endLocationAddress, setEndLocationAddress] = useState("");
  const [locationState, setLocationState] = useState([]);
  const [initialRegion, setInitialRegion] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [titlePickup, setTitlePickup] = useState("");
  const [titleDropoff, setTitleDropoff] = useState("");
  const [showBookingDatePicker, setShowBookingDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] =
    useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeLocationField, setActiveLocationField] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [resultLocation, setResultLocation] = useState([]);
  const [totalPrice, setTotalPrice] = useState({
    price: 0,
    expectedDistance: 0,
    isFirstOrder: false,
  });
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [OnlinePayment, setOnlinePayment] = useState();
  const [voucherCode, setVoucherCode] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  // Thêm state mới
  const [insurances, setInsurances] = useState([]);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState(null);
  const [insuranceName, setInsuranceName] = useState("");
  const [insuranceDescription, setInsuranceDescription] = useState("");

  useEffect(() => {
    try {
      fetchTypeBooking();
    } catch (error) {}
  }, []);

  const fetchTypeBooking = async () => {
    try {
      let token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/bookingType`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const responseData = res.data.data.content;
      // Map API response to the format required by Dropdown component
      const formattedData = responseData.map((item) => ({
        label: item.bookingTypeName,
        value: item.bookingTypeId,
      }));

      // Update the data array for the dropdown
      setData(formattedData);

      // Set default value if available
      if (formattedData.length > 0) {
        setBookingType(formattedData[0].value);
      }
    } catch (error) {
      console.error(
        "Lỗi khi lấy loại chuyến xe:",
        error.response?.data || error.message
      );
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Kiểm tra xem dịch vụ định vị có bật không
      const isLocationAvailable = await Location.hasServicesEnabledAsync();
      if (!isLocationAvailable) {
        Alert.alert(
          "Lỗi",
          "Dịch vụ định vị chưa được bật. Vui lòng bật GPS trong cài đặt thiết bị."
        );
        return;
      }

      // Yêu cầu quyền truy cập vị trí
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Lỗi",
          "Quyền truy cập vị trí bị từ chối! Vui lòng cấp quyền trong cài đặt."
        );
        return;
      }

      // Lấy vị trí hiện tại
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Gọi API để lấy thông tin địa chỉ
      await getNearLocation(currentCoords);

      // Lấy địa chỉ cụ thể từ locationState (kết quả của getNearLocation)
      if (locationState.length > 0) {
        const address = locationState[0].formatted_address; // Lấy địa chỉ đầu tiên
        if (activeLocationField === "pickup") {
          setPickupLocation(currentCoords);
          setTitlePickup(address); // Hiển thị địa chỉ cụ thể
          setStartLocationAddress(address);
        } else if (activeLocationField === "dropoff") {
          setDropoffLocation(currentCoords);
          setTitleDropoff(address); // Hiển thị địa chỉ cụ thể
          setEndLocationAddress(address);
        }
      } else {
        // Nếu không lấy được địa chỉ, fallback về "Vị trí hiện tại"
        if (activeLocationField === "pickup") {
          setPickupLocation(currentCoords);
          setTitlePickup("Vị trí hiện tại");
          setStartLocationAddress("Vị trí hiện tại");
        } else if (activeLocationField === "dropoff") {
          setDropoffLocation(currentCoords);
          setTitleDropoff("Vị trí hiện tại");
          setEndLocationAddress("Vị trí hiện tại");
        }
      }

      // Cập nhật vùng bản đồ
      setInitialRegion({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Lỗi khi lấy vị trí hiện tại:", error);
      Alert.alert(
        "Lỗi",
        "Không thể lấy vị trí hiện tại. Vui lòng kiểm tra cài đặt GPS và thử lại."
      );
    }
  };

  // Error states
  const [errors, setErrors] = useState({
    bookingDate: "",
    expirationDate: "",
    pickupLocation: "",
    dropoffLocation: "",
    capacity: "",
  });

  const navigation = useNavigation();
  const route = useRoute();
  const bottomSheetRef = useRef(null);

  const [data, setData] = useState([
    { label: "1 chiều", value: "1 chiều" },
    { label: "2 chiều", value: "2 chiều" },
  ]);

  const paymentMethods = [
    { label: "Thanh toán khi hoàn thành", value: "CASH", icon: "cash-outline" },
    {
      label: "Thanh toán trước",
      value: "ONLINE_PAYMENT",
      icon: "card-outline",
    },
  ];

  // Validation functions
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      bookingDate: "",
      expirationDate: "",
      pickupLocation: "",
      dropoffLocation: "",
      capacity: "",
    };

    if (!bookingDate) {
      newErrors.bookingDate = "Ngày đặt xe là bắt buộc";
      isValid = false;
    } else if (bookingDate < new Date()) {
      newErrors.bookingDate = "Ngày đặt xe không thể là quá khứ";
      isValid = false;
    }

    if (!expirationDate) {
      newErrors.expirationDate = "Ngày hết hạn là bắt buộc";
      isValid = false;
    } else if (expirationDate <= bookingDate) {
      newErrors.expirationDate = "Ngày hết hạn phải sau ngày đặt xe";
      isValid = false;
    }

    if (!pickupLocation) {
      newErrors.pickupLocation = "Điểm đón là bắt buộc";
      isValid = false;
    }

    if (!dropoffLocation) {
      newErrors.dropoffLocation = "Điểm trả là bắt buộc";
      isValid = false;
    }

    if (!capacity) {
      newErrors.capacity = "Sức chứa là bắt buộc";
      isValid = false;
    } else if (isNaN(capacity) || parseInt(capacity) <= 0) {
      newErrors.capacity = "Sức chứa phải là số nguyên dương";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Date picker handlers
  const showDatePicker = (type) => {
    if (type === "booking") {
      setShowBookingDatePicker(true);
    } else {
      setShowExpirationDatePicker(true);
    }
  };

  const onDateChange = (type) => (event, selectedDate) => {
    const isBooking = type === "booking";
    if (Platform.OS === "android") {
      isBooking
        ? setShowBookingDatePicker(false)
        : setShowExpirationDatePicker(false);
    }
    if (selectedDate) {
      if (isBooking) {
        setBookingDate(selectedDate);
        setErrors((prev) => ({ ...prev, bookingDate: "" }));
      } else {
        setExpirationDate(selectedDate);
        setErrors((prev) => ({ ...prev, expirationDate: "" }));
      }
    }
  };

  const openLocationPicker = (type) => {
    setActiveLocationField(type);
    setShowLocationPicker(true);
    setIsBottomSheetOpen(true);

    // Kiểm tra nếu chưa có vị trí cho field tương ứng thì lấy vị trí hiện tại
    if (type === "pickup" && !pickupLocation) {
      getCurrentLocation();
    } else if (type === "dropoff" && !dropoffLocation) {
      getCurrentLocation();
    }
  };

  const handleLocationSelect = async (coordinate) => {
    console.log("Tọa độ từ bản đồ:", coordinate);
    if (activeLocationField === "pickup") {
      setPickupLocation(coordinate);
      await getNearLocation(coordinate);
    } else {
      setDropoffLocation(coordinate);
      await getNearLocation(coordinate);
    }
    setIsBottomSheetOpen(true);
  };

  // API calls
  const getNearLocation = async (coordinate) => {
    try {
      let token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${BASE_URL}/api/location/reverse-geocode?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const locationData = res.data.data.map((item) => ({
        formatted_address: item.formatted_address,
        lat: item.geometry.location.lat,
        long: item.geometry.location.lng,
      }));
      setLocationState(locationData);
      return locationData; // Trả về dữ liệu để sử dụng ngay
    } catch (error) {
      console.error(
        "Lỗi khi lấy địa điểm gần đó:",
        error.response?.data || error.message
      );
      return []; // Trả về mảng rỗng nếu có lỗi
    }
  };

  const findLocation = async () => {
    try {
      let token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${BASE_URL}/api/location/address-geocode?address=${encodeURIComponent(
          searchText
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = res.data.data.results;
      console.log("Kết quả tìm kiếm từ API:", result);
      if (!result || result.length === 0) {
        Alert.alert("Thông báo", "Không tìm thấy địa điểm nào.");
      }
      setResultLocation(result || []);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể tìm kiếm địa điểm. Vui lòng thử lại.");
      setResultLocation([]);
    }
  };

  const isValidCoordinate = (lat, lon) => {
    return (
      typeof lat === "number" &&
      typeof lon === "number" &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  };

  const getPrice = async () => {
    try {
      if (
        !pickupLocation ||
        !dropoffLocation ||
        !isValidCoordinate(pickupLocation.latitude, pickupLocation.longitude) ||
        !isValidCoordinate(
          dropoffLocation.latitude,
          dropoffLocation.longitude
        ) ||
        !bookingType ||
        !capacity ||
        isNaN(parseInt(capacity))
      ) {
        console.error("Dữ liệu không hợp lệ:", {
          pickupLocation,
          dropoffLocation,
          capacity,
          bookingType,
        });
        Alert.alert(
          "Lỗi",
          "Vui lòng kiểm tra lại thông tin địa điểm và trọng tải."
        );
        return;
      }

      let token = await AsyncStorage.getItem("token");
      const origin = `${pickupLocation.latitude},${pickupLocation.longitude}`;
      const destination = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
      const weight = parseInt(capacity);

      const payload = {
        pickupLocation: origin,
        dropoffLocation: destination,
        capacity: weight,
        bookingType,
      };

      if (selectedInsuranceId) {
        payload.selectedInsurancePolicyId = selectedInsuranceId; // Thêm selectedInsurancePolicyId
      }

      console.log("Payload gửi lên API:", payload); // Debug payload

      const res = await axios.post(
        `${BASE_URL}/api/tripBookings/direction`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const priceData = res.data.data;
      console.log("Dữ liệu từ API:", priceData);

      // Lưu danh sách bảo hiểm
      setInsurances(priceData.insurances || []);

      // Không tự động chọn gói bảo hiểm, giữ nguyên selectedInsuranceId
      setTotalPrice({
        price: priceData.price || 0,
        expectedDistance: priceData.expectedDistance || 0,
        isFirstOrder: priceData.isFirstOrder || false,
      });
      setFinalPrice(priceData.price || 0);
      setDiscountAmount(0);
    } catch (error) {
      console.error("Lỗi khi lấy giá:", error.response?.data || error.message);
      Alert.alert("Lỗi", "Không thể tính giá. Vui lòng kiểm tra lại địa điểm.");
      setTotalPrice({ price: 0, expectedDistance: 0, isFirstOrder: false });
      setFinalPrice(0);
      setDiscountAmount(0);
      setInsurances([]);
      setSelectedInsuranceId(null);
      setInsuranceName("");
      setInsuranceDescription("");
    }
  };

  const calculateDiscount = async (code) => {
    try {
      let token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token not found");

      const userInfoString = await AsyncStorage.getItem("userInfo");
      const userId = JSON.parse(userInfoString)?.data?.userId;

      const discountRequestBody = {
        orderValue: totalPrice.price,
        paymentMethod: paymentMethod || "CASH",
        distanceKm: totalPrice.expectedDistance,
        isFirstOrder: totalPrice.isFirstOrder,
        accountId: userId,
      };

      const res = await axios.post(
        `${BASE_URL}/api/tripBookings/calculate-discount?voucherCode=${code}`,
        discountRequestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data.code === 200) {
        const { discountAmount: discount, finalPrice } = res.data.data;
        setDiscountAmount(discount || 0);
        setFinalPrice(finalPrice || totalPrice.price || 0);
      } else {
        throw new Error("Invalid voucher response");
      }
    } catch (error) {
      console.error("Lỗi khi tính giảm giá:", error);
      Alert.alert("Lỗi", "Không thể áp dụng voucher này. Vui lòng thử lại.");
      setVoucherCode(null);
      setDiscountAmount(0);
      setFinalPrice(totalPrice.price || 0);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
      return;
    }

    let token = await AsyncStorage.getItem("token");
    try {
      const dropoffLocationString = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
      const pickupLocationString = `${pickupLocation.latitude},${pickupLocation.longitude}`;
      const res = await axios.post(
        `${BASE_URL}/api/tripBookings/create`,
        {
          bookingType,
          bookingDate,
          expirationDate,
          pickupLocation: pickupLocationString,
          dropoffLocation: dropoffLocationString,
          capacity: parseInt(capacity),
          paymentMethod,
          startLocationAddress,
          endLocationAddress,
          notes,
          voucherCode: voucherCode || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data.code === 200) {
        setOnlinePayment(res.data.data.bookingId);
        if (paymentMethod === "ONLINE_PAYMENT") {
          navigation.navigate("Payment", {
            bookingId: res.data.data.bookingId,
          });
        }
        Alert.alert("Thành công", res.data.message);
        setVoucherCode(null);
        setDiscountAmount(0);
        setFinalPrice(0);
      }
    } catch (error) {
      console.log(error);
      const responseData = error.response?.data;
      if (
        responseData?.code === 200 &&
        responseData?.message === "Validation failed"
      ) {
        const validationMessages = Object.values(responseData.data).join("\n");
        Alert.alert("Lỗi xác thực", validationMessages);
      } else if (error.response?.status === 401) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn!");
      } else {
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi đặt xe. Vui lòng thử lại.");
      }
    }
  };

  // Effects

  useEffect(() => {
    if (pickupLocation && dropoffLocation && capacity) {
      console.log("Kích hoạt getPrice với:", {
        pickupLocation,
        dropoffLocation,
        capacity,
        bookingType,
      });
      getPrice();
    }
  }, [pickupLocation, dropoffLocation, capacity, bookingType]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const params = route.params || {};
      console.log("Params khi quay lại từ VoucherScreen:", params);
      if (params.voucherCode) {
        setVoucherCode(params.voucherCode);
        if (totalPrice.price > 0) calculateDiscount(params.voucherCode);
      }
      if (params.pickupLocation) setPickupLocation(params.pickupLocation);
      if (params.dropoffLocation) setDropoffLocation(params.dropoffLocation);
      if (params.capacity) setCapacity(params.capacity);
      if (params.paymentMethod) setPaymentMethod(params.paymentMethod);
      if (params.bookingType) setBookingType(params.bookingType);
      if (params.bookingDate) setBookingDate(new Date(params.bookingDate));
      if (params.expirationDate)
        setExpirationDate(new Date(params.expirationDate));
      if (params.startLocationAddress)
        setStartLocationAddress(params.startLocationAddress);
      if (params.endLocationAddress)
        setEndLocationAddress(params.endLocationAddress);
      if (params.titlePickup) setTitlePickup(params.titlePickup);
      if (params.titleDropoff) setTitleDropoff(params.titleDropoff);
      if (params.notes) setNotes(params.notes);
      if (params.selectedInsuranceId) {
        setSelectedInsuranceId(params.selectedInsuranceId);
        setInsuranceName(params.insuranceName);
        setInsuranceDescription(params.insuranceDescription);
        // Gọi getPrice() để cập nhật lại danh sách insurance và trạng thái checkbox
        if (pickupLocation && dropoffLocation && capacity) {
          getPrice();
        }
      }
    });
    return unsubscribe;
  }, [navigation, route.params, totalPrice.price]);

  useEffect(() => {
    if (voucherCode && totalPrice.price > 0) {
      calculateDiscount(voucherCode);
    } else if (!voucherCode && totalPrice.price > 0) {
      setFinalPrice(totalPrice.price);
      setDiscountAmount(0);
    }
  }, [totalPrice.price, voucherCode]);

  // Render helpers
  const renderDatePicker = (type) => {
    const isBooking = type === "booking";
    const show = isBooking ? showBookingDatePicker : showExpirationDatePicker;
    const date = isBooking ? bookingDate : expirationDate;

    if (!show) return null;

    if (Platform.OS === "ios") {
      return (
        <Modal visible={show} transparent animationType="slide">
          <TouchableWithoutFeedback
            onPress={() =>
              isBooking
                ? setShowBookingDatePicker(false)
                : setShowExpirationDatePicker(false)
            }
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.datePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity
                      onPress={() =>
                        isBooking
                          ? setShowBookingDatePicker(false)
                          : setShowExpirationDatePicker(false)
                      }
                    >
                      <Text style={styles.cancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>
                      {isBooking ? "Chọn ngày đặt" : "Chọn ngày hết hạn"}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        isBooking
                          ? setShowBookingDatePicker(false)
                          : setShowExpirationDatePicker(false)
                      }
                    >
                      <Text style={styles.doneText}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange(type)}
                    minimumDate={isBooking ? new Date() : bookingDate}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      );
    }

    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="default"
        onChange={onDateChange(type)}
        minimumDate={isBooking ? new Date() : bookingDate}
      />
    );
  };

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => {
        if (
          !item.geometry ||
          !item.geometry.location ||
          !item.geometry.location.lat ||
          !item.geometry.location.lng
        ) {
          console.error("Dữ liệu tọa độ không hợp lệ:", item);
          Alert.alert("Lỗi", "Địa điểm này không có tọa độ hợp lệ.");
          return;
        }
        const newLocation = {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
        };
        console.log("Tọa độ đã chọn:", newLocation);
        if (activeLocationField === "pickup") {
          setPickupLocation(newLocation);
          setTitlePickup(item.formatted_address);
          setStartLocationAddress(item.formatted_address);
        } else {
          setDropoffLocation(newLocation);
          setTitleDropoff(item.formatted_address);
          setEndLocationAddress(item.formatted_address);
        }
        setSearchText("");
        setResultLocation([]);
        setIsSearching(false);
        setShowLocationPicker(false);
      }}
    >
      <Ionicons name="location-outline" size={20} color="#00b5ec" />
      <View style={styles.locationDetails}>
        <Text style={styles.locationMainText}>
          {item.name ||
            item.address_components?.[0]?.long_name ||
            "Không có tên"}
        </Text>
        <Text style={styles.locationSubText} numberOfLines={2}>
          {item.formatted_address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleNearLocationPress = (item) => {
    if (activeLocationField === "pickup") {
      setPickupLocation({ latitude: item.lat, longitude: item.long });
      setTitlePickup(item.formatted_address);
      setStartLocationAddress(item.formatted_address);
    } else {
      setDropoffLocation({ latitude: item.lat, longitude: item.long });
      setTitleDropoff(item.formatted_address);
      setEndLocationAddress(item.formatted_address);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    setIsSearching(true);
    if (text.length >= 3) {
      findLocation();
    } else {
      setResultLocation([]);
    }
  };

  const handleVoucherPress = () => {
    if (!paymentMethod) {
      Alert.alert(
        "Thông báo",
        "Vui lòng chọn phương thức thanh toán trước khi sử dụng voucher"
      );
      return;
    }
    const formattedPaymentMethod = paymentMethod || "CASH";
    navigation.navigate("VoucherScreen", {
      orderValue: totalPrice.price,
      paymentMethod: formattedPaymentMethod,
      distanceKm: totalPrice.expectedDistance,
      isFirstOrder: totalPrice.isFirstOrder,
      pickupLocation,
      dropoffLocation,
      capacity,
      paymentMethod,
      bookingType,
      bookingDate: bookingDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      startLocationAddress,
      endLocationAddress,
      titlePickup,
      titleDropoff,
      notes,
      selectedInsuranceId,
      insuranceName,
      insuranceDescription
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đặt chuyến xe</Text>
          <Text style={styles.headerSubtitle}>Nhanh chóng và tiện lợi</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, styles.dateInput]}>
              <Text style={styles.label}>Ngày đặt</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => showDatePicker("booking")}
              >
                <Text style={styles.dateText}>
                  {bookingDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              {errors.bookingDate && (
                <Text style={styles.errorText}>{errors.bookingDate}</Text>
              )}
            </View>
            <View style={[styles.inputGroup, styles.dateInput]}>
              <Text style={styles.label}>Ngày hết hạn</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => showDatePicker("expiration")}
              >
                <Text style={styles.dateText}>
                  {expirationDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              {errors.expirationDate && (
                <Text style={styles.errorText}>{errors.expirationDate}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Điểm đón</Text>
            <TouchableOpacity
              style={styles.locationInput}
              onPress={() => openLocationPicker("pickup")}
            >
              <Ionicons name="location-outline" size={20} color="#00b5ec" />
              <Text style={styles.locationText}>
                {titlePickup || "Chọn điểm đón"}
              </Text>
            </TouchableOpacity>
            {errors.pickupLocation && (
              <Text style={styles.errorText}>{errors.pickupLocation}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Điểm giao</Text>
            <TouchableOpacity
              style={styles.locationInput}
              onPress={() => openLocationPicker("dropoff")}
            >
              <Ionicons name="location-outline" size={20} color="#00b5ec" />
              <Text style={styles.locationText}>
                {titleDropoff || "Chọn điểm giao"}
              </Text>
            </TouchableOpacity>
            {errors.dropoffLocation && (
              <Text style={styles.errorText}>{errors.dropoffLocation}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trọng tải (kg)</Text>
            <TextInput
              style={styles.textInput}
              value={capacity}
              onChangeText={(text) => {
                setCapacity(text);
                setErrors((prev) => ({ ...prev, capacity: "" }));
              }}
              keyboardType="numeric"
              placeholder="Nhập trọng tải"
              placeholderTextColor="#999"
            />
            {errors.capacity && (
              <Text style={styles.errorText}>{errors.capacity}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loại chuyến xe</Text>
            <Dropdown
              style={styles.dropdown}
              data={data}
              labelField="label"
              valueField="value"
              placeholder="Chọn loại chuyến"
              value={bookingType}
              onChange={(item) => setBookingType(item.value)}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
            />
          </View>

          {/* Checkbox option with description */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chọn gói bảo hiểm</Text>
            {insurances.length > 0 ? (
              insurances.map((insurance) => (
                <View
                  key={insurance.insurancePolicyId}
                  style={styles.checkboxContainer}
                >
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => {
                      const newSelectedId =
                        selectedInsuranceId === insurance.insurancePolicyId
                          ? null 
                          : insurance.insurancePolicyId; 
                      setSelectedInsuranceId(newSelectedId);
                      setInsuranceName(
                        newSelectedId ? insurance.insuranceName : ""
                      );
                      setInsuranceDescription(
                        newSelectedId ? insurance.insuranceDescription : ""
                      );
                      getPrice(); // Gọi getPrice để gửi selectedInsurancePolicyId
                    }}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        selectedInsuranceId === insurance.insurancePolicyId &&
                          styles.checkboxChecked,
                      ]}
                    >
                      {selectedInsuranceId === insurance.insurancePolicyId && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <View style={styles.checkboxTextContainer}>
                      <Text style={styles.checkboxLabel}>
                        {insurance.insuranceName}
                      </Text>
                      <Text style={styles.checkboxDescription}>
                        {insurance.insuranceDescription}
                      </Text>
                      <Text style={styles.checkboxPrice}>
                        Giá:{" "}
                        {insurance.insurancePrice.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noInsuranceText}>
                Không có gói bảo hiểm nào
              </Text>
            )}
          </View>

          {/* Thêm trường Ghi chú */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                setErrors((prev) => ({ ...prev, notes: "" }));
              }}
              placeholder="Nhập ghi chú cho đơn hàng"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
            />
            {errors.notes && (
              <Text style={styles.errorText}>{errors.notes}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phương thức thanh toán</Text>
            <View style={styles.paymentOptions}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.value &&
                      styles.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  <Ionicons
                    name={method.icon}
                    size={24}
                    color={paymentMethod === method.value ? "#00b5ec" : "#666"}
                  />
                  <Text
                    style={[
                      styles.paymentText,
                      paymentMethod === method.value &&
                        styles.paymentTextSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {totalPrice.price > 0 && (
            <View style={styles.priceCard}>
              <View style={styles.priceItem}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="car-outline" size={24} color="#2ecc71" />
                  <Text style={[styles.priceLabel, { marginLeft: 10 }]}>
                    Quãng đường
                  </Text>
                </View>
                <Text style={styles.priceValue}>
                  {totalPrice.expectedDistance || 0} km
                </Text>
              </View>
              <View style={styles.priceItem}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="cash-outline" size={24} color="#2ecc71" />
                  <Text style={[styles.priceLabel, { marginLeft: 10 }]}>
                    Giá ban đầu
                  </Text>
                </View>
                <Text style={styles.priceValue}>
                  {totalPrice.price.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Text>
              </View>
              {discountAmount > 0 && (
                <>
                  <View style={styles.priceItem}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={24}
                        color="#2ecc71"
                      />
                      <Text style={[styles.priceLabel, { marginLeft: 10 }]}>
                        Giảm giá
                      </Text>
                    </View>
                    <Text style={[styles.priceValue, { color: "#ff6b6b" }]}>
                      -{" "}
                      {discountAmount.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                    </Text>
                  </View>
                  <View style={styles.priceItem}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={24}
                        color="#2ecc71"
                      />
                      <Text style={[styles.priceLabel, { marginLeft: 10 }]}>
                        Tổng tiền sau giảm
                      </Text>
                    </View>
                    <Text style={styles.priceValue}>
                      {finalPrice.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {voucherCode && (
            <View style={styles.voucherSelected}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="ticket-outline" size={20} color="#2ecc71" />
                <Text style={[styles.voucherSelectedText, { marginLeft: 10 }]}>
                  Voucher: {voucherCode}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setVoucherCode(null);
                  setDiscountAmount(0);
                  setFinalPrice(totalPrice.price || 0);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.voucherButton}
            onPress={handleVoucherPress}
          >
            <Ionicons name="ticket-outline" size={24} color="#fff" />
            <Text style={styles.voucherText}>Sử dụng Voucher</Text>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Đặt xe ngay</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderDatePicker("booking")}
      {renderDatePicker("expiration")}

      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <GestureHandlerRootView style={styles.modalContainer}>
          <View style={styles.mapContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm địa điểm..."
                onFocus={() => setIsSearching(true)}
                value={searchText}
                onChangeText={handleSearchChange}
              />
              {isSearching && resultLocation.length > 0 && (
                <FlatList
                  data={resultLocation}
                  renderItem={renderLocationItem}
                  keyExtractor={(item) => item.place_id}
                  style={styles.searchResults}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              onPress={(e) => handleLocationSelect(e.nativeEvent.coordinate)}
            >
              {pickupLocation && activeLocationField === "pickup" && (
                <Marker coordinate={pickupLocation} title="Điểm đón" />
              )}
              {dropoffLocation && activeLocationField === "dropoff" && (
                <Marker coordinate={dropoffLocation} title="Điểm giao" />
              )}
            </MapView>

            {/* Nút lấy vị trí hiện tại */}
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={getCurrentLocation}
            >
              <Ionicons name="locate-outline" size={24} color="#fff" />
            </TouchableOpacity>

            {!isSearching && (
              <BottomSheet ref={bottomSheetRef} index={0} snapPoints={["50%"]}>
                <BottomSheetView>
                  <FlatList
                    data={locationState}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.nearLocationItem}
                        onPress={() => handleNearLocationPress(item)}
                      >
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color="#00b5ec"
                        />
                        <Text style={styles.nearLocationText}>
                          {item.formatted_address}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setShowLocationPicker(false)}
                  >
                    <Text style={styles.confirmButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </BottomSheetView>
              </BottomSheet>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#1a1a1a" },
  headerSubtitle: { fontSize: 16, color: "#666", marginTop: 4 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  dropdown: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  placeholderStyle: { fontSize: 16, color: "#999" },
  selectedTextStyle: { fontSize: 16, color: "#333" },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateInput: { flex: 1, marginRight: 12 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateText: { fontSize: 16, color: "#333" },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  locationText: { flex: 1, marginLeft: 12, fontSize: 16, color: "#333" },
  textInput: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  paymentOptions: { flexDirection: "row", justifyContent: "space-between" },
  paymentOption: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  paymentOptionSelected: { borderColor: "#00b5ec", backgroundColor: "#e6f3ff" },
  paymentText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  paymentTextSelected: { color: "#00b5ec", fontWeight: "600" },
  priceCard: {
    backgroundColor: "#f0f4f8",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e6ed",
  },
  priceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceLabel: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  priceValue: { fontSize: 16, fontWeight: "700", color: "#2ecc71" },
  voucherSelected: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2ecc71",
  },
  voucherSelectedText: { color: "#2ecc71", fontSize: 16, fontWeight: "600" },
  voucherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2ecc71",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    shadowColor: "#2ecc71",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  voucherText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 12,
    textAlign: "center",
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: "#00b5ec",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#00b5ec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  errorText: { color: "#ff4444", fontSize: 12, marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    zIndex: 20,
    elevation: 5,
  },
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 60,
    right: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchResults: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 5,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  locationDetails: { marginLeft: 12, flex: 1 },
  locationMainText: { fontSize: 16, fontWeight: "600", color: "#333" },
  locationSubText: { fontSize: 14, color: "#666" },
  nearLocationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  nearLocationText: { marginLeft: 12, fontSize: 16, color: "#333" },
  confirmButton: {
    backgroundColor: "#00b5ec",
    borderRadius: 12,
    padding: 14,
    margin: 16,
    alignItems: "center",
  },
  confirmButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  pickerTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  cancelText: { fontSize: 16, color: "#00b5ec" },
  doneText: { fontSize: 16, color: "#00b5ec", fontWeight: "600" },
  currentLocationButton: {
    position: "absolute",
    bottom: 80, // Tăng giá trị bottom để nút nằm cao hơn (trước là 20)
    right: 20,
    backgroundColor: "#00b5ec",
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  notesInput: {
    textAlignVertical: "top",
    minHeight: 80,
    paddingTop: 10,
    marginBottom: 20,
  },
  checkboxContainer: {
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#00b5ec",
    backgroundColor: "#fff",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#00b5ec",
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    flexWrap: "wrap",
    flexShrink: 1,
  },
  noInsuranceText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  checkboxPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2ecc71",
    marginTop: 4,
  },
});

export default TripBooking;

