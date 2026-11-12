/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payload for resetting account password using OTP
 */
export type ResetPasswordRequest = {
    /**
     * Account email address
     */
    email: string;
    /**
     * 6-digit OTP code received via email
     */
    otp: string;
    /**
     * New account password. Must be 8-72 characters long, containing at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)
     */
    newPassword: string;
    /**
     * Optional password confirmation. If supplied, must match newPassword exactly
     */
    confirmPassword?: string;
};

