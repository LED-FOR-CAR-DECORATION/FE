import type { CartItem } from "@/features/cart/types";
import type { AuthUser } from "@/features/auth/types";
import type { Address } from "@/features/address/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import type { DeliveryStatus } from "@/features/order/types";
import { ahamoveService } from "./ahamove.service";
import { entitlementService } from "@/features/character/services/entitlement.service";
import { getOrderFulfillment } from "@/features/order/fulfillment";

export const ORDER_STORAGE_KEY = "led_controller_mock_orders";
export const ORDERS_CHANGED_EVENT = "led-controller-orders-changed";
const ORDER_DATA_RESET_KEY = "led_controller_mock_orders_reset_v1";
const VNPAY_MIGRATION_KEY = "led_controller_vnpay_migration_v1";

function readOrders(): MockOrder[] {
  if (typeof window === "undefined") return [];
  if (!localStorage.getItem(ORDER_DATA_RESET_KEY)) {
    localStorage.removeItem(ORDER_STORAGE_KEY);
    localStorage.setItem(ORDER_DATA_RESET_KEY, "true");
    return [];
  }
  try {
    const saved = localStorage.getItem(ORDER_STORAGE_KEY);
    if (saved) {
      const orders = JSON.parse(saved) as MockOrder[];
      if (!localStorage.getItem(VNPAY_MIGRATION_KEY)) {
        const migrated = orders.map((order) => ({ ...order, paymentMethod: "VNPAY", paymentStatus: "Paid" as const }));
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(migrated));
        localStorage.setItem(VNPAY_MIGRATION_KEY, "true");
        return migrated;
      }
      return orders;
    }
  } catch {
    // The provider will recover with an empty order list when browser storage is unavailable.
  }
  return [];
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
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: MockOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      customer: { userId: input.customer.userId, email: input.customer.email, fullName: input.customer.fullName },
      items: input.items,
      subtotal,
      shipping: input.shipping,
      total: subtotal + input.shipping,
      address: { fullName: input.address.fullName, phoneNumber: input.address.phoneNumber, fullAddress: input.address.fullAddress },
      paymentMethod: "VNPAY",
      paymentStatus: "Paid",
      status: "Pending",
      createdAt: new Date().toISOString(),
      service: "ViettelPost Fast",
    };
    writeOrders([order, ...readOrders()]);
    if (order.paymentStatus === "Paid") {
      entitlementService.grantFromOrder(input.customer.userId, order.id, getOrderFulfillment(order).characterIds);
    }
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
    if (!target || target.status !== "Confirmed" || target.delivery || !getOrderFulfillment(target).requiresDelivery) return target ?? null;
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
