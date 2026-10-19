import type { UserRole } from "../../features/auth/types";

// The most specific route wins: commission pricing belongs to MANAGER,
// even though the parent commission workspace belongs to STAFF.
const operatingRoutes: ReadonlyArray<{ path: string; role: UserRole }> = [
  { path: "/staff/commission/pricing", role: "MANAGER" as const },
  ...["/staff/inventory", "/staff/pricing", "/staff/warranty", "/staff/returns", "/manager/profile", "/manager"].map(path => ({ path, role: "MANAGER" as const })),
  ...["/staff/orders", "/staff/deliveries", "/staff/chat", "/staff/commission", "/staff/profile", "/staff"].map(path => ({ path, role: "STAFF" as const })),
].sort((a, b) => b.path.length - a.path.length);

export function canAccessOperatingRoute(role: UserRole | undefined, pathname: string): boolean {
  const route = operatingRoutes.find(({ path }) => pathname === path || (path !== "/staff" && path !== "/manager" && pathname.startsWith(`${path}/`)));
  return Boolean(route && route.role === role);
}
