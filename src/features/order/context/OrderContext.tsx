"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "@/features/address/types";
import type { AuthUser } from "@/features/auth/types";
import type { CartItem } from "@/features/cart/types";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { ORDERS_CHANGED_EVENT, orderService } from "@/features/order/services/order.service";

interface OrderContextValue {
  orders: MockOrder[];
  createOrder: (input: { customer: AuthUser; items: CartItem[]; address: Address; shipping: number; paymentMethod: string }) => MockOrder;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  createDelivery: (id: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<MockOrder[]>([]);

  const refresh = useCallback(() => setOrders(orderService.list()), []);
  useEffect(() => {
    refresh();
    const handleChange = () => refresh();
    window.addEventListener(ORDERS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, handleChange);
  }, [refresh]);

  const createOrder = useCallback((input: Parameters<OrderContextValue["createOrder"]>[0]) => {
    const order = orderService.create(input);
    setOrders((current) => [order, ...current]);
    return order;
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    const updated = orderService.updateStatus(id, status);
    if (updated) setOrders((current) => current.map((order) => order.id === id ? updated : order));
  }, []);
  const createDelivery = useCallback(async (id: string) => {
    const updated = await orderService.createDelivery(id);
    if (updated) setOrders((current) => current.map((order) => order.id === id ? updated : order));
  }, []);

  return <OrderContext.Provider value={{ orders, createOrder, updateOrderStatus, createDelivery }}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used inside <OrderProvider>");
  return context;
}
