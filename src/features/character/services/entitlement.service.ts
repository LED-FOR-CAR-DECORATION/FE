import type { UserEntitlement } from "@/features/character/types";

const ENTITLEMENT_KEY = "led_controller_mock_entitlements";
export const ENTITLEMENTS_CHANGED_EVENT = "led-controller-entitlements-changed";
const seedEntitlements: UserEntitlement[] = [
  { entitlementId: "ENT-1044", userId: "mock-customer-001", characterId: "character-space-robot", sourceType: "ORDER", sourceReferenceId: "ORD-1044", grantedAt: "2024-10-07T10:25:00.000Z" },
  { entitlementId: "ENT-1042-A", userId: "mock-customer-001", characterId: "sprite-pack-a", sourceType: "ORDER", sourceReferenceId: "ORD-1042", grantedAt: "2024-10-05T10:25:00.000Z" },
  { entitlementId: "ENT-1042-B", userId: "mock-customer-001", characterId: "character-cherry-bloom", sourceType: "ORDER", sourceReferenceId: "ORD-1042", grantedAt: "2024-10-05T10:25:00.000Z" },
  { entitlementId: "ENT-1041", userId: "mock-customer-001", characterId: "character-ninja", sourceType: "ORDER", sourceReferenceId: "ORD-1041", grantedAt: "2024-10-04T10:25:00.000Z" },
];

function read(): UserEntitlement[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(ENTITLEMENT_KEY);
    return saved ? JSON.parse(saved) as UserEntitlement[] : seedEntitlements;
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
