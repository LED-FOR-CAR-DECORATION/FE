import { DEMO_ACCOUNTS } from "../mock-auth";
import type { AuthUser, RegisterInput, UserRole } from "../types";
import {
  apiLogin,
  apiLogout,
  apiRegister,
  apiResendVerification,
  apiVerifyEmail,
  decodeJwtPayload,
  getApiErrorMessage,
} from "@/lib/api/auth";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Bật mock bằng NEXT_PUBLIC_USE_MOCK_AUTH=true trong .env. Mặc định gọi backend thật. */
export const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export class MockAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockAuthError";
  }
}

export interface RegisterResult {
  /** true nếu tài khoản cần xác thực email bằng OTP trước khi đăng nhập. */
  requiresVerification: boolean;
}

/** Prototype-only boundary. Used when NEXT_PUBLIC_USE_MOCK_AUTH=true. */
const mockAuthService = {
  async login(email: string, password: string): Promise<AuthUser> {
    await wait(500);
    const account = DEMO_ACCOUNTS.find(
      (item) => item.email === email.trim().toLowerCase() && item.password === password,
    );
    if (!account) {
      throw new MockAuthError("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin đăng nhập.");
    }
    return account.user;
  },
  async logout(): Promise<void> { await wait(150); },
  async getCurrentUser(): Promise<AuthUser | null> { return null; },
  async register(data: RegisterInput): Promise<RegisterResult> {
    await wait(600);
    if (DEMO_ACCOUNTS.some((account) => account.email === data.email.trim().toLowerCase())) {
      throw new MockAuthError("Email này đã được dùng trong tài khoản demo.");
    }
    return { requiresVerification: false };
  },
  async verifyEmail(_email: string, otp: string): Promise<void> {
    await wait(400);
    if (otp !== "123456") throw new MockAuthError("Mã OTP không đúng hoặc đã hết hạn.");
  },
  async resendVerification(_email: string): Promise<void> { await wait(400); },
  async requestPasswordReset(email: string): Promise<void> {
    await wait(600);
    if (!DEMO_ACCOUNTS.some((account) => account.email === email.trim().toLowerCase())) {
      throw new MockAuthError("Không tìm thấy tài khoản với email này.");
    }
  },
  async verifyCurrentPassword(email: string, password: string): Promise<void> {
    await wait(500);
    const account = DEMO_ACCOUNTS.find(
      (item) => item.email === email.trim().toLowerCase() && item.password === password,
    );
    if (!account) throw new MockAuthError("Mật khẩu hiện tại không đúng.");
  },
  async sendPasswordOtp(email: string): Promise<void> {
    await this.requestPasswordReset(email);
  },
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await wait(500);
    if (otp !== "123456") throw new MockAuthError("Mã OTP không đúng hoặc đã hết hạn.");
    if (newPassword.length < 8) throw new MockAuthError("Mật khẩu mới phải có ít nhất 8 ký tự.");
    const account = DEMO_ACCOUNTS.find((item) => item.email === email.trim().toLowerCase());
    if (!account) throw new MockAuthError("Không tìm thấy tài khoản với email này.");
    account.password = newPassword;
  },
};

/** Chạy lời gọi API và đổi lỗi thành Error có message tiếng Việt để UI hiển thị trực tiếp. */
async function withFriendlyError<T>(call: () => Promise<T>, fallback?: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

const notSupported = (feature: string) =>
  Promise.reject(new Error(`Chức năng "${feature}" chưa có API ở backend.`));

const VALID_ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "STAFF", "DESIGNER", "CUSTOMER"] as const;

function extractRoleFromPayload(payload: Record<string, unknown> | null): UserRole {
  if (!payload) return "CUSTOMER";

  // Backend JWT claims: "roles": ["ROLE_MANAGER"] hoặc "role": "MANAGER"
  const rawRoles = payload.roles ?? payload.role ?? payload.authorities;
  let rawRoleStr = "";

  if (Array.isArray(rawRoles) && rawRoles.length > 0) {
    const first = rawRoles[0];
    if (typeof first === "string") {
      rawRoleStr = first;
    } else if (first && typeof first === "object" && "authority" in first) {
      rawRoleStr = String((first as { authority: unknown }).authority);
    }
  } else if (typeof rawRoles === "string") {
    rawRoleStr = rawRoles;
  }

  const normalized = rawRoleStr.replace(/^ROLE_/i, "").trim().toUpperCase();
  if (VALID_ROLES.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  return "CUSTOMER";
}

/** Gọi backend thật qua api_client (swagger.json). */
const realAuthService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const tokens = await withFriendlyError(() => apiLogin(normalizedEmail, password), "Đăng nhập không thành công.");
    const payload = tokens.accessToken ? decodeJwtPayload(tokens.accessToken) : null;
    const subject = typeof payload?.sub === "string" ? payload.sub : undefined;
    const tokenEmail = typeof payload?.email === "string" ? payload.email : normalizedEmail;
    const role = extractRoleFromPayload(payload);

    return {
      userId: subject || normalizedEmail,
      email: tokenEmail,
      fullName: typeof payload?.name === "string" ? payload.name : tokenEmail.split("@")[0],
      role,
    };
  },
  async logout(): Promise<void> {
    await apiLogout();
  },
  async getCurrentUser(): Promise<AuthUser | null> { return null; },
  async register(data: RegisterInput): Promise<RegisterResult> {
    await withFriendlyError(
      () => apiRegister(data.email.trim().toLowerCase(), data.password, data.confirmPassword),
      "Đăng ký không thành công.",
    );
    // Backend tạo tài khoản ở trạng thái PENDING_VERIFICATION và gửi OTP qua email.
    return { requiresVerification: true };
  },
  async verifyEmail(email: string, otp: string): Promise<void> {
    await withFriendlyError(() => apiVerifyEmail(email.trim().toLowerCase(), otp.trim()), "Xác thực email không thành công.");
  },
  async resendVerification(email: string): Promise<void> {
    await withFriendlyError(() => apiResendVerification(email.trim().toLowerCase()), "Không gửi lại được mã OTP.");
  },
  requestPasswordReset: (_email: string): Promise<void> => notSupported("Quên mật khẩu"),
  verifyCurrentPassword: (_email: string, _password: string): Promise<void> => notSupported("Đổi mật khẩu"),
  sendPasswordOtp: (_email: string): Promise<void> => notSupported("Đổi mật khẩu"),
  resetPassword: (_email: string, _otp: string, _newPassword: string): Promise<void> => notSupported("Đổi mật khẩu"),
};

export const authService = USE_MOCK_AUTH ? mockAuthService : realAuthService;
