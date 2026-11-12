import type { UserEntitlement } from "@/features/character/types";

const ENTITLEMENT_KEY = "led_controller_entitlements";
export const ENTITLEMENTS_CHANGED_EVENT = "led-controller-entitlements-changed";
const seedEntitlements: UserEntitlement[] = [];

function read(): UserEntitlement[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(ENTITLEMENT_KEY);
    return saved ? (JSON.parse(saved) as UserEntitlement[]) : seedEntitlements;
  } catch {
    return [];
  }
}

function write(entitlements: UserEntitlement[]) {
  localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(entitlements));
  window.dispatchEvent(new CustomEvent(ENTITLEMENTS_CHANGED_EVENT));
}

export const entitlementService = {
  listByUser(userId: string) {
    return read().filter((item) => item.userId === userId);
  },
  grantFromOrder(userId: string, orderId: string, characterIds: string[]) {
    const current = read();
    const additions = characterIds
      .filter((characterId) => !current.some((item) => item.userId === userId && item.characterId === characterId))
      .map((characterId) => ({
        entitlementId: `ENT-${Date.now()}-${characterId}`,
        userId,
        characterId,
        sourceType: "ORDER" as const,
        sourceReferenceId: orderId,
        grantedAt: new Date().toISOString(),
      }));
    write([...additions, ...current]);
    return additions;
  },
};
