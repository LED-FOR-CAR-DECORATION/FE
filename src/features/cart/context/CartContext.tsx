"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/features/cart/types";
import { PRODUCTS } from "@/features/cart/catalog";

const CART_KEY = "led_controller_mock_cart";

interface CartContextValue {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearItems: (ids?: string[]) => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      const savedItems = saved ? JSON.parse(saved) as CartItem[] : [];
      setItems(savedItems.map((item) => {
        const catalogItem = PRODUCTS.find((product) => product.id === item.id);
        return catalogItem ? { ...catalogItem, quantity: item.quantity } : item;
      }));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isLoading) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, isLoading]);

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
  const removeItem = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clearItems = useCallback((ids?: string[]) => setItems((current) => ids ? current.filter((item) => !ids.includes(item.id)) : []), []);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  return <CartContext.Provider value={{ items, isLoading, addItem, updateQuantity, removeItem, clearItems, subtotal, itemCount }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
