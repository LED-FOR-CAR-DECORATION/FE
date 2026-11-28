import type { ProductDefinition } from "@/features/cart/types";
import type { MockOrder, OrderKind } from "./types";

export interface OrderFulfillment {
  hasLED: boolean;
  hasCharacter: boolean;
  hasSubscription: boolean;
  requiresDelivery: boolean;
  requiresCharacterEntitlement: boolean;
  requiresSubscriptionActivation: boolean;
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
  if (item.productType === "SUBSCRIPTION") {
    result.hasSubscription = true;
    result.requiresSubscriptionActivation = true;
    return;
  }
  if (item.productType === "BUNDLE") {
    if (item.components?.length) {
      item.components.forEach((component) => classifyItem(component, result));
    } else {
      result.hasLED = true;
      result.requiresDelivery = true;
      result.hasCharacter = true;
      result.requiresCharacterEntitlement = true;
    }
    return;
  }
  item.components?.forEach((component) => classifyItem(component, result));
}

export function getOrderFulfillment(order: { items: ProductDefinition[] }): OrderFulfillment {
  const result: OrderFulfillment = {
    hasLED: false,
    hasCharacter: false,
    hasSubscription: false,
    requiresDelivery: false,
    requiresCharacterEntitlement: false,
    requiresSubscriptionActivation: false,
    characterIds: [],
  };
  order.items.forEach((item) => classifyItem(item, result));
  return result;
}

export function getOrderKind(order: { orderType?: string; items: ProductDefinition[] }): OrderKind {
  const fulfillment = getOrderFulfillment(order);
  const hasDigital = fulfillment.hasCharacter || fulfillment.hasSubscription;
  if (fulfillment.hasLED && hasDigital) {
    return "MIXED";
  }
  if (order.orderType === "MIXED" || order.orderType === "BUNDLE") {
    if (order.items.length > 0 && !fulfillment.hasLED && hasDigital) {
      return "DIGITAL";
    }
    return "MIXED";
  }
  if (fulfillment.hasLED || order.orderType === "PHYSICAL") {
    return "PHYSICAL";
  }
  if (hasDigital || order.orderType === "DIGITAL" || order.orderType === "SUBSCRIPTION") {
    return "DIGITAL";
  }
  return "PHYSICAL";
}

export function isCharacterOnlyOrder(order: Pick<MockOrder, "orderType" | "items">): boolean {
  return getOrderKind(order) === "DIGITAL";
}

export function isPhysicalOrder(order: Pick<MockOrder, "orderType" | "items">): boolean {
  return getOrderKind(order) === "PHYSICAL";
}

export function isMixedOrder(order: Pick<MockOrder, "orderType" | "items">): boolean {
  return getOrderKind(order) === "MIXED";
}
