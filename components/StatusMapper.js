export function getScheduleStatusText(status) {
  switch (status) {
    case 'WAITING_FOR_DELIVERY':
      return 'Đang chờ giao hàng';
    case 'GETTING_TO_THE_POINT':
      return 'Đang đến điểm hẹn';
    default:
      return status || 'Không rõ';
  }
}

export function getAgreementStatusText(status) {
  switch (status) {
    case 'WAITING':
      return 'Đang chờ';
    case 'ON_THE_WAY_TO_PICKUP':
      return 'Đang đến điểm lấy hàng';
    case 'LOADING':
      return 'Đang chất hàng';
    case 'IN_TRANSIT':
      return 'Đang vận chuyển';
    case 'UNLOADING':
      return 'Đang dỡ hàng';
    case 'COMPLETED':
      return 'Hoàn tất';
    default:
      return status || 'Không rõ';
  }
}

export function getTripBookingStatusText(status) {
  switch (status) {
    case 'ARRANGING_DRIVER':
      return 'Đang sắp xếp tài xế';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'DRIVER_ON_THE_WAY':
      return 'Tài xế đã lên đường';
    case 'DELIVERED':
      return 'Đã giao hàng';
    case 'WAITING_FOR_DELIVERY':
      return 'Đang chờ giao hàng';
    case 'GETTING_TO_THE_POINT':
      return 'Đang đến điểm hẹn';
    case 'ORDER_COMPLETED':
      return 'Hoàn tất đơn hàng';
    case 'RECEIVED_THE_ITEM':
      return 'Đã nhận hàng';
    default:
      return status || 'Không rõ';
  }
}

export function getPaymentStatusText(status) {
  switch (status) {
    case 'PENDING':
      return 'Đang chờ thanh toán';
    case 'PAIR':
      return 'Đã thanh toán';
    default:
      return status || 'Không rõ';
  }
}

export function getRoleTypeText(status) {
  switch (status) {
    case 'ADMIN':
      return 'Quản trị';
    case 'CUSTOMER':
      return 'Khách hàng';
    case 'DRIVER':
      return 'Tài xế';
    case 'AREA_MANAGEMENT':
      return 'Quản lý khu vực';
    case 'FINANCE':
      return 'Tài chính';
    case 'HR':
      return 'Nhân sự';
    default:
      return status || 'Không rõ';
  }
}

export function getAddressTypeText(status) {
  switch (status) {
    case 'PERMANENT':
      return 'Thường trú';
    case 'TEMPORARY':
      return 'Tạm trú';
    default:
      return status || 'Không rõ';
  }
}

export function getDocumentTypeText(status) {
  switch (status) {
    case 'LICENSE':
      return 'Giấy phép';
    case 'VEHICLE':
      return 'Phương tiện';
    case 'IDENTIFICATION':
      return 'Định danh';
    default:
      return status || 'Không rõ';
  }
}

export function getStatusDocumentTypeText(status) {
  switch (status) {
    case 'NEW':
      return 'Mới';
    case 'APPROVED':
      return 'Đã duyệt';
    case 'REJECTED':
      return 'Từ chối';
    case 'EXPIRED':
      return 'Hết hạn';
    default:
      return status || 'Không rõ';
  }
}