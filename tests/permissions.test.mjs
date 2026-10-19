import test from "node:test";
import assert from "node:assert/strict";
import { canAccessOperatingRoute } from "../src/lib/auth/permissions.ts";

test("staff can open order details and commission, but cannot enter manager pricing", () => {
  for (const route of ["/staff", "/staff/orders", "/staff/orders/ORD-1", "/staff/deliveries", "/staff/chat", "/staff/commission", "/staff/profile"]) assert.equal(canAccessOperatingRoute("STAFF", route), true, route);
  for (const route of ["/staff/commission/pricing", "/staff/commission/pricing/edit", "/staff/inventory", "/manager"]) assert.equal(canAccessOperatingRoute("STAFF", route), false, route);
});
test("manager can open pricing but cannot enter staff operations", () => {
  for (const route of ["/manager", "/manager/profile", "/staff/inventory", "/staff/pricing", "/staff/warranty", "/staff/returns", "/staff/commission/pricing"]) assert.equal(canAccessOperatingRoute("MANAGER", route), true, route);
  for (const route of ["/staff", "/staff/orders", "/staff/commission", "/staff/chat"]) assert.equal(canAccessOperatingRoute("MANAGER", route), false, route);
});
test("unknown paths, prefix collisions and other roles are rejected", () => {
  for (const role of [undefined, "CUSTOMER", "DESIGNER", "ADMIN"]) assert.equal(canAccessOperatingRoute(role, "/staff/orders"), false);
  for (const route of ["/staff/orders-extra", "/staff/profile-other", "/manager/unknown", "/staff/unknown"]) assert.equal(canAccessOperatingRoute("STAFF", route), false, route);
});
