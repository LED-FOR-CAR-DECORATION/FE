"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "@/features/address/types";
import type { AuthUser } from "@/features/auth/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CartItem } from "@/features/cart/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { ORDERS_CHANGED_EVENT, orderService } from "@/features/order/services/order.service";
import type { DispatchOrderRequest, DispatchOrderResponse } from "@/lib/api/orders";

interface OrderContextValue {
  orders: MockOrder[];
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
  createOrder: (input: {
    customer: AuthUser;
    items: CartItem[];
    address: Address;
    shipping: number;
    paymentMethod: string;
  }) => Promise<{ id: string }>;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  createDelivery: (id: string) => Promise<void>;
  dispatchOrder: (id: string, payload: DispatchOrderRequest) => Promise<DispatchOrderResponse>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrders = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (user.role === "CUSTOMER") {
        const remoteOrders = await orderService.fetchCustomerOrders(user);
        setOrders(remoteOrders);
      } else if (user.role === "STAFF" || user.role === "MANAGER" || user.role === "ADMIN") {
        const remoteOrders = await orderService.fetchStaffOrders();
        setOrders(remoteOrders);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshOrders();
    const handleChange = () => {
      void refreshOrders();
    };
    window.addEventListener(ORDERS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, handleChange);
  }, [authLoading, refreshOrders]);

  const createOrder = useCallback(
    async (input: Parameters<OrderContextValue["createOrder"]>[0]) => {
      const result = await orderService.checkout({
        customer: input.customer,
        items: input.items,
        address: input.address,
      });
      await refreshOrders();
      return { id: result.orderId };
    },
    [refreshOrders],
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
      if (user?.role === "STAFF" || user?.role === "MANAGER" || user?.role === "ADMIN") {
        try {
          const targetBackendStatus =
            status === "Cancelled"
              ? "CANCELED"
              : status === "Confirmed"
                ? "PROCESSING"
                : status === "Delivered"
                  ? "COMPLETED"
                  : undefined;
          if (targetBackendStatus) {
            await orderService.updateStaffStatus(id, targetBackendStatus);
          }
        } catch (err) {
          console.error("Failed to update status on server:", err);
        }
      }
    },
    [user?.role],
  );

  const createDelivery = useCallback(async (_id: string) => {
    await refreshOrders();
  }, [refreshOrders]);

  const dispatchOrder = useCallback(
    async (id: string, payload: DispatchOrderRequest): Promise<DispatchOrderResponse> => {
      const res = await orderService.dispatchOrderToAhamove(id, payload);
      setOrders((current) =>
        current.map((order) => {
          if (order.id !== String(id)) return order;
          const nextShipping =
            typeof res.carrierFee === "number" ? res.carrierFee : order.shipping;
          return {
            ...order,
            status: "SHIPPING",
            shipping: nextShipping,
            total: order.subtotal + nextShipping,
            delivery: {
              provider: "AHAMOVE",
              orderId: res.trackingNumber,
              status: "Created",
              rawStatus: res.deliveryStatus || "ASSIGNED",
              trackingUrl: res.trackingUrl || undefined,
              carrierFee: res.carrierFee ?? undefined,
              createdAt: order.delivery?.createdAt || new Date().toISOString(),
              expectedAt: order.delivery?.expectedAt || new Date().toISOString(),
            },
          };
        }),
      );
      return res;
    },
    [],
  );

  return (
    <OrderContext.Provider value={{ orders, isLoading, refreshOrders, createOrder, updateOrderStatus, createDelivery, dispatchOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used inside <OrderProvider>");
  return context;
}
