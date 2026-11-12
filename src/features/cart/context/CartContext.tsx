"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/features/cart/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  apiAddCartItem,
  apiClearCart,
  apiRemoveCartItem,
  apiUpdateCartItemQuantity,
  apiViewCart,
} from "@/lib/api/cart";

const SELECTED_KEY = "led_controller_cart_selected";

interface CartContextValue {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<void> | void;
  updateQuantity: (id: string, quantity: number) => Promise<void> | void;
  removeItem: (id: string) => Promise<void> | void;
  clearItems: (ids?: string[]) => Promise<void> | void;
  refreshCart: () => Promise<void>;
  subtotal: number;
  itemCount: number;
  /** Danh sách id sản phẩm đang được tick chọn để thanh toán */
  selectedIds: string[];
  /** Các sản phẩm đang được chọn để thanh toán */
  selectedItems: CartItem[];
  /** Tạm tính của các sản phẩm đang được chọn */
  selectedSubtotal: number;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  /** Chọn tất cả nếu chưa chọn hết, ngược lại bỏ chọn tất cả */
  toggleSelectAll: () => void;
  setSelectedIds: (ids: string[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";

  const refreshCart = useCallback(async () => {
    if (!isCustomer) {
      setItems([]);
      setSelectedIdsState([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const remoteItems = await apiViewCart();
      setItems(remoteItems);
      const savedSelected = typeof window !== "undefined" ? localStorage.getItem(SELECTED_KEY) : null;
      const parsedSelected = savedSelected ? (JSON.parse(savedSelected) as string[]) : [];
      setSelectedIdsState(parsedSelected.filter((id) => remoteItems.some((item) => item.id === id)));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    if (authLoading) return;
    void refreshCart();
  }, [authLoading, refreshCart]);

  useEffect(() => {
    if (!isLoading && typeof window !== "undefined") {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedIds));
    }
  }, [selectedIds, isLoading]);

  const addItem = useCallback(
    async (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const productId = item.productId ?? Number(item.id);
      if (isCustomer && Number.isFinite(productId) && productId > 0) {
        try {
          const updated = await apiAddCartItem(productId, quantity);
          setItems(updated);
          return;
        } catch (err) {
          console.error("Failed to add item to backend cart:", err);
          throw err;
        }
      }
      setItems((current) => {
        const existing = current.find((entry) => entry.id === item.id);
        if (existing) {
          return current.map((entry) =>
            entry.id === item.id ? { ...entry, ...item, quantity: entry.quantity + quantity } : entry,
          );
        }
        return [...current, { ...item, quantity }];
      });
    },
    [isCustomer],
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1) return;
      const target = items.find((item) => item.id === id);
      if (isCustomer && target?.cartItemId) {
        try {
          const updated = await apiUpdateCartItemQuantity(target.cartItemId, quantity);
          setItems(updated);
          return;
        } catch (err) {
          console.error("Failed to update item quantity in backend cart:", err);
          return;
        }
      }
      setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
    },
    [isCustomer, items],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const target = items.find((item) => item.id === id);
      if (isCustomer && target?.cartItemId) {
        try {
          const updated = await apiRemoveCartItem(target.cartItemId);
          setItems(updated);
          setSelectedIdsState((current) => current.filter((selectedId) => selectedId !== id));
          return;
        } catch (err) {
          console.error("Failed to remove item from backend cart:", err);
          return;
        }
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedIdsState((current) => current.filter((selectedId) => selectedId !== id));
    },
    [isCustomer, items],
  );

  const clearItems = useCallback(
    async (ids?: string[]) => {
      if (isCustomer) {
        try {
          if (!ids) {
            await apiClearCart();
            setItems([]);
            setSelectedIdsState([]);
            return;
          }
          const toRemove = items.filter((item) => ids.includes(item.id) && item.cartItemId);
          for (const entry of toRemove) {
            if (entry.cartItemId) {
              await apiRemoveCartItem(entry.cartItemId);
            }
          }
          const refreshed = await apiViewCart();
          setItems(refreshed);
          setSelectedIdsState((current) => current.filter((id) => !ids.includes(id)));
          return;
        } catch (err) {
          console.error("Failed to clear items from backend cart:", err);
        }
      }
      setItems((current) => (ids ? current.filter((item) => !ids.includes(item.id)) : []));
      setSelectedIdsState((current) => (ids ? current.filter((id) => !ids.includes(id)) : []));
    },
    [isCustomer, items],
  );

  const isSelected = useCallback((id: string) => selectedIds.includes(id), [selectedIds]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIdsState((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIdsState((current) => {
      const allSelected = items.length > 0 && items.every((item) => current.includes(item.id));
      return allSelected ? [] : items.map((item) => item.id);
    });
  }, [items]);
  const setSelectedIds = useCallback(
    (ids: string[]) => {
      setSelectedIdsState(ids.filter((id) => items.some((item) => item.id === id)));
    },
    [items],
  );

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);
  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        clearItems,
        refreshCart,
        subtotal,
        itemCount,
        selectedIds,
        selectedItems,
        selectedSubtotal,
        isSelected,
        toggleSelect,
        toggleSelectAll,
        setSelectedIds,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
