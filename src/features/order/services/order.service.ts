import { CheckoutRequest, type OrderDetailResponse, type OrderSummaryItem } from "@/api_client";
import type { Address } from "@/features/address/types";
import type { AuthUser } from "@/features/auth/types";
import type { CartItem } from "@/features/cart/types";
import type { DeliveryStatus, MockOrder, OrderStatus, PaymentStatus } from "@/features/order/types";
import {
  apiCheckoutOrder,
  apiDispatchOrder,
  apiUpdateStaffOrderStatus,
  fetchMyOrders,
  fetchOrderDetail,
  fetchStaffOrderDetail,
  fetchStaffOrders,
  type BackendStaffOrderDetail,
  type BackendStaffOrderSummary,
  type DispatchOrderRequest,
  type DispatchOrderResponse,
} from "@/lib/api/orders";
import { mapBackendProductType } from "@/lib/api/products";

export const ORDERS_CHANGED_EVENT = "led-controller-orders-changed";

export function mapBackendOrderStatus(status?: string): OrderStatus {
  switch (status) {
    case "PENDING_PAYMENT":
      return "PENDING_PAYMENT";
    case "PROCESSING":
      return "PROCESSING";
    case "PARTIALLY_FULFILLED":
      return "PARTIALLY_FULFILLED";
    case "SHIPPING":
      return "SHIPPING";
    case "DELIVERED":
      return "DELIVERED";
    case "COMPLETED":
      return "COMPLETED";
    case "DELIVERY_FAILED":
      return "DELIVERY_FAILED";
    case "REFUNDED":
      return "REFUNDED";
    case "CANCELED":
      return "CANCELED";
    case "PendingPayment":
    case "Pending":
      return "PENDING_PAYMENT";
    case "Preparing":
    case "Confirmed":
      return "PROCESSING";
    case "HandedOver":
      return "PARTIALLY_FULFILLED";
    case "Shipping":
      return "SHIPPING";
    case "Delivered":
      return "DELIVERED";
    case "Completed":
      return "COMPLETED";
    case "Cancelled":
      return "CANCELED";
    default:
      return "PENDING_PAYMENT";
  }
}

export function mapBackendPaymentStatus(orderStatus?: string, paymentStatus?: string): PaymentStatus {
  const normalizedPaymentStatus = paymentStatus?.toUpperCase();
  if (normalizedPaymentStatus === "SUCCESS" || normalizedPaymentStatus === "SUCCEEDED") return "Paid";
  if (normalizedPaymentStatus === "FAILED" || normalizedPaymentStatus === "EXPIRED") return "Failed";
  if (
    normalizedPaymentStatus === "REFUNDED" ||
    normalizedPaymentStatus === "CANCELLED" ||
    normalizedPaymentStatus === "CANCELED"
  ) {
    return "Cancelled";
  }
  if (
    orderStatus === "PROCESSING" ||
    orderStatus === "PARTIALLY_FULFILLED" ||
    orderStatus === "SHIPPING" ||
    orderStatus === "DELIVERED" ||
    orderStatus === "COMPLETED"
  ) {
    return "Paid";
  }
  if (orderStatus === "CANCELED" || orderStatus === "REFUNDED") return "Cancelled";
  return "Pending";
}

function resolveEffectiveOrderStatus(
  rawStatus: OrderStatus,
  paymentStatus: PaymentStatus,
  orderType?: string,
  hasDelivery?: boolean,
): OrderStatus {
  if (rawStatus === "PENDING_PAYMENT" && paymentStatus === "Paid") {
    const isDigitalOnly = orderType === "DIGITAL" || orderType === "SUBSCRIPTION" || !hasDelivery;
    return isDigitalOnly ? "COMPLETED" : "PROCESSING";
  }
  return rawStatus;
}

export function mapBackendDeliveryStatus(status?: string): DeliveryStatus {
  switch (status) {
    case "PENDING":
    case "ASSIGNED":
    case "ASSIGNING_DRIVER":
      return "Created";
    case "PICKED_UP":
    case "PICKING_UP":
      return "Picked up";
    case "SHIPPING":
    case "IN_TRANSIT":
      return "In transit";
    case "DELIVERED":
      return "Delivered";
    case "FAILED":
    case "RETURNED":
    case "CANCELED":
      return "Exception";
    default:
      return "Created";
  }
}

export function mapOrderSummaryAndDetailToOrder(
  summary: OrderSummaryItem,
  detail: OrderDetailResponse | null,
  customer: AuthUser | null,
): MockOrder {
  const items: CartItem[] = detail?.items?.length
    ? detail.items.map((item) => ({
        id: String(item.productId),
        productId: item.productId,
        productType: mapBackendProductType(item.productType),
        name: item.productName,
        price: Number(item.unitPrice ?? 0),
        quantity: item.quantity,
        previewUrl: item.previewGifUrl || item.thumbnailUrl || undefined,
      }))
    : [
        {
          id: String(summary.orderId),
          productType: summary.orderType === "DIGITAL" ? "CHARACTER" : "LED_MODEL",
          name: summary.primaryProductName,
          price: Number(summary.totalAmount ?? 0),
          quantity: summary.totalItems || 1,
          previewUrl: summary.primaryProductThumbnail ?? undefined,
        },
      ];

  const rawStatus = mapBackendOrderStatus(detail?.status ?? summary.status);
  const paymentStatus = mapBackendPaymentStatus(detail?.status ?? summary.status, detail?.payment?.status);
  const status = resolveEffectiveOrderStatus(
    rawStatus,
    paymentStatus,
    detail?.orderType ?? summary.orderType,
    Boolean(detail?.delivery),
  );

  return {
    id: String(summary.orderId),
    customer: {
      userId: customer?.userId ?? "",
      email: customer?.email ?? "",
      fullName: detail?.delivery?.recipientName || customer?.fullName || "Khách hàng",
    },
    items,
    subtotal: Number(detail?.subtotal ?? summary.totalAmount ?? 0),
    shipping: Number(detail?.shippingFee ?? 0),
    total: Number(detail?.totalAmount ?? summary.totalAmount ?? 0),
    address: {
      fullName: detail?.delivery?.recipientName || customer?.fullName || "",
      phoneNumber: detail?.delivery?.recipientPhone || customer?.phoneNumber || "",
      fullAddress: detail?.delivery?.fullAddress || "Giao sản phẩm số qua hệ thống",
    },
    paymentMethod: detail?.payment?.paymentGateway ?? "SEPAY",
    paymentStatus,
    paymentCode: detail?.payment?.paymentContent || detail?.payment?.bankReferenceCode || undefined,
    qrCodeUrl: detail?.payment?.qrCodeUrl ?? undefined,
    bankAccount: detail?.payment?.bankAccount ?? undefined,
    bankName: detail?.payment?.bankName ?? undefined,
    bankReferenceCode: detail?.payment?.bankReferenceCode ?? undefined,
    expiresAt: detail?.payment?.expiresAt ?? detail?.expiresAt ?? summary.expiresAt ?? undefined,
    paidAt: detail?.payment?.paidAt ?? undefined,
    status,
    createdAt: detail?.createdAt ?? summary.createdAt,
    service: detail?.delivery?.carrier ?? "AhaMove",
    delivery: detail?.delivery
      ? {
          provider: detail.delivery.carrier || "AHAMOVE",
          orderId: detail.delivery.trackingNumber || `DEL-${summary.orderId}`,
          status: mapBackendDeliveryStatus(detail.delivery.deliveryStatus),
          rawStatus: detail.delivery.deliveryStatus,
          trackingUrl: detail.delivery.trackingUrl || undefined,
          carrierFee: (detail.delivery as any)?.carrierFee,
          createdAt: detail.createdAt,
          expectedAt: detail.delivery.estimatedDeliveryAt || detail.createdAt,
        }
      : undefined,
  };
}

export function mapStaffOrderSummaryAndDetailToOrder(
  summary: BackendStaffOrderSummary,
  detail: BackendStaffOrderDetail | null,
): MockOrder {
  const items: CartItem[] = detail?.items?.length
    ? detail.items.map((item) => ({
        id: String(item.productId),
        productId: item.productId,
        productType: mapBackendProductType(item.productType),
        name: item.productName,
        price: Number(item.unitPrice ?? 0),
        quantity: item.quantity,
        previewUrl: item.previewGifUrl || item.thumbnailUrl || undefined,
      }))
    : [
        {
          id: String(summary.orderId),
          productType: summary.orderType === "DIGITAL" ? "CHARACTER" : "LED_MODEL",
          name: summary.primaryProductName,
          price: Number(summary.totalAmount ?? 0),
          quantity: summary.totalItems || 1,
          previewUrl: summary.primaryProductThumbnail ?? undefined,
        },
      ];

  const rawStatus = mapBackendOrderStatus(detail?.status ?? summary.status);
  const paymentStatus = mapBackendPaymentStatus(
    detail?.status ?? summary.status,
    detail?.payment?.status ?? summary.paymentStatus,
  );
  const status = resolveEffectiveOrderStatus(
    rawStatus,
    paymentStatus,
    detail?.orderType ?? summary.orderType,
    Boolean(detail?.delivery || summary.deliveryStatus),
  );

  return {
    id: String(summary.orderId),
    customer: {
      userId: String(summary.customerId),
      email: detail?.customer?.email || summary.customerEmail || "",
      fullName: detail?.customer?.fullName || summary.customerFullName || summary.recipientName || "Khách hàng",
    },
    items,
    subtotal: Number(detail?.subtotal ?? summary.totalAmount ?? 0),
    shipping: Number(detail?.shippingFee ?? 0),
    total: Number(detail?.totalAmount ?? summary.totalAmount ?? 0),
    address: {
      fullName: detail?.delivery?.recipientName || summary.recipientName || "",
      phoneNumber: detail?.delivery?.recipientPhone || summary.recipientPhone || "",
      fullAddress: detail?.delivery?.fullAddress || "Giao hàng qua GHN",
    },
    paymentMethod: detail?.payment?.gateway ?? "SEPAY",
    paymentStatus,
    paymentCode: detail?.payment?.transactionCode ?? undefined,
    bankReferenceCode: detail?.payment?.transactionCode ?? undefined,
    expiresAt: detail?.expiresAt ?? undefined,
    paidAt: detail?.payment?.paidAt,
    status,
    createdAt: detail?.createdAt ?? summary.createdAt,
    service: detail?.delivery?.carrier ?? "AhaMove",
    delivery: (detail?.delivery || summary.deliveryStatus)
      ? {
          provider: (detail?.delivery?.carrier || "AHAMOVE"),
          orderId: detail?.delivery?.trackingNumber || `DEL-${summary.orderId}`,
          status: mapBackendDeliveryStatus(detail?.delivery?.deliveryStatus ?? summary.deliveryStatus),
          rawStatus: detail?.delivery?.deliveryStatus ?? summary.deliveryStatus,
          trackingUrl: detail?.delivery?.trackingUrl || undefined,
          carrierFee: detail?.delivery?.carrierFee,
          createdAt: detail?.createdAt ?? summary.createdAt,
          expectedAt: detail?.delivery?.estimatedDeliveryAt || summary.createdAt,
        }
      : undefined,
  };
}

export const orderService = {
  async fetchCustomerOrders(customer: AuthUser | null): Promise<MockOrder[]> {
    if (!customer || customer.role !== "CUSTOMER") return [];
    try {
      const { items: summaries } = await fetchMyOrders({ page: 0, size: 50 });
      const details = await Promise.all(
        summaries.map((s) => fetchOrderDetail(s.orderId).catch(() => null)),
      );
      return summaries.map((summary, idx) =>
        mapOrderSummaryAndDetailToOrder(summary, details[idx] ?? null, customer),
      );
    } catch {
      return [];
    }
  },
  async fetchStaffOrders(): Promise<MockOrder[]> {
    try {
      const { items: summaries } = await fetchStaffOrders({ allStatuses: true, page: 0, size: 50 });
      const details = await Promise.all(
        summaries.map((s) => fetchStaffOrderDetail(s.orderId).catch(() => null)),
      );
      return summaries.map((summary, idx) =>
        mapStaffOrderSummaryAndDetailToOrder(summary, details[idx] ?? null),
      );
    } catch (err) {
      console.error("fetchStaffOrders failed:", err);
      return [];
    }
  },
  async updateStaffStatus(orderId: number | string, status: string): Promise<void> {
    let backendStatus = status;
    if (status === "Completed" || status === "COMPLETED" || status === "Confirmed") backendStatus = "COMPLETED";
    else if (status === "Preparing" || status === "PROCESSING") backendStatus = "PROCESSING";
    else if (status === "Cancelled" || status === "CANCELED") backendStatus = "CANCELED";
    await apiUpdateStaffOrderStatus(orderId, backendStatus);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT));
    }
  },
  async dispatchOrderToAhamove(
    orderId: number | string,
    payload: DispatchOrderRequest,
  ): Promise<DispatchOrderResponse> {
    const result = await apiDispatchOrder(orderId, payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT));
    }
    return result;
  },
  async checkout(input: {
    customer: AuthUser;
    items: CartItem[];
    address?: Address;
  }): Promise<{ orderId: string; paymentCode?: string }> {
    const cartItemIds = input.items
      .map((item) => item.cartItemId)
      .filter((id): id is number => typeof id === "number" && id > 0);

    if (cartItemIds.length === 0) {
      throw new Error("Không tìm thấy mã sản phẩm trong giỏ hàng để thanh toán.");
    }

    const numericAddressId = input.address ? Number(input.address.id) : NaN;
    const res = await apiCheckoutOrder({
      cartItemIds,
      deliveryAddressId: Number.isFinite(numericAddressId) && numericAddressId > 0 ? numericAddressId : undefined,
      paymentGateway: CheckoutRequest.paymentGateway.SEPAY,
    });
    const detail = await fetchOrderDetail(res.orderId).catch(() => null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT));
    }
    return {
      orderId: String(res.orderId),
      paymentCode: detail?.payment?.paymentContent ?? undefined,
    };
  },
};
