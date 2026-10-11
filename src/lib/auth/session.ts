import type { AuthUser } from "@/features/auth/types";

const SESSION_KEY = "led_controller_mock_session";

/** Prototype session only. It intentionally stores no password or token. */
export function saveSession(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Load a user session from localStorage (returns null if none) */
export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<AuthUser> : null;
    if (!parsed?.userId || !parsed.email || !parsed.fullName || !["CUSTOMER", "MANAGER"].includes(parsed.role as string)) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

/** Clear the stored session */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
