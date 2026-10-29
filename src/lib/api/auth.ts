import { apiClient, type ApiResponse } from "./client";
import type { AuthUser, UserRole, RegisterInput } from "@/features/auth/types";
import { saveAccessToken } from "@/lib/auth/session";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

interface RegisterResponse { userId: number; email: string; fullName: string }

export async function registerAccount(input: RegisterInput): Promise<void> {
  await apiClient.post<ApiResponse<RegisterResponse>>("/auth/register", {
    fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(),
    password: input.password, confirmPassword: input.confirmPassword,
  });
}

/** JWT claims are used for display/navigation only; the backend enforces access. */
export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", { email: email.trim(), password });
  const data = response.data.data;
  try {
    if (!data || data.tokenType !== "Bearer" || !(data.expiresIn > 0)) throw new Error("Invalid token response");
    const encoded = data.accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    const knownRoles: UserRole[] = ["ADMIN", "MANAGER", "STAFF", "DESIGNER", "CUSTOMER"];
    const role = knownRoles.find((value) => Array.isArray(claims.roles) && claims.roles.includes(`ROLE_${value}`));
    if (!role || typeof claims.sub !== "string" || typeof claims.email !== "string" || typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
      throw new Error("Invalid account claims");
    }
    // No profile endpoint is available yet; use email as the display name.
    const user: AuthUser = { userId: claims.sub, email: claims.email, fullName: claims.email, role };
    saveAccessToken(data.accessToken, Math.min(claims.exp * 1000, Date.now() + data.expiresIn * 1000));
    return user;
  } catch (cause) {
    throw new Error("Phản hồi đăng nhập từ máy chủ không hợp lệ.", { cause });
  }
}
