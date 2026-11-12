/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse } from '../models/ApiResponse';
import type { ApiResponseForgotPasswordResponse } from '../models/ApiResponseForgotPasswordResponse';
import type { ApiResponseLoginResponse } from '../models/ApiResponseLoginResponse';
import type { ApiResponseRegisterResponse } from '../models/ApiResponseRegisterResponse';
import type { ApiResponseResetPasswordResponse } from '../models/ApiResponseResetPasswordResponse';
import type { ForgotPasswordRequest } from '../models/ForgotPasswordRequest';
import type { GoogleLoginRequest } from '../models/GoogleLoginRequest';
import type { LoginRequest } from '../models/LoginRequest';
import type { LogoutRequest } from '../models/LogoutRequest';
import type { RefreshTokenRequest } from '../models/RefreshTokenRequest';
import type { RegisterRequest } from '../models/RegisterRequest';
import type { ResendVerificationRequest } from '../models/ResendVerificationRequest';
import type { ResetPasswordRequest } from '../models/ResetPasswordRequest';
import type { VerifyEmailRequest } from '../models/VerifyEmailRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Verify customer email with OTP
     * Validates the 6-digit OTP code sent to customer's email during registration. Upon successful validation, transitions customer account status from PENDING_VERIFICATION to ACTIVE.
     * @param requestBody
     * @returns ApiResponse Email verified successfully; account is now ACTIVE
     * @throws ApiError
     */
    public static verifyEmail(
        requestBody: VerifyEmailRequest,
    ): CancelablePromise<ApiResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/verify-email',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: request payload contains invalid fields, invalid/expired OTP, or account already verified`,
                404: `User account not found for provided email`,
                429: `Too many failed OTP attempts: maximum retry threshold exceeded`,
                500: `Internal server error: Unexpected system failure`,
            },
        });
    }
    /**
     * Reset password using OTP
     * Public endpoint. Validates 6-digit OTP code against Redis, updates and hashes the new password, revokes all existing sessions/refresh tokens across all devices, and logs an audit event if internal staff.
     * @param requestBody
     * @returns ApiResponseResetPasswordResponse ApiResponse<ResetPasswordResponse>: password reset successfully
     * @throws ApiError
     */
    public static resetPassword(
        requestBody: ResetPasswordRequest,
    ): CancelablePromise<ApiResponseResetPasswordResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/reset-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: request payload contains missing/invalid fields, weak password, or invalid/expired OTP`,
                404: `User account not found with the provided email address`,
                429: `Maximum OTP verification attempts reached: token invalidated`,
                500: `Unexpected internal server failure`,
                503: `Redis unavailable`,
            },
        });
    }
    /**
     * Resend verification email
     * Re-generates and emails a new 6-digit verification OTP to a customer in PENDING_VERIFICATION status. Enforces a 60-second cooldown and a maximum of 3 resends per 24 hours.
     * @param requestBody
     * @returns any Verification email request accepted for delivery
     * @throws ApiError
     */
    public static resendVerification(
        requestBody: ResendVerificationRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/resend-verification',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: invalid request payload or account already verified`,
                404: `User account not found for provided email`,
                429: `Rate limit exceeded: cooldown period active (60s) or maximum resend quota reached (3 attempts)`,
                500: `Internal server error: Unexpected system failure`,
            },
        });
    }
    /**
     * Register a new customer account
     * Registers a new customer account using email and password. Upon successful registration, the account is created in PENDING_VERIFICATION status and a verification OTP is dispatched to the user's email address.
     * @param requestBody
     * @returns ApiResponseRegisterResponse Customer account registered successfully
     * @throws ApiError
     */
    public static register(
        requestBody: RegisterRequest,
    ): CancelablePromise<ApiResponseRegisterResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: request payload contains invalid fields or passwords do not match`,
                409: `Conflict: The email address is already registered`,
                500: `Internal server error: Unexpected system failure`,
            },
        });
    }
    /**
     * Refresh access and refresh JWT tokens
     * Validates the provided refresh token against active stored sessions (Redis or DB fallback), revokes the single-use token immediately (Token Rotation), and issues a new access and refresh token pair.
     * @param requestBody
     * @returns ApiResponseLoginResponse Tokens renewed successfully with new access and refresh token pair
     * @throws ApiError
     */
    public static refreshToken(
        requestBody: RefreshTokenRequest,
    ): CancelablePromise<ApiResponseLoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: refresh token is missing or blank`,
                401: `Unauthorized: Invalid, expired, unrecognized, or already consumed refresh token, or account suspended/deleted`,
                500: `Internal server error: Unexpected system failure during token refresh`,
            },
        });
    }
    /**
     * Log out user session and invalidate tokens
     * Logs out the authenticated user by invalidating the provided refresh token, revoking all refresh tokens associated with the account across devices, and blacklisting the JWT access token in Redis until its natural expiration.
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static logout(
        requestBody: LogoutRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: Malformed request body or missing refresh token`,
                500: `Internal server error: Unexpected system failure during logout`,
            },
        });
    }
    /**
     * Authenticate user credentials
     * Authenticates user credentials using email and password. Upon success, returns access and refresh tokens. Failed attempts are tracked (lockout occurs after 5 failed attempts).
     * @param requestBody
     * @returns ApiResponseLoginResponse User authenticated successfully
     * @throws ApiError
     */
    public static login(
        requestBody: LoginRequest,
    ): CancelablePromise<ApiResponseLoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: request payload contains missing or invalid fields`,
                401: `Unauthorized: Invalid email or password`,
                423: `Locked: Account is locked for 15 minutes due to consecutive failed attempts`,
                500: `Internal server error: Unexpected system failure`,
            },
        });
    }
    /**
     * Authenticate or register via Google OAuth2
     * Authenticates a customer using a Google ID token. If the user account does not exist, an account and customer profile are automatically created with ACTIVE status and email verified. Returns access and refresh JWT tokens.
     * @param requestBody
     * @returns ApiResponseLoginResponse User authenticated successfully via Google OAuth2
     * @throws ApiError
     */
    public static googleLogin(
        requestBody: GoogleLoginRequest,
    ): CancelablePromise<ApiResponseLoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/google',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed: Google ID token is missing or invalid`,
                401: `Unauthorized: Invalid or expired Google ID token, or Google login rejected for staff/inactive accounts`,
                423: `Locked: Account is temporarily locked due to consecutive failed attempts`,
                500: `Internal server error: Unexpected system failure during Google authentication`,
            },
        });
    }
    /**
     * Request a password reset OTP
     * Public endpoint. Sends a six-digit code valid for five minutes if the email exists. The first three requests in 24 hours are allowed; the fourth locks requests for 24 hours. Unknown email returns the same acknowledgement and has the same request limits.
     * @param requestBody
     * @returns ApiResponseForgotPasswordResponse ApiResponse<ForgotPasswordResponse>: generic acknowledgement
     * @throws ApiError
     */
    public static forgotPassword(
        requestBody: ForgotPasswordRequest,
    ): CancelablePromise<ApiResponseForgotPasswordResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/forgot-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid email`,
                429: `Email locked for 24 hours`,
                500: `Unexpected failure`,
                503: `Redis or email provider unavailable`,
            },
        });
    }
}
