const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the provider's public event/auth behavior without a DOM or an extra test dependency.
function createGallery() {
  const hooks = [];
  let cursor = 0;
  let effects = [];
  let auth = { user: { userId: "customer-1", role: "CUSTOMER" }, isAuthenticated: true, isLoading: false };
  const requests = [];
  const window = new EventTarget();
  const document = new EventTarget();
  document.visibilityState = "visible";
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return hooks[index] ??= { current: initial };
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) hooks[index] = { deps, callback };
      return hooks[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!same(hooks[index]?.deps, deps)) {
        const previous = hooks[index];
        hooks[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = callback(); });
      }
    },
  };
  const filename = path.resolve(__dirname, "../../src/features/character/context/GalleryContext.tsx");
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, window, document,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      if (name.includes("useAuth")) return { useAuth: () => auth };
      if (name.includes("entitlement.service")) return { ENTITLEMENTS_CHANGED_EVENT: "entitlements", entitlementService: { listByUser: () => [] } };
      if (name.includes("order.service")) return { ORDERS_CHANGED_EVENT: "orders" };
      if (name.includes("customerCharacters")) return {
        fetchCustomerGallery: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
        fetchActiveCustomerSubscription: async () => null,
        formatOwnedCharactersError: () => "Load failed",
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  const render = () => {
    cursor = 0;
    const value = exports.GalleryProvider({ children: null }).props.value;
    const pending = effects; effects = []; pending.forEach((effect) => effect());
    return value;
  };
  return { render, requests, window, document, setAuth: (value) => { auth = value; } };
}

const settle = async () => { await new Promise((resolve) => setImmediate(resolve)); };
const purchased = { characterId: 3, orderId: 43, purchasedAt: "2026-11-24T05:06:47Z" };

test("payment order event refetches owned characters and ignores an older response", async () => {
  const gallery = createGallery();
  gallery.render();
  gallery.window.dispatchEvent(new Event("orders"));
  assert.equal(gallery.requests.length, 2);
  gallery.requests[1].resolve([purchased]);
  await settle();
  gallery.requests[0].resolve([]);
  await settle();
  assert.equal(gallery.render().ownedCharacters[0].orderId, 43);
});

test("logout discards a pending customer response", async () => {
  const gallery = createGallery();
  gallery.render();
  gallery.setAuth({ user: null, isAuthenticated: false, isLoading: false });
  gallery.render();
  gallery.requests[0].resolve([purchased]);
  await settle();
  assert.equal(gallery.render().ownedCharacters.length, 0);
  assert.equal(gallery.render().isLoading, false);
});

test("returning to a visible tab refetches; a hidden tab does not", () => {
  const gallery = createGallery();
  gallery.render();
  gallery.document.visibilityState = "hidden";
  gallery.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(gallery.requests.length, 1);
  gallery.document.visibilityState = "visible";
  gallery.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(gallery.requests.length, 2);
});

test("accepted artwork is displayed without granting a fictitious Character entitlement", async () => {
  const gallery = createGallery();
  gallery.render();
  gallery.requests[0].resolve([{ ...purchased, sourceType: "COMMISSION", characterId: null, commissionId: 1 }]);
  await settle();
  assert.equal(gallery.render().ownedCharacters.length, 1);
  assert.equal(gallery.render().entitlements.length, 0);
});
