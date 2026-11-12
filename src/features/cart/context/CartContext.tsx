"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/features/cart/types";
import { PRODUCTS } from "@/features/cart/catalog";

const CART_KEY = "led_controller_mock_cart";
const SELECTED_KEY = "led_controller_mock_cart_selected";

interface CartContextValue {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearItems: (ids?: string[]) => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      const savedItems = saved ? JSON.parse(saved) as CartItem[] : [];
      const hydrated = savedItems.map((item) => {
        const catalogItem = PRODUCTS.find((product) => product.id === item.id);
        return catalogItem ? { ...catalogItem, quantity: item.quantity } : item;
      });
      setItems(hydrated);

      const savedSelected = localStorage.getItem(SELECTED_KEY);
      const parsedSelected = savedSelected ? JSON.parse(savedSelected) as string[] : [];
      setSelectedIdsState(parsedSelected.filter((id) => hydrated.some((item) => item.id === id)));
    } catch {
      setItems([]);
      setSelectedIdsState([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedIds));
  }, [selectedIds, isLoading]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) return current.map((entry) => entry.id === item.id ? { ...entry, ...item, quantity: entry.quantity + quantity } : entry);
      return [...current, { ...item, quantity }];
    });
  }, []);
  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  }, []);
  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedIdsState((current) => current.filter((selectedId) => selectedId !== id));
  }, []);
  const clearItems = useCallback((ids?: string[]) => {
    setItems((current) => ids ? current.filter((item) => !ids.includes(item.id)) : []);
    setSelectedIdsState((current) => ids ? current.filter((id) => !ids.includes(id)) : []);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.includes(id), [selectedIds]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIdsState((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIdsState((current) => {
      const allSelected = items.length > 0 && items.every((item) => current.includes(item.id));
      return allSelected ? [] : items.map((item) => item.id);
    });
  }, [items]);
  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState(ids.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [selectedItems]);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        clearItems,
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
