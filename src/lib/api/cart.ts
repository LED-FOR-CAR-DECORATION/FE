import type { CartItemResponse, CartResponse } from "@/api_client";
import { ShoppingCartService } from "@/api_client";
import type { CartItem } from "@/features/cart/types";
import { mapBackendProductType } from "./products";
import "./client";

export function mapCartItemResponseToCartItem(item: CartItemResponse): CartItem {
  return {
    id: String(item.productId),
    productId: item.productId,
    cartItemId: item.cartItemId,
    productType: mapBackendProductType(item.productType),
    name: item.productName,
    price: Number(item.unitPrice ?? 0),
    quantity: item.quantity,
    previewUrl: item.thumbnailUrl || undefined,
    isAvailable: item.isAvailable,
    unavailableReason: item.unavailableReason,
  };
}

export function mapCartResponseToItems(cart?: CartResponse): CartItem[] {
  if (!cart?.items) return [];
  return cart.items.map(mapCartItemResponseToCartItem);
}

export async function apiViewCart(): Promise<CartItem[]> {
  const res = await ShoppingCartService.viewCart();
  return mapCartResponseToItems(res.data);
}

export async function apiAddCartItem(productId: number, quantity: number = 1): Promise<CartItem[]> {
  const res = await ShoppingCartService.addItem({ productId, quantity });
  return mapCartResponseToItems(res.data);
}

export async function apiUpdateCartItemQuantity(cartItemId: number, quantity: number): Promise<CartItem[]> {
  const res = await ShoppingCartService.updateItemQuantity(cartItemId, { quantity });
  return mapCartResponseToItems(res.data);
}

export async function apiRemoveCartItem(cartItemId: number): Promise<CartItem[]> {
  const res = await ShoppingCartService.removeItem(cartItemId);
  return mapCartResponseToItems(res.data);
}

export async function apiClearCart(): Promise<void> {
  await ShoppingCartService.clearCart();
}

