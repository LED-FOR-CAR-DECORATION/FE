import type { CartItem } from "@/features/cart/types";
import type { AuthUser } from "@/features/auth/types";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PROCESSING"
  | "PARTIALLY_FULFILLED"
  | "SHIPPING"
  | "DELIVERED"
  | "COMPLETED"
  | "DELIVERY_FAILED"
  | "REFUNDED"
  | "CANCELED"
  | "PendingPayment"
  | "Preparing"
  | "HandedOver"
  | "Shipping"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Pending"
  | "Confirmed";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";
export type DeliveryStatus = "Created" | "Picked up" | "In transit" | "Out for delivery" | "Delivered" | "Exception";

export interface OrderAddressSnapshot {
  fullName: string;
  phoneNumber: string;
  fullAddress: string;
}

export interface MockOrder {
  id: string;
  customer: Pick<AuthUser, "userId" | "email" | "fullName">;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: OrderAddressSnapshot;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  status: OrderStatus;
  createdAt: string;
  service: string;
  delivery?: {
    provider: "AHAMOVE" | string;
    orderId: string;
    status: DeliveryStatus;
    rawStatus?: string;
    trackingUrl?: string;
    carrierFee?: number;
    createdAt: string;
    expectedAt: string;
  };
}