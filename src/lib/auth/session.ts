// src/lib/auth/session.ts
import type { AuthUser, UserRole } from "@/features/auth/types";

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
        const validRoles: UserRole[] = ["CUSTOMER", "DESIGNER", "STAFF", "MANAGER", "ADMIN"];
        if (!parsed?.userId || !parsed.email || !parsed.fullName || !validRoles.includes(parsed.role as UserRole)) return null;
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

// ---------------------------------------------------------------------------
// JWT token storage
// - access_token: cookie đọc được bằng JS (getSessionToken bên dưới đọc từ đây)
// - refresh_token: localStorage (dùng cho /api/auth/refresh và /api/auth/logout)
// ---------------------------------------------------------------------------
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_KEY = "led_controller_refresh_token";
export const SESSION_EXPIRED_EVENT = "led-controller-session-expired";

/** Lưu cặp token trả về từ login / refresh / google login. */
export function saveTokens(accessToken: string, refreshToken?: string, expiresInSeconds?: number): void {
    if (typeof window === "undefined") return;
    const maxAge = expiresInSeconds && expiresInSeconds > 0 ? `; max-age=${expiresInSeconds}` : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/${maxAge}; SameSite=Lax${secure}`;
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Xoá toàn bộ token (khi logout hoặc refresh thất bại). */
export function clearTokens(): void {
    if (typeof window === "undefined") return;
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function expireSession(): void {
    clearTokens();
    clearSession();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** Read without triggering refresh, particularly for the refresh/logout requests themselves. */
export function readAccessToken(): string {
    if (typeof window === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

export function accessTokenNeedsRefresh(token: string, bufferMs = 30_000): boolean {
    if (!token) return true;
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const { exp } = JSON.parse(atob(payload));
        return typeof exp === "number" && exp * 1000 <= Date.now() + bufferMs;
    } catch {
        // Let the backend validate tokens whose expiry cannot be read locally.
        return false;
    }
}

export const getSessionToken = async (): Promise<string> => {
    if (typeof window === "undefined") return "";
    const token = readAccessToken();
    if (!accessTokenNeedsRefresh(token)) return token;
    if (getRefreshToken()) {
        // The refresh transport bypasses OpenAPI.TOKEN to avoid recursive refresh.
        const { refreshAccessToken } = await import("../api/client");
        try {
            return (await refreshAccessToken()) ?? "";
        } catch (error) {
            // Refresh chủ động lỗi mạng/5xx nhưng token cũ vẫn còn hạn: cứ dùng, đừng làm hỏng request.
            if (token && !accessTokenNeedsRefresh(token, 0)) return token;
            throw error;
        }
    }
    if (token && !accessTokenNeedsRefresh(token, 0)) return token;
    if (token || loadSession()) expireSession();
    return "";
};
