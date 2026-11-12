/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Internal account profile; excludes credentials and security counters
 */
export type UserItem = {
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
     * Employee avatar, falling back to account avatar
     */
    avatar?: string;
    /**
     * Current database role name without ROLE_ prefix
     */
    role: string;
    /**
     * Account lifecycle status
     */
    status: UserItem.status;
    /**
     * Whether account status is ACTIVE
     */
    active: boolean;
};
export namespace UserItem {
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

