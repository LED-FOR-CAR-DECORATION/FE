/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Reason code for deactivating the account
 */
export type SoftDeleteUserRequest = {
    reason: SoftDeleteUserRequest.reason;
};
export namespace SoftDeleteUserRequest {
    export enum reason {
        DUPLICATE_ACCOUNT = 'DUPLICATE_ACCOUNT',
        POLICY_VIOLATION = 'POLICY_VIOLATION',
        USER_REQUEST = 'USER_REQUEST',
        ADMINISTRATIVE = 'ADMINISTRATIVE',
        OTHER = 'OTHER',
    }
}

