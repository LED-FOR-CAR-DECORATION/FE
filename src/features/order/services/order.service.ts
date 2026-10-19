import type { CartItem } from "@/features/cart/types";
import type { AuthUser } from "@/features/auth/types";
import type { Address } from "@/features/address/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import type { DeliveryStatus } from "@/features/order/types";
import { ahamoveService } from "./ahamove.service";

export const ORDER_STORAGE_KEY = "led_controller_mock_orders";
export const ORDERS_CHANGED_EVENT = "led-controller-orders-changed";

const seedOrders: MockOrder[] = [
  {
    id: "ORD-1049",
    customer: { userId: "mock-customer-001", email: "customer123@gmail.com", fullName: "Customer 123" },
    items: [{ id: "matrix-32", productType: "LED_MODEL", name: "32×32 Matrix Panel", price: 40, quantity: 2 }, { id: "sprite-a", productType: "CHARACTER", name: "Character Sprite Pack A", price: 5, quantity: 1 }],
    subtotal: 85, shipping: 5, total: 90,
    address: { fullName: "Customer 123", phoneNumber: "(+84) 123 456 789", fullAddress: "Number 8, Sesame Street, Q1, TP.HCM" },
    paymentMethod: "COD", paymentStatus: "Pending", status: "Pending", createdAt: "2024-10-08T10:24:00.000Z", service: "ViettelPost Fast",
  },
  {
    id: "ORD-1047",
    customer: { userId: "mock-customer-002", email: "customer2@example.com", fullName: "Tran Thi Anh" },
    items: [{ id: "matrix-16", productType: "LED_MODEL", name: "16×16 Matrix Panel", price: 45, quantity: 1 }],
    subtotal: 45, shipping: 2, total: 47,
    address: { fullName: "Tran Thi Anh", phoneNumber: "0987654321", fullAddress: "456 Nguyen Hue, Q3, TP.HCM" },
    paymentMethod: "MOCK_CARD", paymentStatus: "Paid", status: "Confirmed", createdAt: "2024-10-08T09:12:00.000Z", service: "Standard",
  },
];

function readOrders(): MockOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(ORDER_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as MockOrder[];
  } catch {
    // The provider will recover with seed data when browser storage is unavailable.
  }
  return seedOrders;
}

function writeOrders(orders: MockOrder[]): MockOrder[] {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(ORDERS_CHANGED_EVENT));
  return orders;
}

export const orderService = {
  list(): MockOrder[] {
    return readOrders();
  },
  create(input: {
    customer: AuthUser;
    items: CartItem[];
    address: Address;
    shipping: number;
    paymentMethod: string;
  }): MockOrder {
    if (!input.items.length || input.items.some(item => item.productType !== "LED_MODEL")) {
      throw new Error("Đơn hàng chỉ dành cho thiết bị LED. Character được nhận trực tiếp trong Gallery sau thanh toán.");
    }
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: MockOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      customer: { userId: input.customer.userId, email: input.customer.email, fullName: input.customer.fullName },
      items: input.items,
      subtotal,
      shipping: input.shipping,
      total: subtotal + input.shipping,
      address: { fullName: input.address.fullName, phoneNumber: input.address.phoneNumber, fullAddress: input.address.fullAddress },
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === "MOCK_CARD" ? "Paid" : "Pending",
      status: "Pending",
      createdAt: new Date().toISOString(),
      service: "ViettelPost Fast",
    };
    writeOrders([order, ...readOrders()]);
    return order;
  },
  updateStatus(id: string, status: OrderStatus): MockOrder | null {
    const orders = readOrders();
    const target = orders.find((order) => order.id === id);
    if (!target) return null;
    const updated = { ...target, status };
    writeOrders(orders.map((order) => order.id === id ? updated : order));
    return updated;
  },
  async createDelivery(id: string): Promise<MockOrder | null> {
    const orders = readOrders();
    const target = orders.find((order) => order.id === id);
    if (!target || target.status !== "Confirmed" || target.delivery || !target.items.some((item) => item.productType === "LED_MODEL")) return target ?? null;
    const result = await ahamoveService.createOrder(target);
    const updated: MockOrder = {
      ...target,
      status: "Shipping",
      delivery: {
        provider: "AHAMOVE",
        orderId: result.orderId,
        status: "Created" satisfies DeliveryStatus,
        createdAt: new Date().toISOString(),
        expectedAt: result.expectedAt,
      },
    };
    writeOrders(orders.map((order) => order.id === id ? updated : order));
    return updated;
  },
};
