/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LockoutState } from './LockoutState';
/**
 * Internal user profile and account state, excluding credentials
 */
export type ManagedUserDetailResponse = {
    /**
     * Account ID
     */
    accountId: number;
    /**
     * Employee full name
     */
    name?: string;
    /**
     * Account email
     */
    email: string;
    /**
     * Employee phone
     */
    phone?: string;
    /**
     * Profile avatar, falling back to the account avatar
     */
    avatar?: string;
    /**
     * Assigned database role name without ROLE_ prefix
     */
    role: string;
    /**
     * Account lifecycle status
     */
    status: ManagedUserDetailResponse.status;
    /**
     * Account creation time in UTC
     */
    createdAt?: string;
    /**
     * Employee profile last modification time in UTC
     */
    updatedAt?: string;
    /**
     * Password-login lockout state, independent of account lifecycle status
     */
    lockout: LockoutState;
};
export namespace ManagedUserDetailResponse {
    /**
     * Account lifecycle status
     */
    export enum status {
        PENDING_VERIFICATION = 'PENDING_VERIFICATION',
        ACTIVE = 'ACTIVE',
        SUSPENDED = 'SUSPENDED',
        DELETED = 'DELETED',
    }
}

