/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for email verification using 6-digit OTP code
 */
export type VerifyEmailRequest = {
    /**
     * Customer email address to verify
     */
    email: string;
    /**
     * 6-digit OTP code received via email
     */
    otp: string;
};

