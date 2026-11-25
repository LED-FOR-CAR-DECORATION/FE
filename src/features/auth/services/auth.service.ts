import type { AuthUser, RegisterInput, UserRole } from "../types";
import {
  apiForgotPassword,
  apiLogin,
  apiLogout,
  apiRegister,
  apiResetPassword,
  apiResendVerification,
  apiVerifyEmail,
  decodeJwtPayload,
  getApiErrorMessage,
} from "@/lib/api/auth";




export interface RegisterResult {
  /** true nếu tài khoản cần xác thực email bằng OTP trước khi đăng nhập. */
  requiresVerification: boolean;
}


/** Chạy lời gọi API và đổi lỗi thành Error có message tiếng Việt để UI hiển thị trực tiếp. */
async function withFriendlyError<T>(call: () => Promise<T>, fallback?: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

const VALID_ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "STAFF", "DESIGNER", "CUSTOMER"] as const;

export function getRoleHomePath(role?: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "STAFF":
      return "/staff";
    case "DESIGNER":
      return "/designer/characters";
    default:
      return "/";
  }
}

export function normalizeUserRole(rawRoles: unknown, fallback: UserRole = "CUSTOMER"): UserRole {
  const candidates = Array.isArray(rawRoles) ? rawRoles : [rawRoles];
  for (const item of candidates) {
    let rawRoleStr = "";
    if (typeof item === "string") {
      rawRoleStr = item;
    } else if (item && typeof item === "object" && "authority" in item) {
      rawRoleStr = String((item as { authority: unknown }).authority);
    }
    const normalized = rawRoleStr.replace(/^ROLE_/i, "").trim().toUpperCase();
    if (VALID_ROLES.includes(normalized as UserRole)) {
      return normalized as UserRole;
    }
  }
  return fallback;
}

function extractRoleFromPayload(payload: Record<string, unknown> | null): UserRole {
  if (!payload) return "CUSTOMER";
  // Backend JWT claims: "roles": ["ROLE_MANAGER"] hoặc "role": "MANAGER"
  return normalizeUserRole(payload.roles ?? payload.role ?? payload.authorities, "CUSTOMER");
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
  async requestPasswordReset(email: string): Promise<void> {
    await withFriendlyError(
      () => apiForgotPassword(email.trim().toLowerCase()),
      "Không thể gửi yêu cầu đặt lại mật khẩu."
    );
  },
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await withFriendlyError(
      () => apiResetPassword(email.trim().toLowerCase(), otp.trim(), newPassword),
      "Không thể đổi mật khẩu.",
    );
  },
};

export const authService = realAuthService;
