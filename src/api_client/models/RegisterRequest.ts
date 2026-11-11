/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payload for registering a new customer account
 */
export type RegisterRequest = {
    /**
     * Customer email address. Must be unique and valid format
     */
    email: string;
    /**
     * Account password. Must be 8-72 characters long, containing at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)
     */
    password: string;
    /**
     * Password confirmation. Must match password field exactly
     */
    confirmPassword: string;
};

