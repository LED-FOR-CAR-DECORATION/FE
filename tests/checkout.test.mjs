import test from "node:test";
import assert from "node:assert/strict";
import { completeCheckout } from "../src/features/checkout/complete-checkout.ts";
import { entitlementService } from "../src/features/character/services/entitlement.service.ts";

const customer = { userId: "customer-1", fullName: "Customer", email: "test@example.com", role: "CUSTOMER" };
const character = { id: "character-cat-hero", productType: "CHARACTER", name: "Cat", quantity: 1, price: 3.5 };
const led = { id: "matrix-32", productType: "LED_MODEL", name: "Panel", quantity: 2, price: 20 };
const address = { id: "home", fullName: "Customer", fullAddress: "Test address" };
const input = { customer, shipping: 0, paymentMethod: "MOCK_CARD", paymentSucceeded: true };

function recorder() {
  const orders = []; const grants = [];
  return { orders, grants, actions: {
    createOrder(data) { orders.push(data); return { id: "ORD-TEST", ...data }; },
    grantCharacters(...args) { grants.push(args); },
  } };
}

test("paid Character goes to Gallery without creating an order or requiring an address", () => {
  const record = recorder();
  const result = completeCheckout({ ...input, items: [character] }, record.actions);
  assert.equal(result.order, null);
  assert.equal(result.hasCharacters, true);
  assert.equal(record.orders.length, 0);
  assert.equal(record.grants.length, 1);
  assert.equal(record.grants[0][0], customer.userId);
  assert.match(record.grants[0][1], /^PAY-/);
  assert.deepEqual(record.grants[0][2], [character.id]);
});

test("mixed cart creates an order with LED items and grants Character separately", () => {
  const record = recorder();
  const result = completeCheckout({ ...input, address, shipping: 5, items: [led, character] }, record.actions);
  assert.equal(result.order.id, "ORD-TEST");
  assert.equal(result.hasCharacters, true);
  assert.deepEqual(record.orders[0].items, [led]);
  assert.equal(record.orders[0].shipping, 5);
  assert.deepEqual(record.grants[0][2], [character.id]);
});

test("LED-only COD creates a physical order without granting Gallery ownership", () => {
  const record = recorder();
  const result = completeCheckout({ ...input, address, items: [led], paymentMethod: "COD", paymentSucceeded: false }, record.actions);
  assert.equal(result.hasCharacters, false);
  assert.equal(record.orders.length, 1);
  assert.equal(record.grants.length, 0);
});

test("unpaid Character, missing shipping address and empty carts have no side effects", () => {
  for (const invalid of [
    { ...input, items: [character], paymentSucceeded: false },
    { ...input, items: [led, character], paymentSucceeded: false },
    { ...input, items: [led] },
    { ...input, items: [] },
  ]) {
    const record = recorder();
    assert.throws(() => completeCheckout(invalid, record.actions));
    assert.equal(record.orders.length, 0);
    assert.equal(record.grants.length, 0);
  }
});

test("payment ownership is stored per customer and retries do not duplicate Character", () => {
  const originalWindow = globalThis.window;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  globalThis.window = {};
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  } });
  try {
    entitlementService.grantFromPayment(customer.userId, "PAY-1", [character.id, character.id]);
    entitlementService.grantFromPayment(customer.userId, "PAY-2", [character.id]);
    const owned = entitlementService.listByUser(customer.userId);
    assert.equal(owned.length, 1);
    assert.equal(owned[0].sourceType, "PAYMENT");
    assert.equal(owned[0].sourceReferenceId, "PAY-1");
    assert.equal(entitlementService.listByUser("another-customer").length, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
