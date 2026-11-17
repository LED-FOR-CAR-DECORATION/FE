/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Internal user list filters, combined with AND. CUSTOMER accounts/roles are always excluded.
 */
export type ManagedUserFilterRequest = {
    /**
     * Zero-based page index, 0 to 1000000
     */
    page?: number;
    /**
     * Page size, 1 to 50
     */
    size?: number;
    /**
     * Exact role name, case-insensitive, without ROLE_ prefix
     */
    role?: string;
    /**
     * True selects ACTIVE; false selects all non-ACTIVE statuses; omitted selects both
     */
    active?: boolean;
    /**
     * Literal case-insensitive substring of account email or employee name. Blank means no search.
     */
    search?: string;
};

