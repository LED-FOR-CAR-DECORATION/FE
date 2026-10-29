import type { AuthUser, UserRole } from "@/features/auth/types";

const SESSION_KEY = "led_controller_session";
const TOKEN_KEY = "led_controller_access_token";
export const SESSION_CHANGED = "led-session-changed";

export function saveAccessToken(accessToken: string, expiresAt: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, expiresAt }));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (typeof token.accessToken !== "string" || typeof token.expiresAt !== "number" || token.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    return token.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(user: AuthUser): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Cached profile is presentation state; authorization is enforced by the backend. */
export function loadSession(): AuthUser | null {
  if (typeof window === "undefined" || !getAccessToken()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<AuthUser> : null;
    const validRoles: UserRole[] = ["CUSTOMER", "DESIGNER", "STAFF", "MANAGER", "ADMIN"];
    if (!parsed?.userId || !parsed.email || !parsed.fullName || !validRoles.includes(parsed.role as UserRole)) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("led_controller_mock_session");
  window.dispatchEvent(new Event(SESSION_CHANGED));
}
