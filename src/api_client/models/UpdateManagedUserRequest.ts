/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Provide at least one field. Omitted and null values preserve existing fields.
 */
export type UpdateManagedUserRequest = {
    name?: string;
    phone?: string;
    avatar?: string;
    role?: string;
    /**
     * Set or clear a manual suspension
     */
    locked?: boolean;
};

