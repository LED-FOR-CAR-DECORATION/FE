import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AuthenticationService, OpenAPI } from '@/api_client';
import { clearSession, clearTokens, getRefreshToken, getSessionToken, saveTokens } from '../auth/session';

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
OpenAPI.TOKEN = async () => {
    getApiBaseUrl();
    const token = await getSessionToken();
    return token || '';
};

// ---------------------------------------------------------------------------
// Tự động refresh access token khi gặp 401.
// Client sinh ra (openapi-typescript-codegen) dùng axios instance mặc định,
// nên interceptor gắn vào `axios` sẽ áp dụng cho mọi Service.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

/** Gọi /api/auth/refresh một lần duy nhất kể cả khi nhiều request cùng bị 401. */
export function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return null;
            try {
                const res = await AuthenticationService.refreshToken({ refreshToken });
                const data = res.data;
                if (!data?.accessToken) return null;
                saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
                return data.accessToken;
            } catch {
                return null;
            }
        })().finally(() => {
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
        const isAuthEndpoint = config?.url?.includes('/api/auth/');
        if (error.response?.status !== 401 || !config || config._retried || isAuthEndpoint) {
            return Promise.reject(error);
        }
        config._retried = true;
        const newToken = await refreshAccessToken();
        if (!newToken) {
            // Refresh thất bại: phiên hết hạn -> xoá dữ liệu đăng nhập.
            clearTokens();
            clearSession();
            return Promise.reject(error);
        }
        config.headers.set('Authorization', `Bearer ${newToken}`);
        return axios.request(config);
    });
}

export { OpenAPI };
