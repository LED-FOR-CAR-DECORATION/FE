import type { CartItem } from "@/features/cart/types";
import type { UserEntitlement } from "@/features/character/types";
import type { MockOrder } from "./types";
import { getOrderFulfillment } from "./fulfillment";

export type CharacterOrderComposition = "Character-only" | "Mixed order" | "Bundle";
export type CharacterEntitlementStatus = "Granted" | "Pending" | "Unavailable";

export interface CharacterSaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  previewUrl?: string;
  characterId: string;
  fromBundle: boolean;
  bundleId?: string;
}

function collectCharacters(item: CartItem, result: CharacterSaleItem[], multiplier = 1, bundleId?: string): void {
  if (item.productType === "CHARACTER") {
    const quantity = item.quantity * multiplier;
    result.push({
      id: `${bundleId ?? item.id}-${item.id}`,
      name: item.name,
      quantity,
      unitPrice: item.price,
      subtotal: item.price * quantity,
      previewUrl: item.previewUrl,
      characterId: item.id,
      fromBundle: Boolean(bundleId),
      bundleId,
    });
    return;
  }
  if (item.productType === "BUNDLE") {
    item.components?.forEach((component) => collectCharacters(component, result, multiplier * item.quantity, item.id));
  }
}

export function getCharacterSaleItems(order: Pick<MockOrder, "items">): CharacterSaleItem[] {
  const result: CharacterSaleItem[] = [];
  order.items.forEach((item) => collectCharacters(item, result));
  return result;
}

export function getCharacterOrderComposition(order: Pick<MockOrder, "items">): CharacterOrderComposition {
  const hasBundle = order.items.some((item) => item.productType === "BUNDLE");
  const hasCharacter = getCharacterSaleItems(order).length > 0;
  const hasLED = getOrderFulfillment(order).hasLED;
  if (hasBundle) return "Bundle";
  return hasLED && hasCharacter ? "Mixed order" : "Character-only";
}

export function getCharacterRevenue(order: Pick<MockOrder, "items">): number | null {
  const characterItems = getCharacterSaleItems(order);
  if (!characterItems.length) return 0;
  const hasMixedBundle = order.items.some((item) =>
    item.productType === "BUNDLE" &&
    item.components?.some((component) => component.productType === "CHARACTER") &&
    item.components.some((component) => component.productType === "LED_MODEL"),
  );
  if (hasMixedBundle) return null;
  return characterItems.reduce((total, item) => total + item.subtotal, 0);
}

export function getCharacterEntitlementStatus(
  order: Pick<MockOrder, "id" | "paymentStatus">,
  characterItems: CharacterSaleItem[],
  entitlements: UserEntitlement[],
): CharacterEntitlementStatus {
  if (order.paymentStatus !== "Paid") return "Unavailable";
  const grantedIds = new Set(entitlements.filter((item) => item.sourceReferenceId === order.id).map((item) => item.characterId));
  return characterItems.every((item) => grantedIds.has(item.characterId)) ? "Granted" : "Pending";
}
