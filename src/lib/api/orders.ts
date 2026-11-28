import type {
  ApiResponseCancelOrderResponse,
  ApiResponseCheckoutResponse,
  ApiResponseConfirmOrderDeliveryResponse,
  ApiResponseListOrderSummaryItem,
  ApiResponseOrderDetailResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  CheckoutRequest,
  CheckoutResponse,
  ConfirmOrderDeliveryResponse,
  ErrorResponse,
  OrderDetailResponse,
  OrderFilterRequest,
  OrderSummaryItem,
} from "@/api_client";
import { ApiError, OrdersService } from "@/api_client";
import { request } from "@/api_client/core/request";
import { fetchAllPages } from "./paging";
import { OpenAPI } from "./client";

export interface FetchOrdersParams {
  status?: OrderFilterRequest.status;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export async function fetchMyOrders(params: FetchOrdersParams = {}): Promise<{
  items: OrderSummaryItem[];
  totalElements: number;
  totalPages: number;
}> {
  const res = await request<ApiResponseListOrderSummaryItem>(OpenAPI, {
    method: "GET",
    url: "/api/orders",
    query: {
      status: params.status,
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  });
  const items = res.data ?? [];
  return {
    items,
    totalElements: res.meta?.totalElements ?? items.length,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchOrderDetail(orderId: number | string): Promise<OrderDetailResponse | null> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res: ApiResponseOrderDetailResponse = await OrdersService.getOrderDetail(numericId);
  return res.data ?? null;
}

export async function apiCheckoutOrder(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const res: ApiResponseCheckoutResponse = await OrdersService.checkout(payload);
  if (!res.data) {
    throw new Error("Không nhận được phản hồi tạo đơn hàng từ máy chủ.");
  }
  return res.data;
}

export function getConfirmDeliveryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code === "INVALID_ORDER_STATUS_TRANSITION") {
      return "Chỉ đơn hàng ở trạng thái ĐÃ GIAO mới có thể xác nhận nhận hàng.";
    }
    if (code === "ORDER_NOT_FOUND") {
      return "Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn.";
    }
    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không thể xác nhận đã nhận hàng. Vui lòng thử lại.";
}

export async function apiConfirmOrderDelivery(
  orderId: number | string,
): Promise<ConfirmOrderDeliveryResponse> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }

  try {
    const res: ApiResponseConfirmOrderDeliveryResponse =
      await OrdersService.confirmDelivery(numericId);
    if (!res.data) {
      throw new Error("Không nhận được phản hồi xác nhận nhận hàng từ máy chủ.");
    }
    return res.data;
  } catch (error) {
    throw new Error(getConfirmDeliveryErrorMessage(error));
  }
}

export function getCancelOrderErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code === "INVALID_ORDER_STATUS_TRANSITION") {
      return "Đơn hàng không thể hủy (chỉ hủy được đơn chờ thanh toán hoặc chờ đóng hàng chưa bàn giao vận chuyển).";
    }
    if (code === "ORDER_NOT_FOUND") {
      return "Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn.";
    }
    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không thể hủy đơn hàng. Vui lòng thử lại.";
}

export async function apiCancelOrder(
  orderId: number | string,
  reason?: string,
): Promise<CancelOrderResponse> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }

  const payload: CancelOrderRequest =
    reason && reason.trim() ? { reason: reason.trim() } : {};

  try {
    const res: ApiResponseCancelOrderResponse = await OrdersService.cancelOrder(
      numericId,
      payload,
    );
    if (!res.data) {
      throw new Error("Không nhận được phản hồi hủy đơn hàng từ máy chủ.");
    }
    return res.data;
  } catch (error) {
    throw new Error(getCancelOrderErrorMessage(error));
  }
}

export interface BackendStaffOrderSummary {
  orderId: number;
  orderType: string;
  status: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  customerId: number;
  customerFullName?: string;
  customerEmail?: string;
  recipientName?: string;
  recipientPhone?: string;
  totalAmount: number;
  totalItems: number;
  primaryProductName: string;
  primaryProductThumbnail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BackendStaffOrderDetail {
  orderId: number;
  orderType: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  customer: {
    customerId: number;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    orderItemId: number;
    productId: number;
    productName: string;
    productType?: string;
    thumbnailUrl?: string;
    previewGifUrl?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  delivery?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrierFee?: number;
    recipientName?: string;
    recipientPhone?: string;
    fullAddress?: string;
    latitude?: number;
    longitude?: number;
    deliveryStatus?: string;
    estimatedDeliveryAt?: string;
    deliveredAt?: string;
    failureReason?: string | null;
    deliveryAttemptCount?: number;
    maxDeliveryAttempts?: number;
  };
  payment?: {
    paymentId: number;
    gateway: string;
    transactionCode?: string;
    amount: number;
    status: string;
    paidAt?: string;
    createdAt: string;
  };
}

const ALL_STAFF_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PROCESSING",
  "PARTIALLY_FULFILLED",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "DELIVERY_FAILED",
  "REFUNDED",
  "CANCELED",
] as const;

export async function fetchStaffOrders(params: {
  status?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  allStatuses?: boolean;
  page?: number;
  size?: number;
} = {}): Promise<{
  items: BackendStaffOrderSummary[];
  totalElements: number;
  totalPages: number;
}> {
  if (params.allStatuses !== false && !params.status) {
    const responses = await Promise.all(
      ALL_STAFF_ORDER_STATUSES.map((orderStatus) =>
        fetchAllPages(async (page) => {
          const res = await request<{ data: BackendStaffOrderSummary[]; meta?: any }>(OpenAPI, {
            method: "GET",
            url: "/api/management/staff/orders",
            query: {
              status: orderStatus,
              paymentStatus: params.paymentStatus,
              deliveryStatus: params.deliveryStatus,
              page,
              size: params.size ?? 50,
            },
          });
          return { items: res.data ?? [], totalPages: res.meta?.totalPages ?? 1 };
        }),
      ),
    );

    const uniqueById = new Map<number, BackendStaffOrderSummary>();
    for (const items of responses) {
      for (const item of items) {
        uniqueById.set(item.orderId, item);
      }
    }

    const items = Array.from(uniqueById.values()).sort((a, b) => {
      const timeDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (Number.isFinite(timeDiff) && timeDiff !== 0) return timeDiff;
      return b.orderId - a.orderId;
    });

    return {
      items,
      totalElements: items.length,
      totalPages: 1,
    };
  }

  const res = await request<{ data: BackendStaffOrderSummary[]; meta?: any }>(OpenAPI, {
    method: "GET",
    url: "/api/management/staff/orders",
    query: {
      status: params.status,
      paymentStatus: params.paymentStatus,
      deliveryStatus: params.deliveryStatus,
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  });
  const items = res.data ?? [];
  return {
    items,
    totalElements: res.meta?.totalElements ?? items.length,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchStaffOrderDetail(orderId: number | string): Promise<BackendStaffOrderDetail | null> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await request<{ data: BackendStaffOrderDetail }>(OpenAPI, {
    method: "GET",
    url: "/api/management/staff/orders/{id}",
    path: { id: numericId },
  });
  return res.data ?? null;
}

export interface UpdateStaffDeliveryAddressRequest {
  recipientName: string;
  recipientPhone: string;
  fullAddress: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function getStaffOrderActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code === "INVALID_ORDER_STATUS_TRANSITION" && body?.message) {
      if (body.message.includes("maximum number of redelivery attempts")) {
        return "Đơn hàng đã hết lượt giao lại tối đa (2 lần). Vui lòng chọn Hoàn hàng & Hoàn tiền.";
      }
      return body.message;
    }
    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function apiUpdateStaffOrderStatus(
  orderId: number | string,
  status: string,
  reason?: string,
): Promise<void> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }
  try {
    await request(OpenAPI, {
      method: "PATCH",
      url: "/api/management/staff/orders/{id}/status",
      path: { id: numericId },
      body: {
        status,
        ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
      },
      mediaType: "application/json",
    });
  } catch (error) {
    throw new Error(getStaffOrderActionErrorMessage(error, "Không thể cập nhật trạng thái đơn hàng."));
  }
}

export async function apiUpdateStaffOrderDeliveryAddress(
  orderId: number | string,
  payload: UpdateStaffDeliveryAddressRequest,
): Promise<BackendStaffOrderDetail["delivery"]> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }
  try {
    const res = await request<{ data: BackendStaffOrderDetail["delivery"] }>(OpenAPI, {
      method: "PATCH",
      url: "/api/management/staff/orders/{id}/delivery-address",
      path: { id: numericId },
      body: {
        recipientName: payload.recipientName.trim(),
        recipientPhone: payload.recipientPhone.trim(),
        fullAddress: payload.fullAddress.trim(),
        ...(payload.latitude != null ? { latitude: payload.latitude } : {}),
        ...(payload.longitude != null ? { longitude: payload.longitude } : {}),
      },
      mediaType: "application/json",
    });
    return res.data;
  } catch (error) {
    throw new Error(
      getStaffOrderActionErrorMessage(error, "Không thể cập nhật thông tin người nhận giao hàng."),
    );
  }
}

export interface DispatchOrderRequest {
  /** Mã gói dịch vụ AhaMove (vd: SGN-BIKE, BIKE, 2H) */
  serviceId: string;
  /** Ghi chú dặn dò tài xế giao hàng */
  remarks?: string | null;
  /** Khối lượng kiện hàng tính bằng kg (vd: 1.5) */
  weight?: number | null;
}

export interface DispatchOrderResponse {
  orderId: number;
  orderStatus: "SHIPPING";
  deliveryStatus: "ASSIGNED";
  trackingNumber: string;
  trackingUrl?: string | null;
  carrierFee?: number | null;
}

const DISPATCH_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: "Dữ liệu bàn giao không hợp lệ. Vui lòng kiểm tra lại dịch vụ và khối lượng.",
  CARRIER_BAD_REQUEST: "Thông tin địa chỉ hoặc người nhận chưa đúng chuẩn AhaMove.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền bàn giao vận chuyển.",
  ORDER_NOT_FOUND: "Đơn hàng không tồn tại trong hệ thống.",
  CARRIER_RESOURCE_NOT_FOUND: "Gói dịch vụ AhaMove đã chọn không khả dụng tại khu vực này.",
  NOT_ENOUGH_CREDIT: "Tài khoản AhaMove của shop không đủ số dư. Vui lòng nạp thêm tiền trước khi bàn giao.",
  INVALID_DELIVERY_AREA: "Địa chỉ người nhận nằm ngoài phạm vi phục vụ của AhaMove.",
  INVALID_MAX_DISTANCE:
    "Địa điểm giao hàng nằm ngoài phạm vi phục vụ của AhaMove (vượt quá khoảng cách tối đa cho phép). Vui lòng kiểm tra lại địa chỉ hoặc chọn tuyến/gói dịch vụ khác.",
  INVALID_MIN_DISTANCE:
    "Khoảng cách giao hàng quá ngắn so với quy định tối thiểu của gói dịch vụ AhaMove.",
  OUT_OF_SERVICE_AREA: "Địa chỉ người nhận nằm ngoài khu vực hỗ trợ giao hàng của AhaMove.",
  INVALID_LOCATION:
    "Tọa độ hoặc địa chỉ giao hàng không hợp lệ trên bản đồ AhaMove. Vui lòng cập nhật lại địa chỉ.",
  INVALID_PATH: "Tuyến đường giao hàng không hợp lệ hoặc nằm ngoài phạm vi phục vụ của AhaMove.",
  INVALID_SERVICE: "Gói dịch vụ AhaMove đã chọn không hỗ trợ cho tuyến đường này.",
  CARRIER_REJECTED:
    "AhaMove từ chối tiếp nhận đơn giao hàng này. Vui lòng kiểm tra lại địa chỉ hoặc gói dịch vụ.",
  CARRIER_AUTH_FAILED: "Xác thực kết nối với đối tác AhaMove thất bại. Vui lòng liên hệ kỹ thuật.",
  CARRIER_INVALID_RESPONSE: "Phản hồi từ AhaMove không đầy đủ. Vui lòng thử lại sau ít phút.",
  INVALID_SERVICE_HOUR: "Gói dịch vụ đã chọn hiện đã ngoài khung giờ nhận đơn trong ngày.",
  INVALID_ORDER_STATUS_TRANSITION:
    "Đơn hàng không ở trạng thái chờ đóng hàng, là đơn hàng số, hoặc đã có chuyến giao hàng đang hoạt động.",
  CARRIER_CONFLICT: "Chuyến giao hàng cho đơn này đã được tạo trước đó trên AhaMove.",
  CARRIER_NOT_CONFIGURED: "Chưa cấu hình tích hợp AhaMove, vui lòng liên hệ kỹ thuật.",
  CARRIER_UNAVAILABLE: "Dịch vụ giao vận AhaMove tạm thời không phản hồi. Vui lòng thử lại sau ít phút.",
  INTERNAL_SERVER_ERROR: "Lỗi máy chủ khi tạo đơn giao vận.",
};

function formatMaxDistanceMessage(rawMessage?: string): string {
  const distanceMatch = rawMessage?.match(/([\d.,]+)\s*km/i);
  if (distanceMatch) {
    return `Địa điểm giao hàng nằm ngoài phạm vi phục vụ của AhaMove (khoảng cách ${distanceMatch[1]} km vượt quá giới hạn cho phép). Vui lòng kiểm tra lại địa chỉ hoặc chọn tuyến/gói dịch vụ khác.`;
  }
  return DISPATCH_ERROR_MESSAGES.INVALID_MAX_DISTANCE;
}

export function getDispatchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    const detail = body?.details?.find((d) => d.message)?.message;
    const rawMessage = body?.message || detail || error.message;

    if (
      code === "INVALID_MAX_DISTANCE" ||
      /INVALID_MAX_DISTANCE|Distance too far/i.test(rawMessage ?? "")
    ) {
      return formatMaxDistanceMessage(rawMessage);
    }
    if (code && DISPATCH_ERROR_MESSAGES[code]) {
      return DISPATCH_ERROR_MESSAGES[code];
    }
    const embeddedCode = rawMessage?.match(/AhaMove rejected[^()]*\(([A-Z0-9_]+)\)/i)?.[1]?.toUpperCase();
    if (embeddedCode && DISPATCH_ERROR_MESSAGES[embeddedCode]) {
      return DISPATCH_ERROR_MESSAGES[embeddedCode];
    }
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    if (/INVALID_MAX_DISTANCE|Distance too far/i.test(error.message)) {
      return formatMaxDistanceMessage(error.message);
    }
    const embeddedCode = error.message
      .match(/AhaMove rejected[^()]*\(([A-Z0-9_]+)\)/i)?.[1]
      ?.toUpperCase();
    if (embeddedCode && DISPATCH_ERROR_MESSAGES[embeddedCode]) {
      return DISPATCH_ERROR_MESSAGES[embeddedCode];
    }
    return error.message;
  }
  return "Không thể bàn giao đơn hàng sang AhaMove. Vui lòng thử lại.";
}

export async function apiDispatchOrder(
  orderId: number | string,
  payload: DispatchOrderRequest,
): Promise<DispatchOrderResponse> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }

  try {
    const res = await request<{ data: DispatchOrderResponse }>(OpenAPI, {
      method: "POST",
      url: "/api/management/staff/orders/{id}/dispatch",
      path: { id: numericId },
      body: {
        serviceId: payload.serviceId.trim().toUpperCase(),
        remarks: payload.remarks?.trim() || null,
        weight: payload.weight ? Number(payload.weight) : null,
      },
      mediaType: "application/json",
    });

    if (!res.data) {
      throw new Error("Không nhận được phản hồi bàn giao vận chuyển từ máy chủ.");
    }
    return res.data;
  } catch (error) {
    throw new Error(getDispatchErrorMessage(error));
  }
}

export interface LinkOrderFulfillmentDeviceRequest {
  orderItemId: number;
  serialNumber: string;
}

export interface FulfillmentProgressInfo {
  itemFulfilledCount: number;
  itemRequiredCount: number;
  orderFulfilledCount: number;
  orderRequiredCount: number;
  isFullyFulfilled: boolean;
}

export interface LinkOrderFulfillmentDeviceResponse {
  orderId: number;
  orderStatus: string;
  fulfillmentId: number;
  orderItemId: number;
  instanceId: number;
  serialNumber: string;
  macAddress: string;
  modelId: number;
  modelName: string;
  instanceStatus: string;
  progress: FulfillmentProgressInfo;
  linkedAt: string;
}

const FULFILLMENT_DEVICE_ERROR_MESSAGES: Record<string, string> = {
  INVALID_ORDER_ITEM: "Mục sản phẩm trong đơn hàng không hợp lệ hoặc không thuộc đơn này.",
  PHYSICAL_HARDWARE_NOT_REQUIRED: "Đơn hàng chỉ chứa sản phẩm số, không cần gán thiết bị LED vật lý.",
  ORDER_ITEM_ALREADY_FULFILLED: "Mục sản phẩm này đã được gán đủ số lượng thiết bị LED.",
  DEVICE_ALREADY_ASSIGNED: "Thiết bị LED này đã được gán cho một đơn hàng khác.",
  DEVICE_NOT_FOUND: "Không tìm thấy thiết bị LED với Serial Number vừa nhập.",
  DEVICE_NOT_IN_STOCK: "Thiết bị LED này hiện không ở trạng thái Trong kho (IN_STOCK).",
  DEVICE_MODEL_MISMATCH: "Mẫu thiết bị LED không khớp với sản phẩm mà khách hàng đã đặt.",
  INVALID_ORDER_STATUS_TRANSITION:
    "Chỉ có thể gán hoặc gỡ thiết bị khi đơn hàng ở trạng thái Chờ đóng hàng (PROCESSING / PARTIALLY_FULFILLED).",
};

export function getFulfillmentDeviceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (error.status === 403) {
      return "Bạn không có quyền thực hiện gán/gỡ thiết bị đóng hàng.";
    }
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code && FULFILLMENT_DEVICE_ERROR_MESSAGES[code]) {
      return FULFILLMENT_DEVICE_ERROR_MESSAGES[code];
    }
    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không thể gán thiết bị LED vào đơn hàng. Vui lòng thử lại.";
}

export async function apiLinkOrderFulfillmentDevice(
  orderId: number | string,
  payload: LinkOrderFulfillmentDeviceRequest,
): Promise<LinkOrderFulfillmentDeviceResponse> {
  const numericOrderId = Number(orderId);
  if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }
  const cleanSerial = payload.serialNumber.trim();
  if (!cleanSerial) {
    throw new Error("Vui lòng nhập hoặc chọn Serial Number thiết bị LED.");
  }

  try {
    const res = await request<{ data: LinkOrderFulfillmentDeviceResponse }>(OpenAPI, {
      method: "POST",
      url: "/api/management/staff/orders/{id}/fulfillment-devices",
      path: { id: numericOrderId },
      body: {
        orderItemId: Number(payload.orderItemId),
        serialNumber: cleanSerial,
      },
      mediaType: "application/json",
    });

    if (!res.data) {
      throw new Error("Không nhận được phản hồi gán thiết bị từ máy chủ.");
    }
    return res.data;
  } catch (error) {
    throw new Error(getFulfillmentDeviceErrorMessage(error));
  }
}

export async function apiUnlinkOrderFulfillmentDevice(
  orderId: number | string,
  instanceId: number,
): Promise<void> {
  const numericOrderId = Number(orderId);
  if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ.");
  }

  try {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: "/api/management/staff/orders/{id}/fulfillment-devices/{instanceId}",
      path: {
        id: numericOrderId,
        instanceId,
      },
    });
  } catch (error) {
    throw new Error(getFulfillmentDeviceErrorMessage(error));
  }
}
