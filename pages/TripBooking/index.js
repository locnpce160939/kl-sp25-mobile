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
  StatusBar,
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
import * as Location from "expo-location"; // Thêm import nàyz
import { useAlert } from "../../components/CustomAlert"; // Import hook useAlert

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
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState("");
  // Thêm state mới
  const [insurances, setInsurances] = useState([]);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState(null);
  const [insuranceName, setInsuranceName] = useState("");
  const [insuranceDescription, setInsuranceDescription] = useState("");
  const { showAlert } = useAlert(); // Sử dụng hook useAlert
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showSavedAddressesView, setShowSavedAddressesView] = useState(false);

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
      const locationData = await getNearLocation(currentCoords);

      // Chỉ cập nhật location field đang active
      if (locationData && locationData.length > 0) {
        const address = locationData[0].formatted_address;
        if (activeLocationField === "pickup") {
          setPickupLocation(currentCoords);
          setTitlePickup(address);
          setStartLocationAddress(address);
        } else if (activeLocationField === "dropoff") {
          setDropoffLocation(currentCoords);
          setTitleDropoff(address);
          setEndLocationAddress(address);
        }
      } else {
        // Fallback nếu không lấy được địa chỉ
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
    recipientPhoneNumber: "",
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

  // Thêm validation cho số điện thoại
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      bookingDate: "",
      expirationDate: "",
      pickupLocation: "",
      dropoffLocation: "",
      capacity: "",
      recipientPhoneNumber: "",
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

    // Thêm validation cho số điện thoại
    if (!recipientPhoneNumber) {
      newErrors.recipientPhoneNumber = "Số điện thoại người nhận là bắt buộc";
      isValid = false;
    } else if (!validatePhoneNumber(recipientPhoneNumber)) {
      newErrors.recipientPhoneNumber = "Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10 số)";
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
    setShowSavedAddressesView(false);
    setIsSearching(false);
    setIsBottomSheetOpen(true);
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

  const handleSavedAddressSelect = (savedAddress) => {
    const location = {
      latitude: savedAddress.latitude,
      longitude: savedAddress.longitude,
    };

    if (activeLocationField === "pickup") {
      setPickupLocation(location);
      setTitlePickup(savedAddress.address);
      setStartLocationAddress(savedAddress.address);
    } else if (activeLocationField === "dropoff") {
      setDropoffLocation(location);
      setTitleDropoff(savedAddress.address);
      setEndLocationAddress(savedAddress.address);
    }

    setShowSavedAddressesView(false);
    setShowLocationPicker(false);
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
      if (!searchText || searchText.trim().length < 3) {
        setResultLocation([]);
        return;
      }

      let token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }

      const res = await axios.get(
        `${BASE_URL}/api/location/address-geocode?address=${encodeURIComponent(
          searchText.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // Thêm timeout 10 giây
        }
      );

      if (res.data && res.data.data && res.data.data.results) {
        const result = res.data.data.results;
        console.log("Kết quả tìm kiếm từ API:", result);
        if (!result || result.length === 0) {
          setResultLocation([]);
          Alert.alert("Thông báo", "Không tìm thấy địa điểm nào.");
          return;
        }
        setResultLocation(result);
      } else {
        setResultLocation([]);
        Alert.alert("Thông báo", "Không tìm thấy địa điểm nào.");
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
      setResultLocation([]);
      
      if (error.response) {
        // Xử lý các mã lỗi cụ thể
        switch (error.response.status) {
          case 409:
            Alert.alert("Thông báo", "Vui lòng nhập ít nhất 3 ký tự để tìm kiếm.");
            break;
          case 401:
            Alert.alert("Lỗi", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            break;
          case 429:
            Alert.alert("Thông báo", "Bạn đã tìm kiếm quá nhiều lần. Vui lòng thử lại sau.");
            break;
          default:
            Alert.alert(
              "Lỗi",
              "Không thể tìm kiếm địa điểm. Vui lòng thử lại sau."
            );
        }
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert("Lỗi", "Kết nối quá chậm. Vui lòng thử lại.");
      } else {
        Alert.alert("Lỗi", "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
      }
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

  const getPrice = async (insuranceId = null) => {
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
      if (!token) {
        throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
      }

      const origin = `${pickupLocation.latitude},${pickupLocation.longitude}`;
      const destination = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
      const weight = parseInt(capacity);

      const payload = {
        pickupLocation: origin,
        dropoffLocation: destination,
        capacity: weight,
        bookingType,
      };

      if (insuranceId) {
        payload.selectedInsurancePolicyId = insuranceId;
      }

      console.log("Payload gửi lên API:", payload);

      const res = await axios.post(
        `${BASE_URL}/api/tripBookings/direction`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      const priceData = res.data.data;
      console.log("Dữ liệu từ API:", priceData);

      const newInsurances = Array.isArray(priceData.insurances)
        ? priceData.insurances
        : [];
      setInsurances(newInsurances);

      setTotalPrice({
        price: priceData.price || 0,
        expectedDistance: priceData.expectedDistance || 0,
        isFirstOrder: priceData.isFirstOrder || false,
      });
      setFinalPrice(priceData.price || 0);
      setDiscountAmount(0);

      if (
        insuranceId &&
        newInsurances.some((ins) => ins.insurancePolicyId === insuranceId)
      ) {
        setSelectedInsuranceId(insuranceId);
        const selectedInsurance = newInsurances.find(
          (ins) => ins.insurancePolicyId === insuranceId
        );
        setInsuranceName(selectedInsurance?.insuranceName || "");
        setInsuranceDescription(selectedInsurance?.insuranceDescription || "");
      } else {
        setSelectedInsuranceId(null);
        setInsuranceName("");
        setInsuranceDescription("");
      }
    } catch (error) {
      console.error("Lỗi khi lấy giá:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể tính giá. Vui lòng kiểm tra lại địa điểm."
      );
      setTotalPrice({ price: 0, expectedDistance: 0, isFirstOrder: false });
      setFinalPrice(0);
      setDiscountAmount(0);
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
          recipientPhoneNumber: parseInt(recipientPhoneNumber),
          paymentMethod,
          startLocationAddress,
          endLocationAddress,
          notes,
          voucherCode: voucherCode || undefined,
          recipientPhoneNumber,
          selectedInsurancePolicyId: selectedInsuranceId || undefined,
          useInsurance: selectedInsuranceId != null ? true : undefined,
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
        showAlert({
          title: "Thành Công",
          message: "Bạn đã đặt chuyến đi thành công",
          type: "success",
        });
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
      if (params.recipientPhoneNumber) setRecipientPhoneNumber(params.recipientPhoneNumber);
      if (params.selectedInsuranceId) {
        setSelectedInsuranceId(params.selectedInsuranceId);
        setInsuranceName(params.insuranceName || "");
        setInsuranceDescription(params.insuranceDescription || "");
        // Gọi getPrice với selectedInsuranceId để cập nhật lại danh sách insurance và trạng thái checkbox
        if (pickupLocation && dropoffLocation && capacity) {
          getPrice(params.selectedInsuranceId);
        }
      }
    });
    return unsubscribe;
  }, [navigation, route.params, totalPrice.price, pickupLocation, dropoffLocation, capacity]);

  useEffect(() => {
    if (voucherCode && totalPrice.price > 0) {
      calculateDiscount(voucherCode);
    } else if (!voucherCode && totalPrice.price > 0) {
      setFinalPrice(totalPrice.price);
      setDiscountAmount(0);
    }
  }, [totalPrice.price, voucherCode]);

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  const loadSavedAddresses = async () => {
    try {
      const savedAddressesString = await AsyncStorage.getItem('savedAddresses');
      if (savedAddressesString) {
        const addresses = JSON.parse(savedAddressesString);
        setSavedAddresses(addresses);
      }
    } catch (error) {
      console.error("Error loading saved addresses:", error);
    }
  };

  const saveAddress = async (address) => {
    try {
      const savedAddressesString = await AsyncStorage.getItem('savedAddresses');
      let addresses = [];
      if (savedAddressesString) {
        addresses = JSON.parse(savedAddressesString);
      }

      // Kiểm tra xem địa chỉ đã tồn tại chưa
      const isDuplicate = addresses.some(
        (saved) => saved.address === address.formatted_address
      );

      if (isDuplicate) {
        Alert.alert("Thông báo", "Địa chỉ này đã được lưu!");
        return;
      }

      const newAddress = {
        id: Date.now().toString(), // Tạo ID duy nhất
        name: address.name || address.formatted_address,
        address: address.formatted_address,
        latitude: address.geometry.location.lat,
        longitude: address.geometry.location.lng,
      };

      addresses.push(newAddress);
      await AsyncStorage.setItem('savedAddresses', JSON.stringify(addresses));
      setSavedAddresses(addresses);
      showAlert({
        title: "Thành công",
        message: "Đã lưu địa chỉ thành công",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving address:", error);
      Alert.alert("Lỗi", "Không thể lưu địa chỉ. Vui lòng thử lại.");
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const savedAddressesString = await AsyncStorage.getItem('savedAddresses');
      if (savedAddressesString) {
        let addresses = JSON.parse(savedAddressesString);
        addresses = addresses.filter(address => address.id !== addressId);
        await AsyncStorage.setItem('savedAddresses', JSON.stringify(addresses));
        setSavedAddresses(addresses);
        showAlert({
          title: "Thành công",
          message: "Đã xóa địa chỉ thành công",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      Alert.alert("Lỗi", "Không thể xóa địa chỉ. Vui lòng thử lại.");
    }
  };

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
            <View style={styles.modalOverlay}>              <TouchableWithoutFeedback>
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
      <View style={styles.locationItemContent}>
        <View style={styles.locationIconContainer}>
          <Ionicons name="location-outline" size={20} color="#00b5ec" />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationMainText}>
            {item.name || item.address_components?.[0]?.long_name || "Không có tên"}
          </Text>
          <Text style={styles.locationSubText} numberOfLines={2}>
            {item.formatted_address}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveAddressButton}
          onPress={() => saveAddress(item)}
        >
          <Ionicons name="bookmark-outline" size={20} color="#00b5ec" />
        </TouchableOpacity>
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
      recipientPhoneNumber,
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

  const renderSavedAddressItem = ({ item }) => (
    <TouchableOpacity
      style={styles.savedAddressItem}
      onPress={() => handleSavedAddressSelect(item)}
    >
      <View style={styles.savedAddressContent}>
        <Ionicons name="location" size={24} color="#00b5ec" />
        <View style={styles.savedAddressDetails}>
          <Text style={styles.savedAddressName}>{item.name}</Text>
          <Text style={styles.savedAddressText}>{item.address}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteAddressButton}
          onPress={() => deleteAddress(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Đặt chuyến xe</Text>
          <Text style={styles.headerSubtitle}>Nhanh chóng và tiện lợi</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                      // Truyền newSelectedId trực tiếp vào getPrice
                      getPrice(newSelectedId);
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
                        {insurance.insuranceName || "N/A"}
                      </Text>
                      <Text style={styles.checkboxDescription}>
                        {insurance.insuranceDescription || "Không có mô tả"}
                      </Text>
                      <Text style={styles.checkboxPrice}>
                        Giá:{" "}
                        {insurance.insurancePrice
                          ? insurance.insurancePrice.toLocaleString("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            })
                          : "0 VND"}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại người nhận</Text>
            <TextInput
              style={styles.textInput}
              value={recipientPhoneNumber}
              onChangeText={(text) => {
                setRecipientPhoneNumber(text);
                setErrors((prev) => ({ ...prev, recipientPhoneNumber: "" }));
              }}
              keyboardType="numeric"
              placeholder="Nhập số điện thoại người nhận"
              placeholderTextColor="#999"
              maxLength={10}
            />
            {errors.recipientPhoneNumber && (
              <Text style={styles.errorText}>{errors.recipientPhoneNumber}</Text>
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
        onRequestClose={() => {
          setShowLocationPicker(false);
          setShowSavedAddressesView(false);
        }}
      >
        <GestureHandlerRootView style={styles.modalContainer}>
          <View style={styles.mapContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowLocationPicker(false);
                setShowSavedAddressesView(false);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            {showSavedAddressesView ? (
              <View style={styles.savedAddressesOverlay}>
                <View style={styles.savedAddressesContainer}>
                  <View style={styles.savedAddressesHeader}>
                    <Text style={styles.savedAddressesTitle}>
                      {activeLocationField === "pickup" ? "Chọn điểm đón" : "Chọn điểm giao"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowSavedAddressesView(false)}
                      style={styles.closeModalButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={savedAddresses}
                    renderItem={renderSavedAddressItem}
                    keyExtractor={(item) => item.id}
                    style={styles.savedAddressesList}
                    ListEmptyComponent={() => (
                      <Text style={styles.noAddressesText}>
                        Chưa có địa chỉ nào được lưu
                      </Text>
                    )}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm kiếm địa điểm..."
                      onFocus={() => setIsSearching(true)}
                      value={searchText}
                      onChangeText={handleSearchChange}
                    />
                    <TouchableOpacity
                      style={styles.savedAddressesButton}
                      onPress={() => setShowSavedAddressesView(true)}
                    >
                      <Ionicons name="bookmark" size={24} color="#00b5ec" />
                    </TouchableOpacity>
                  </View>
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
              </>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  //  paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#f5f7fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  scrollContent: { padding: 16, paddingBottom: 32 },
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  savedAddressesButton: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 12,
  },
  locationIconContainer: {
    marginRight: 12,
  },
  saveAddressButton: {
    padding: 8,
  },
  savedAddressesOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  savedAddressesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  savedAddressesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  savedAddressesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  savedAddressesList: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  savedAddressItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  savedAddressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  savedAddressDetails: {
    flex: 1,
    marginLeft: 12,
  },
  savedAddressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  savedAddressText: {
    fontSize: 14,
    color: '#666',
  },
  deleteAddressButton: {
    padding: 8,
  },
  noAddressesText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});

export default TripBooking;


