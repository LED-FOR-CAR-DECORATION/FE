import type { ProductDefinition } from "@/features/cart/types";
import type { MockOrder } from "./types";

export interface OrderFulfillment {
  hasLED: boolean;
  hasCharacter: boolean;
  requiresDelivery: boolean;
  requiresCharacterEntitlement: boolean;
  characterIds: string[];
}

function classifyItem(item: ProductDefinition, result: OrderFulfillment): void {
  if (item.productType === "LED_MODEL") {
    result.hasLED = true;
    result.requiresDelivery = true;
    return;
  }
  if (item.productType === "CHARACTER") {
    result.hasCharacter = true;
    result.requiresCharacterEntitlement = true;
    if (!result.characterIds.includes(item.id)) result.characterIds.push(item.id);
    return;
  }
  item.components?.forEach((component) => classifyItem(component, result));
}

export function getOrderFulfillment(order: Pick<MockOrder, "items">): OrderFulfillment {
  const result: OrderFulfillment = {
    hasLED: false,
    hasCharacter: false,
    requiresDelivery: false,
    requiresCharacterEntitlement: false,
    characterIds: [],
  };
  order.items.forEach((item) => classifyItem(item, result));
  return result;
}

export function isCharacterOnlyOrder(order: Pick<MockOrder, "items">): boolean {
  const fulfillment = getOrderFulfillment(order);
  return fulfillment.hasCharacter && !fulfillment.hasLED;
}
