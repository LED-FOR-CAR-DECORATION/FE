import type {
  ApiResponseCheckoutResponse,
  ApiResponseConfirmOrderDeliveryResponse,
  ApiResponseListOrderSummaryItem,
  ApiResponseOrderDetailResponse,
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
        request<{ data: BackendStaffOrderSummary[]; meta?: any }>(OpenAPI, {
          method: "GET",
          url: "/api/management/staff/orders",
          query: {
            status: orderStatus,
            paymentStatus: params.paymentStatus,
            deliveryStatus: params.deliveryStatus,
            page: 0,
            size: params.size ?? 50,
          },
        }).catch(() => ({ data: [] as BackendStaffOrderSummary[] })),
      ),
    );

    const uniqueById = new Map<number, BackendStaffOrderSummary>();
    for (const res of responses) {
      for (const item of res.data ?? []) {
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

export async function apiUpdateStaffOrderStatus(orderId: number | string, status: string): Promise<void> {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId) || numericId <= 0) return;
  await request(OpenAPI, {
    method: "PATCH",
    url: "/api/management/staff/orders/{id}/status",
    path: { id: numericId },
    body: { status },
  });
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
  INVALID_SERVICE_HOUR: "Gói dịch vụ đã chọn hiện đã ngoài khung giờ nhận đơn trong ngày.",
  INVALID_ORDER_STATUS_TRANSITION:
    "Đơn hàng không ở trạng thái chờ đóng hàng, là đơn hàng số, hoặc đã có chuyến giao hàng đang hoạt động.",
  CARRIER_CONFLICT: "Chuyến giao hàng cho đơn này đã được tạo trước đó trên AhaMove.",
  CARRIER_NOT_CONFIGURED: "Chưa cấu hình tích hợp AhaMove, vui lòng liên hệ kỹ thuật.",
  CARRIER_UNAVAILABLE: "Dịch vụ giao vận AhaMove tạm thời không phản hồi. Vui lòng thử lại sau ít phút.",
  INTERNAL_SERVER_ERROR: "Lỗi máy chủ khi tạo đơn giao vận.",
};

export function getDispatchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as ErrorResponse | undefined;
    const code = (body as { code?: string } | undefined)?.code;
    if (code && DISPATCH_ERROR_MESSAGES[code]) {
      return DISPATCH_ERROR_MESSAGES[code];
    }
    const detail = body?.details?.find((d) => d.message)?.message;
    if (body?.message) return body.message;
    if (detail) return detail;
  }
  if (error instanceof Error && error.message) {
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
