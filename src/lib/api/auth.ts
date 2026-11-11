import { ApiError, AuthenticationService, OpenAPI } from '@/api_client';
import { request } from '@/api_client/core/request';
import type { ErrorResponse, LoginResponse } from '@/api_client';
// Import ./client để chắc chắn OpenAPI (BASE, TOKEN, interceptor refresh) đã được cấu hình.
import './client';
import { clearTokens, getRefreshToken, saveTokens } from '../auth/session';

/** Thông báo thân thiện cho từng mã lỗi HTTP của nhóm API auth (theo swagger.json). */
const STATUS_MESSAGES: Record<number, string> = {
    400: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
    401: 'Email hoặc mật khẩu không đúng.',
    404: 'Không tìm thấy tài khoản với email này.',
    409: 'Email này đã được đăng ký.',
    423: 'Tài khoản tạm khoá 15 phút do đăng nhập sai quá nhiều lần.',
    429: 'Bạn thao tác quá nhanh hoặc đã vượt giới hạn trong ngày. Vui lòng thử lại sau.',
    500: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
    503: 'Hệ thống gửi mã tạm thời không khả dụng. Vui lòng thử lại sau.',
};

/** Chuyển mọi lỗi (ApiError, lỗi mạng, ...) thành câu thông báo hiển thị cho người dùng. */
export function getApiErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
    if (error instanceof ApiError) {
        const body = error.body as ErrorResponse | undefined;
        const detail = body?.details?.find((d) => d.message)?.message;
        return body?.message || detail || STATUS_MESSAGES[error.status] || fallback;
    }
    if (error instanceof Error) {
        // axios ném "Network Error" khi không kết nối được backend hoặc bị chặn CORS.
        if (error.message === 'Network Error') {
            return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy và cấu hình CORS.';
        }
        return error.message || fallback;
    }
    return fallback;
}

function persistLogin(data: LoginResponse | undefined): LoginResponse {
    if (!data?.accessToken) throw new Error('Phản hồi đăng nhập không chứa access token.');
    saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return data;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
    const res = await AuthenticationService.login({ email, password });
    return persistLogin(res.data);
}

export async function apiGoogleLogin(idToken: string): Promise<LoginResponse> {
    const res = await AuthenticationService.googleLogin({ idToken });
    return persistLogin(res.data);
}

export async function apiRegister(email: string, password: string, confirmPassword: string) {
    const res = await AuthenticationService.register({ email, password, confirmPassword });
    return res.data;
}

export async function apiVerifyEmail(email: string, otp: string): Promise<void> {
    await AuthenticationService.verifyEmail({ email, otp });
}

export async function apiResendVerification(email: string): Promise<void> {
    await AuthenticationService.resendVerification({ email });
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
    const res = await request<{ data?: { message: string }; message?: string }>(OpenAPI, {
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: { email },
        errors: {
            400: 'Email không đúng định dạng.',
            429: 'Yêu cầu gửi mã đã bị khoá trong 24 giờ do vượt quá số lần cho phép.',
            503: 'Hệ thống gửi mã tạm thời không khả dụng. Vui lòng thử lại sau.',
        },
    });
    return res.data || { message: res.message || 'Mã xác thực đã được gửi nếu email tồn tại trong hệ thống.' };
}

export async function apiResetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await request<void>(OpenAPI, {
        method: 'POST',
        url: '/api/auth/reset-password',
        body: { email, otp, newPassword },
        errors: {
            400: 'Mã OTP không đúng hoặc mật khẩu không hợp lệ.',
            404: 'Không tìm thấy tài khoản với email này.',
            429: 'Thao tác quá nhiều lần. Vui lòng thử lại sau.',
            500: 'Lỗi hệ thống khi đặt lại mật khẩu.',
        },
    });
}

/** Thu hồi refresh token ở backend (nếu có) rồi xoá token cục bộ. Không ném lỗi. */
export async function apiLogout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
        if (refreshToken) await AuthenticationService.logout({ refreshToken });
    } catch {
        // Bỏ qua: dù backend lỗi, phía client vẫn phải đăng xuất.
    } finally {
        clearTokens();
    }
}

/** Đọc payload của JWT (không xác thực chữ ký, chỉ dùng để hiển thị). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const part = token.split('.')[1];
        if (!part) return null;
        const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(''),
        );
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

