const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const axios = require("axios");

// Load the project's TypeScript adapters without adding a second runtime dependency.
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => id.startsWith("@/") ? load(`src/${id.slice(2)}.ts`)
    : id.startsWith(".") ? load(path.resolve(path.dirname(file), `${id}.ts`)) : require(id);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}

const { validateRegister } = load("src/features/auth/schemas.ts");
const valid = { fullName: " Nguyễn Văn A ", email: " New@Example.com ", password: "Secure123!", confirmPassword: "Secure123!" };

test("accepts valid Vietnamese names and matching strong passwords", () => {
  assert.deepEqual(validateRegister(valid), {});
});

test("rejects blank fields and invalid email/name limits", () => {
  assert.deepEqual(Object.keys(validateRegister({ fullName: " ", email: "bad", password: "", confirmPassword: "" })),
    ["fullName", "email", "password", "confirmPassword"]);
  assert.ok(validateRegister({ ...valid, fullName: "a".repeat(101) }).fullName);
  assert.ok(validateRegister({ ...valid, fullName: "Name\u0000" }).fullName);
  assert.ok(validateRegister({ ...valid, email: "a".repeat(250) + "@example.com" }).email);
});

test("requires every password category, no spaces, and matching confirmation", () => {
  for (const password of ["Short1!", "lowercase1!", "UPPERCASE1!", "NoDigits!!", "NoSpecial123", "Secure 123!"]) {
    assert.ok(validateRegister({ ...valid, password, confirmPassword: password }).password, password);
  }
  assert.ok(validateRegister({ ...valid, confirmPassword: "Different123!" }).confirmPassword);
});

test("enforces BCrypt UTF-8 byte boundary", () => {
  assert.ok(validateRegister({ ...valid, password: "Secure123!" + "ệ".repeat(25) }).password);
  const password = "Aa1!" + "a".repeat(68);
  assert.equal(validateRegister({ ...valid, password, confirmPassword: password }).password, undefined);
  assert.ok(validateRegister({ ...valid, password: password + "a" }).password);
});

test("registration posts normalized fields, preserves passwords, and propagates backend details", async () => {
  const { apiClient, ApiError } = load("src/lib/api/client.ts");
  const { registerAccount } = load("src/lib/api/auth.ts");
  let calls = 0;
  apiClient.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/auth/register");
    assert.equal(config.method, "post");
    assert.equal(config.headers.get("Authorization"), undefined);
    assert.deepEqual(JSON.parse(config.data), { ...valid, fullName: "Nguyễn Văn A", email: "new@example.com" });
    return { data: { data: { userId: 1, email: "new@example.com", fullName: "Nguyễn Văn A" } }, status: 201, headers: {}, config };
  };
  await registerAccount(valid);
  assert.equal(calls, 1);
  const body = { code: "EMAIL_ALREADY_REGISTERED", message: "Email đã tồn tại", status: 409, timestamp: new Date().toISOString(), traceId: "test-trace", details: [{ field: "email", message: "Email đã tồn tại" }] };
  apiClient.defaults.adapter = async (config) => {
    calls++;
    throw new axios.AxiosError("Conflict", "ERR_BAD_REQUEST", config, {}, { data: body, status: 409, config });
  };
  await assert.rejects(registerAccount(valid), error => error instanceof ApiError && error.body === body);
  assert.equal(calls, 2, "registration must not automatically retry");
});
