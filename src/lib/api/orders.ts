import type {
  ApiResponseCheckoutResponse,
  ApiResponseListOrderSummaryItem,
  ApiResponseOrderDetailResponse,
  CheckoutRequest,
  CheckoutResponse,
  OrderDetailResponse,
  OrderFilterRequest,
  OrderSummaryItem,
} from "@/api_client";
import { OrdersService } from "@/api_client";
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
  const res = await request<{ data: BackendStaffOrderSummary[]; meta?: any }>(OpenAPI, {
    method: "GET",
    url: "/api/management/staff/orders",
    query: {
      status: params.status,
      paymentStatus: params.paymentStatus,
      deliveryStatus: params.deliveryStatus,
      allStatuses: params.allStatuses ?? true,
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
