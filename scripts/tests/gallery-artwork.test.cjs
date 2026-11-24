const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadApi(file, dependencies) {
  const filename = path.resolve(__dirname, "../../src", file);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, window: dependencies.window, CustomEvent: class extends Event {} }, { filename });
  return exports;
}

function galleryApi({ purchases = [], pages = [[]], details = {} } = {}) {
  const calls = [];
  let signedUrl = "https://media.example/accepted?signature=fresh";
  const api = loadApi("lib/api/customerCharacters.ts", {
    "@/api_client": { ApiError: class extends Error {} }, "./client": { OpenAPI: {} },
    "@/api_client/core/request": { request: async (_, options) => {
      calls.push(options);
      if (options.url.includes("/owned")) return { data: purchases };
      return { data: pages[options.query.page], meta: { hasNext: options.query.page < pages.length - 1 } };
    } },
    "@/features/commission/services/customer-commission.api": { getCustomerCommission: async (id) => {
      if (details[id] instanceof Error) throw details[id];
      return { data: { ...details[id], deliveredPreviews: details[id].deliveredPreviews.map((preview) => ({ ...preview, imageUrl: signedUrl })) } };
    } },
  });
  return { ...api, calls, updateSignedUrl: (value) => { signedUrl = value; } };
}

const completed = (id, approvedSubmissionId, previews) => ({
  commissionId: id, title: `Commission ${id}`, status: "COMPLETED", approvedSubmissionId,
  targetMatrixDimensions: "32x32", totalPrice: 50000, updatedAt: "2026-11-24T10:00:00Z", deliveredPreviews: previews,
});

test("gallery includes only the accepted final submission across all completed pages", async () => {
  const api = galleryApi({
    purchases: [{ characterId: 8, orderId: 43, storeProductId: 6, purchasedPrice: 49000, purchasedAt: "2026-11-20T00:00:00Z" }],
    pages: [[{ commissionId: 1 }], [{ commissionId: 2 }]],
    details: {
      1: completed(1, 11, [{ submissionId: 11, status: "CUSTOMER_ACCEPTED" }, { submissionId: 12, status: "STAFF_APPROVED" }]),
      2: completed(2, 21, [{ submissionId: 21, status: "STAFF_APPROVED" }]),
    },
  });
  const items = await api.fetchCustomerGallery();
  assert.equal(items.length, 2);
  assert.equal(items[0].sourceType, "COMMISSION");
  assert.equal(items[0].submissionId, 11);
  assert.equal(items[0].characterId, null);
  assert.equal(items[0].storeProductId, null);
  assert.equal(items[1].orderId, 43);
  assert.equal(api.calls.filter((call) => call.query?.status === "COMPLETED").length, 2);
});

test("granted characters keep null purchase references instead of links to order/product zero", async () => {
  const api = galleryApi({ purchases: [{ characterId: 8, orderId: null, storeProductId: null, purchasedPrice: null }] });
  const [item] = await api.fetchCustomerGallery();
  assert.equal(item.orderId, null);
  assert.equal(item.storeProductId, null);
  assert.equal(item.purchasedPrice, null);
});

test("accepted artwork resolves fresh private-media URLs on each refresh", async () => {
  const api = galleryApi({ pages: [[{ commissionId: 1 }]], details: {
    1: completed(1, 11, [{ submissionId: 11, status: "CUSTOMER_ACCEPTED" }]),
  } });
  const first = await api.fetchCustomerGallery();
  api.updateSignedUrl("https://media.example/accepted?signature=renewed");
  const second = await api.fetchCustomerGallery();
  assert.notEqual(first[0].previewGifUrl, second[0].previewGifUrl);
});

test("failed commission details surface an error rather than silently losing accepted artwork", async () => {
  const api = galleryApi({ pages: [[{ commissionId: 1 }]], details: { 1: new Error("Unavailable") } });
  await assert.rejects(api.fetchCustomerGallery(), /Unavailable/);
});

test("accepting a completed commission invalidates gallery only after backend confirmation", async () => {
  const window = new EventTarget();
  let changes = 0;
  let fail = false;
  window.addEventListener("entitlements", () => changes++);
  const api = loadApi("features/commission/services/customer-commission.api.ts", {
    window,
    "@/api_client/core/request": { request: async () => {
      if (fail) throw new Error("Rejected");
      return { data: { commissionStatus: "COMPLETED" } };
    } },
    "@/lib/api/client": { OpenAPI: {} }, "@/lib/api/media": {},
    "@/features/character/services/entitlement.service": { ENTITLEMENTS_CHANGED_EVENT: "entitlements" },
  });
  await api.approveDeliverableCard(1);
  assert.equal(changes, 1);
  fail = true;
  await assert.rejects(api.approveDeliverableCard(1), /Rejected/);
  assert.equal(changes, 1);
});
