const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup(api) {
  const filename = path.resolve(
    __dirname,
    "../../src/features/auth/services/auth.service.ts",
  );
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      exports,
      Error,
      process: { env: {} },
      require(name) {
        if (name === "../mock-auth") return { DEMO_ACCOUNTS: [] };
        if (name === "@/lib/api/auth")
          return { ...api, getApiErrorMessage: (error) => error.message };
        throw new Error(`Unexpected module: ${name}`);
      },
    },
    { filename },
  );
  return exports.authService;
}

test("profile recovery requests an OTP through the existing API with normalized email", async () => {
  const calls = [];
  const service = setup({
    apiForgotPassword: async (...args) => calls.push(args),
  });
  await service.requestPasswordReset(" Customer@Example.com ");
  assert.deepEqual(calls, [["customer@example.com"]]);
});

test("password reset sends the email, trimmed OTP and unchanged password to the existing API", async () => {
  const calls = [];
  const service = setup({
    apiResetPassword: async (...args) => calls.push(args),
  });
  await service.resetPassword(
    " Customer@Example.com ",
    " 123456 ",
    "Valid@Pass1",
  );
  assert.deepEqual(calls, [["customer@example.com", "123456", "Valid@Pass1"]]);
});

test("reset errors preserve the actual API failure instead of claiming the endpoint is missing", async () => {
  const service = setup({
    apiResetPassword: async () => {
      throw new Error("404: Account not found");
    },
  });
  await assert.rejects(
    service.resetPassword("customer@example.com", "123456", "Valid@Pass1"),
    {
      message: "404: Account not found",
    },
  );
});

test("OTP throttling is shown as a failure rather than advancing the recovery flow", async () => {
  const service = setup({
    apiForgotPassword: async () => {
      throw new Error("Password reset requests are locked for 24 hours.");
    },
  });
  await assert.rejects(service.requestPasswordReset("customer@example.com"), {
    message: "Password reset requests are locked for 24 hours.",
  });
});
