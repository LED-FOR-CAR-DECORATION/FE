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

export const getSessionToken = async (): Promise<string> => {
    // Kỹ thuật Isomorphic: Kiểm tra xem code đang chạy trên trình duyệt hay trên Server Node.js
    if (typeof window !== 'undefined') {
        // Đang chạy ở Client Component: Tiến hành gắp token từ Cookie
        const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : '';
    }

    // Đang chạy ở Server Component: Trả về rỗng (sẽ lấy token thủ công từ cookies() ở chỗ khác)
    return '';
};