/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Current account profile; only public profile fields are serialized
 */
export type CurrentProfileResponse = {
    /**
     * Account identifier
     */
    accountId: number;
    /**
     * Full name; null when not completed
     */
    name?: string;
    /**
     * Account email
     */
    email: string;
    /**
     * Phone; null when not completed
     */
    phone?: string;
    /**
     * Profile avatar URL, falling back to the account avatar
     */
    avatar?: string;
    /**
     * Current database role names without ROLE_ prefix
     */
    roles: Array<string>;
};

