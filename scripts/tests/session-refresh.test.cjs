const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const axios = require("axios");

const jwt = (seconds, id = "access") => `header.${Buffer.from(JSON.stringify({ sub: "test-user", exp: Math.floor(Date.now() / 1000) + seconds, jti: id })).toString("base64url")}.signature`;
const fresh = () => ({ accessToken: jwt(900, "new"), refreshToken: "rotated-test-refresh", expiresIn: 900 });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

function setup(adapter, modules = {}) {
  const window = new EventTarget();
  window.location = { protocol: "https:" };
  const storage = new Map();
  const localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
  const cookies = new Map();
  const document = { get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); }, set cookie(value) {
    const pair = value.split(";")[0]; const split = pair.indexOf("="); const key = pair.slice(0, split);
    if (/max-age=0(?:;|$)/i.test(value)) cookies.delete(key); else cookies.set(key, pair.slice(split + 1));
  } };
  const transport = axios.create({ adapter: async (config) => {
    const result = await adapter(config);
    const response = { status: result.status ?? 200, data: result.data, headers: {}, config };
    if (response.status >= 400) throw new axios.AxiosError("Test API failure", undefined, config, undefined, response);
    return response;
  } });
  const OpenAPI = {};
  const cache = {};
  const load = (relative) => {
    const filename = path.resolve(__dirname, "../../src", relative);
    if (cache[filename]) return cache[filename];
    const exports = {}; cache[filename] = exports;
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, {
      exports, window, document, localStorage, Event, URL,
      atob: (value) => Buffer.from(value, "base64").toString("binary"),
      process: { env: { NEXT_PUBLIC_API_URL: "https://backend.example" } },
      require(name) {
        if (name in modules) return modules[name];
        if (name === "axios") return { default: transport };
        if (name === "@/api_client") return { OpenAPI };
        if (name === "@/lib/auth/session") return load("lib/auth/session.ts");
        if (name.startsWith(".")) return load(path.relative(path.resolve(__dirname, "../../src"), path.resolve(path.dirname(filename), `${name}.ts`)));
        throw new Error(`Unexpected module: ${name}`);
      },
    }, { filename });
    return exports;
  };
  const session = load("lib/auth/session.ts");
  const client = load("lib/api/client.ts");
  const seed = (token = jwt(-1)) => {
    session.saveSession({ userId: "test-user", email: "test@example.com", fullName: "Test", role: "CUSTOMER" });
    session.saveTokens(token, "test-refresh", 900);
  };
  return { session, client, transport, OpenAPI, window, seed, cookies, load };
}

test("missing access cookie restores the session and rotates tokens with one refresh for concurrent callers", async () => {
  let refreshes = 0;
  const app = setup(async (config) => {
    refreshes++;
    assert.equal(config.url, "https://backend.example/api/auth/refresh");
    assert.equal(JSON.parse(config.data).refreshToken, "test-refresh");
    assert.equal(config.headers.get("Authorization"), undefined);
    return { data: { data: fresh() } };
  });
  app.seed(); app.cookies.clear();
  const tokens = await Promise.all(Array.from({ length: 8 }, () => app.session.getSessionToken()));
  assert.equal(refreshes, 1);
  assert.ok(tokens.every((token) => token === app.session.readAccessToken()));
  assert.equal(app.session.getRefreshToken(), "rotated-test-refresh");
});

test("tokens near expiry refresh before an API call; valid access tokens do not refresh", async () => {
  let refreshes = 0;
  const app = setup(async () => { refreshes++; return { data: { data: fresh() } }; });
  app.seed(jwt(300));
  await app.OpenAPI.TOKEN({ url: "/api/users/me" });
  assert.equal(refreshes, 0);
  app.seed(jwt(10));
  await app.OpenAPI.TOKEN({ url: "/api/users/me" });
  assert.equal(refreshes, 1);
});

test("concurrent and delayed 401 responses reuse the rotated access token", async () => {
  let refreshes = 0;
  const old = jwt(300, "revoked");
  const gate = deferred();
  const app = setup(async (config) => {
    if (config.url.includes("/auth/refresh")) { refreshes++; const result = { data: { data: fresh() } }; gate.resolve(); return result; }
    if (config.headers.get("Authorization") === `Bearer ${old}`) {
      if (config.url.endsWith("late")) { await gate.promise; await new Promise((done) => setImmediate(done)); }
      return { status: 401 };
    }
    return { data: { ok: true } };
  });
  app.seed(old);
  const config = { headers: { Authorization: `Bearer ${old}` } };
  const results = await Promise.all([app.transport.get("https://backend.example/api/one", config), app.transport.get("https://backend.example/api/late", config)]);
  assert.equal(results.length, 2);
  assert.equal(refreshes, 1);
});

test("invalid refresh clears tokens and notifies React state; temporary backend failures preserve the session", async () => {
  let status = 503;
  const app = setup(async () => ({ status }));
  app.seed();
  let expired = 0;
  app.window.addEventListener(app.session.SESSION_EXPIRED_EVENT, () => expired++);
  await assert.rejects(app.session.getSessionToken());
  assert.equal(app.session.getRefreshToken(), "test-refresh");
  assert.ok(app.session.loadSession());
  assert.equal(expired, 0);
  status = 401;
  assert.equal(await app.session.getSessionToken(), "");
  assert.equal(app.session.getRefreshToken(), null);
  assert.equal(app.session.loadSession(), null);
  assert.equal(expired, 1);
});

test("late refresh cannot restore credentials after logout or overwrite a new login", async () => {
  const gate = deferred();
  const app = setup(async () => { await gate.promise; return { data: { data: fresh() } }; });
  app.seed();
  const pending = app.client.refreshAccessToken();
  app.session.clearTokens(); app.session.clearSession();
  app.session.saveTokens(jwt(900, "other-login"), "other-refresh", 900);
  gate.resolve();
  await assert.rejects(pending, /đã thay đổi/);
  assert.equal(app.session.getRefreshToken(), "other-refresh");
});

test("authentication endpoints and third-party 401 responses never trigger refresh", async () => {
  let refreshes = 0;
  const app = setup(async (config) => {
    if (config.url.endsWith("/refresh")) refreshes++;
    return { status: 401 };
  });
  app.seed();
  await assert.rejects(app.transport.post("https://backend.example/api/auth/login", {}));
  await assert.rejects(app.transport.get("https://other.example/api/anything"));
  assert.equal(refreshes, 0);
  assert.equal(app.session.getRefreshToken(), "test-refresh");
});

test("a rejected retry stops after one refresh instead of looping", async () => {
  let refreshes = 0;
  const app = setup(async (config) => {
    if (config.url.endsWith("/refresh")) { refreshes++; return { data: { data: fresh() } }; }
    return { status: 401 };
  });
  app.seed(jwt(300));
  await assert.rejects(app.transport.get("https://backend.example/api/private", { headers: { Authorization: `Bearer ${app.session.readAccessToken()}` } }));
  assert.equal(refreshes, 1);
  assert.equal(app.session.loadSession(), null);
});

test("an in-flight profile response cannot restore React login state after refresh rejection", async () => {
  const hooks = [];
  let cursor = 0;
  let effects = [];
  const profile = deferred();
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useCallback: (callback) => callback,
    useEffect(callback) { const index = cursor++; if (!hooks[index]) { hooks[index] = true; effects.push(callback); } },
  };
  const app = setup(async () => ({ status: 401 }), {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "@/features/auth/services/auth.service": { authService: {}, USE_MOCK_AUTH: false },
    "@/lib/api/addresses": { apiGetMyProfile: () => profile.promise },
  });
  app.seed(jwt(300));
  const { AuthProvider } = app.load("features/auth/context/AuthContext.tsx");
  const render = () => {
    cursor = 0;
    const value = AuthProvider({ children: null }).props.value;
    const pending = effects; effects = []; pending.forEach((effect) => effect());
    return value;
  };
  render();
  await new Promise((done) => setImmediate(done));
  assert.equal(render().isAuthenticated, true);
  await app.client.refreshAccessToken();
  assert.equal(render().isAuthenticated, false);
  profile.resolve({ accountId: "test-user", name: "Old profile" });
  await new Promise((done) => setImmediate(done));
  assert.equal(render().isAuthenticated, false);
  assert.equal(render().isLoading, false);
  assert.equal(app.session.loadSession(), null);
});
