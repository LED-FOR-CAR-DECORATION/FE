/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query parameters for listing and filtering the authenticated customer's order history
 */
export type OrderFilterRequest = {
    /**
     * Filter by exact order lifecycle status
     */
    status?: OrderFilterRequest.status;
    /**
     * Filter orders created on or after this ISO-8601 date (UTC)
     */
    fromDate?: string | null;
    /**
     * Filter orders created on or before this ISO-8601 date (UTC)
     */
    toDate?: string | null;
    /**
     * Zero-based page index (min 0)
     */
    page?: number;
    /**
     * Page size (1 to 50)
     */
    size?: number;
};
export namespace OrderFilterRequest {
    /**
     * Filter by exact order lifecycle status
     */
    export enum status {
        PENDING_PAYMENT = 'PENDING_PAYMENT',
        PROCESSING = 'PROCESSING',
        PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
        SHIPPING = 'SHIPPING',
        DELIVERED = 'DELIVERED',
        COMPLETED = 'COMPLETED',
        DELIVERY_FAILED = 'DELIVERY_FAILED',
        REFUNDED = 'REFUNDED',
        CANCELED = 'CANCELED',
    }
}

