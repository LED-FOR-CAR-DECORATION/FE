/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query parameters for listing and sorting the authenticated customer's personal commission requests
 */
export type CustomerCommissionFilterRequest = {
    /**
     * Optional filter by exact commission lifecycle status
     */
    status?: CustomerCommissionFilterRequest.status;
    /**
     * Sort direction on createdAt timestamp (ASC or DESC)
     */
    sortDirection?: string;
    /**
     * Zero-based page index (0 to 1000000)
     */
    page?: number;
    /**
     * Page size (1 to 100)
     */
    size?: number;
};
export namespace CustomerCommissionFilterRequest {
    /**
     * Optional filter by exact commission lifecycle status
     */
    export enum status {
        PENDING_REVIEW = 'PENDING_REVIEW',
        PENDING_PAYMENT = 'PENDING_PAYMENT',
        PAID = 'PAID',
        IN_PROGRESS = 'IN_PROGRESS',
        INTERNAL_REVIEW = 'INTERNAL_REVIEW',
        INTERNAL_REVISION_REQUIRED = 'INTERNAL_REVISION_REQUIRED',
        PREVIEW_DELIVERED = 'PREVIEW_DELIVERED',
        AWAITING_EXTRA_PAYMENT = 'AWAITING_EXTRA_PAYMENT',
        CUSTOMER_REVISION_REQUESTED = 'CUSTOMER_REVISION_REQUESTED',
        AWAITING_ESTIMATE = 'AWAITING_ESTIMATE',
        COMPLETED = 'COMPLETED',
        CANCELLED = 'CANCELLED',
        EXPIRED = 'EXPIRED',
    }
}

