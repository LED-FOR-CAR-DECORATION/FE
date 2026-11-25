"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CancelOrderResponse } from "@/api_client";
import type { Address } from "@/features/address/types";
import type { AuthUser } from "@/features/auth/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CartItem } from "@/features/cart/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { ORDERS_CHANGED_EVENT, orderService } from "@/features/order/services/order.service";
import type {
  DispatchOrderRequest,
  DispatchOrderResponse,
  UpdateStaffDeliveryAddressRequest,
} from "@/lib/api/orders";

interface OrderContextValue {
  orders: MockOrder[];
  isLoading: boolean;
  /** Lỗi của lần tải gần nhất; danh sách cũ được giữ nguyên khi lỗi. */
  error: string | null;
  refreshOrders: () => Promise<void>;
  createOrder: (input: {
    customer: AuthUser;
    items: CartItem[];
    address: Address;
    shipping: number;
    paymentMethod: string;
  }) => Promise<{ id: string; paymentCode?: string }>;
  updateOrderStatus: (id: string, status: OrderStatus, reason?: string) => Promise<void>;
  updateOrderDeliveryAddress: (id: string, payload: UpdateStaffDeliveryAddressRequest) => Promise<void>;
  createDelivery: (id: string) => Promise<void>;
  dispatchOrder: (id: string, payload: DispatchOrderRequest) => Promise<DispatchOrderResponse>;
  confirmOrderDelivery: (orderId: string | number) => Promise<void>;
  cancelCustomerOrder: (orderId: string | number, reason?: string) => Promise<CancelOrderResponse>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách đơn hàng.");
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
      return { id: result.orderId, paymentCode: result.paymentCode };
    },
    [refreshOrders],
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus, reason?: string) => {
      if (user?.role === "STAFF" || user?.role === "MANAGER" || user?.role === "ADMIN") {
        const targetBackendStatus =
          status === "Cancelled" || status === "CANCELED"
            ? "CANCELED"
            : status === "Confirmed" || status === "PROCESSING" || status === "Preparing"
              ? "PROCESSING"
              : status === "REFUNDED"
                ? "REFUNDED"
                : status === "Delivered" || status === "COMPLETED"
                  ? "COMPLETED"
                  : undefined;
        if (targetBackendStatus) {
          await orderService.updateStaffStatus(id, targetBackendStatus, reason);
          await refreshOrders();
          return;
        }
      }
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
    },
    [user?.role, refreshOrders],
  );

  const updateOrderDeliveryAddress = useCallback(
    async (id: string, payload: UpdateStaffDeliveryAddressRequest) => {
      await orderService.updateStaffDeliveryAddress(id, payload);
      await refreshOrders();
    },
    [refreshOrders],
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

  const confirmOrderDelivery = useCallback(
    async (orderId: string | number) => {
      await orderService.confirmDelivery(orderId);
      setOrders((current) =>
        current.map((order) =>
          String(order.id) === String(orderId) ? { ...order, status: "COMPLETED" as OrderStatus } : order,
        ),
      );
      await refreshOrders();
    },
    [refreshOrders],
  );

  const cancelCustomerOrder = useCallback(
    async (orderId: string | number, reason?: string): Promise<CancelOrderResponse> => {
      const res = await orderService.cancelCustomerOrder(orderId, reason);
      const nextStatus = (res.status as OrderStatus) || "CANCELED";
      setOrders((current) =>
        current.map((order) =>
          String(order.id) === String(orderId)
            ? {
                ...order,
                status: nextStatus,
                paymentStatus: nextStatus === "CANCELED" || nextStatus === "REFUNDED" ? "Cancelled" : order.paymentStatus,
              }
            : order,
        ),
      );
      await refreshOrders();
      return res;
    },
    [refreshOrders],
  );

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      isLoading,
      error,
      refreshOrders,
      createOrder,
      updateOrderStatus,
      updateOrderDeliveryAddress,
      createDelivery,
      dispatchOrder,
      confirmOrderDelivery,
      cancelCustomerOrder,
    }),
    [orders, isLoading, error, refreshOrders, createOrder, updateOrderStatus, updateOrderDeliveryAddress,
      createDelivery, dispatchOrder, confirmOrderDelivery, cancelCustomerOrder],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used inside <OrderProvider>");
  return context;
}
