/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Current password-login lockout information
 */
export type LockoutState = {
    /**
     * True only when lockoutUntil is strictly after the response snapshot time
     */
    locked: boolean;
    /**
     * Persisted lockout deadline; may be null or already expired
     */
    lockoutUntil?: string;
    /**
     * Persisted consecutive failed password-login attempts
     */
    failedAttempts: number;
};

