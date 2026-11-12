/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Customer registration response data
 */
export type RegisterResponse = {
    /**
     * Unique ID of the created user account
     */
    id?: number;
    /**
     * Registered email address
     */
    email?: string;
    /**
     * Account type assigned to the user
     */
    accountType?: string;
    /**
     * Initial account verification status
     */
    status?: string;
};

