import type { CartItem } from "@/features/cart/types";
import type { AuthUser } from "@/features/auth/types";

export type OrderStatus = "Pending" | "Confirmed" | "Shipping" | "Delivered" | "Cancelled";
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
  status: OrderStatus;
  createdAt: string;
  service: string;
  delivery?: {
    provider: "AHAMOVE";
    orderId: string;
    status: DeliveryStatus;
    createdAt: string;
    expectedAt: string;
  };
}