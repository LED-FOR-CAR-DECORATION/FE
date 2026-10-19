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
  grantFromPayment(userId: string, paymentId: string, characterIds: string[]) {
    const current = read();
    const additions = [...new Set(characterIds)]
      .filter((characterId) => !current.some((item) => item.userId === userId && item.characterId === characterId))
      .map((characterId) => ({
        entitlementId: `ENT-${Date.now()}-${characterId}`,
        userId,
        characterId,
        sourceType: "PAYMENT" as const,
        sourceReferenceId: paymentId,
        grantedAt: new Date().toISOString(),
      }));
    write([...additions, ...current]);
    return additions;
  },
};
