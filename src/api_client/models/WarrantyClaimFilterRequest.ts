/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query parameters for filtering and searching customer warranty claims across the system
 */
export type WarrantyClaimFilterRequest = {
    /**
     * Filter by warranty claim status
     */
    status?: WarrantyClaimFilterRequest.status;
    /**
     * Keyword search matching device serial number, customer name, email, phone, or issue description
     */
    query?: string | null;
    /**
     * Zero-based page index (0 to 1000000)
     */
    page?: number;
    /**
     * Page size (1 to 100)
     */
    size?: number;
};
export namespace WarrantyClaimFilterRequest {
    /**
     * Filter by warranty claim status
     */
    export enum status {
        PENDING = 'PENDING',
        APPROVED = 'APPROVED',
        REJECTED = 'REJECTED',
        COMPLETED = 'COMPLETED',
    }
}

