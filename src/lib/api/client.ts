import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { OpenAPI } from '@/api_client';
import { accessTokenNeedsRefresh, expireSession, getRefreshToken, getSessionToken, readAccessToken, saveTokens } from '../auth/session';
import type { LoginResponse } from '@/api_client';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

export function getApiBaseUrl(): string {
    if (!apiBaseUrl) {
        throw new Error('Thiếu cấu hình NEXT_PUBLIC_API_URL.');
    }
    return apiBaseUrl;
}

OpenAPI.BASE = apiBaseUrl ?? '';
OpenAPI.WITH_CREDENTIALS = true;

// Gán một HÀM (Callback), tuyệt đối KHÔNG gọi hàm để gán giá trị tĩnh!
// OpenAPI sẽ tự động chạy hàm này trước mỗi lần gửi request để gắp token.
OpenAPI.TOKEN = async (options) => {
    getApiBaseUrl();
    const token = options.url.startsWith('/api/auth/') ? readAccessToken() : await getSessionToken();
    return token || '';
};

// ---------------------------------------------------------------------------
// Tự động refresh access token khi gặp 401.
// Client sinh ra (openapi-typescript-codegen) dùng axios instance mặc định,
// nên interceptor gắn vào `axios` sẽ áp dụng cho mọi Service.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

/** Token hiện tại nếu còn dùng được (một tab khác có thể vừa gia hạn xong). */
function usableStoredToken(): string | null {
    const token = readAccessToken();
    return token && !accessTokenNeedsRefresh(token) ? token : null;
}

/** Khoá giữa các tab để chỉ một tab gọi /auth/refresh tại một thời điểm (refresh token có thể bị xoay vòng). */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? (locks.request('led-auth-refresh', task) as Promise<T>) : task();
}

/** Gọi /api/auth/refresh một lần duy nhất kể cả khi nhiều request (hoặc nhiều tab) cùng bị 401. */
export function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        const tokenBeforeLock = readAccessToken();
        refreshPromise = withRefreshLock(async () => {
            // Trong lúc chờ khoá, tab khác có thể đã gia hạn và lưu token mới vào cookie dùng chung.
            const refreshedElsewhere = usableStoredToken();
            if (refreshedElsewhere && refreshedElsewhere !== tokenBeforeLock) return refreshedElsewhere;
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                expireSession();
                return null;
            }
            try {
                // Do not resolve OpenAPI.TOKEN here: it may itself be waiting for this promise.
                const res = await axios.post<{ data: LoginResponse }>(`${getApiBaseUrl()}/api/auth/refresh`, { refreshToken }, {
                    withCredentials: OpenAPI.WITH_CREDENTIALS,
                });
                if (getRefreshToken() !== refreshToken) {
                    // Phiên đã bị thay (đăng nhập lại / tab khác): dùng token đang lưu thay vì báo lỗi.
                    const current = usableStoredToken();
                    if (current) return current;
                    throw new Error('Phiên đăng nhập đã thay đổi.');
                }
                const data = res.data.data;
                if (!data?.accessToken || !data.refreshToken) throw new Error('Phản hồi gia hạn phiên không hợp lệ.');
                saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
                return data.accessToken;
            } catch (error) {
                const status = (error as AxiosError).response?.status;
                if (status === 401 || status === 403) {
                    // Refresh token có thể vừa bị tab khác xoay vòng: nếu đã có token mới thì dùng nó.
                    const current = usableStoredToken();
                    if (current && getRefreshToken() !== refreshToken) return current;
                    if (getRefreshToken() === refreshToken) {
                        expireSession();
                        return null;
                    }
                }
                // Network/5xx failures must not destroy a valid refresh session.
                throw error;
            }
        }).finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const globalScope = globalThis as typeof globalThis & { __ledAuthInterceptor?: boolean };
if (typeof window !== 'undefined' && !globalScope.__ledAuthInterceptor) {
    globalScope.__ledAuthInterceptor = true;
    axios.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        if (error.response?.status !== 401 || !config) {
            return Promise.reject(error);
        }
        const base = new URL(getApiBaseUrl());
        const target = new URL(config.url ?? '', config.baseURL ?? base.href);
        const apiPath = `${base.pathname.replace(/\/$/, '')}/api/`;
        if (target.origin !== base.origin || !target.pathname.startsWith(apiPath) || target.pathname.startsWith(`${apiPath}auth/`)) {
            return Promise.reject(error);
        }
        if (config._retried) {
            if (config.headers.get('Authorization') === `Bearer ${readAccessToken()}`) expireSession();
            return Promise.reject(error);
        }
        config._retried = true;
        // A delayed 401 may belong to a token that another request already refreshed.
        const currentToken = readAccessToken();
        const failedAuthorization = config.headers.get('Authorization');
        const newToken = currentToken && !accessTokenNeedsRefresh(currentToken, 0) && failedAuthorization !== `Bearer ${currentToken}`
            ? currentToken : await refreshAccessToken();
        if (!newToken) {
            return Promise.reject(error);
        }
        config.headers.set('Authorization', `Bearer ${newToken}`);
        return axios.request(config);
    });
}

export { OpenAPI };
