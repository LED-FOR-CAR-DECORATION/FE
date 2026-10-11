import type { UserEntitlement } from "@/features/character/types";

const ENTITLEMENT_KEY = "led_controller_mock_entitlements";

function read(): UserEntitlement[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ENTITLEMENT_KEY) ?? "[]") as UserEntitlement[];
  } catch {
    return [];
  }
}

function write(entitlements: UserEntitlement[]) {
  localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(entitlements));
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
