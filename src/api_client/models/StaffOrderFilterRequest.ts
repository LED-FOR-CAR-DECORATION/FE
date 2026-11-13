/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query parameters for listing and filtering orders in the staff fulfillment queue
 */
export type StaffOrderFilterRequest = {
    /**
     * Filter by order lifecycle/fulfillment status (defaults to PROCESSING and PARTIALLY_FULFILLED when omitted)
     */
    status?: StaffOrderFilterRequest.status;
    /**
     * Filter by latest payment transaction status
     */
    paymentStatus?: StaffOrderFilterRequest.paymentStatus;
    /**
     * Filter by shipping delivery status
     */
    deliveryStatus?: StaffOrderFilterRequest.deliveryStatus;
    /**
     * Zero-based page index (0 to 1000000)
     */
    page?: number;
    /**
     * Page size (1 to 50)
     */
    size?: number;
};
export namespace StaffOrderFilterRequest {
    /**
     * Filter by order lifecycle/fulfillment status (defaults to PROCESSING and PARTIALLY_FULFILLED when omitted)
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
    /**
     * Filter by latest payment transaction status
     */
    export enum paymentStatus {
        PENDING = 'PENDING',
        SUCCESS = 'SUCCESS',
        FAILED = 'FAILED',
        REFUNDED = 'REFUNDED',
    }
    /**
     * Filter by shipping delivery status
     */
    export enum deliveryStatus {
        PENDING = 'PENDING',
        ASSIGNED = 'ASSIGNED',
        PICKED_UP = 'PICKED_UP',
        SHIPPING = 'SHIPPING',
        DELIVERED = 'DELIVERED',
        FAILED = 'FAILED',
        RETURNED = 'RETURNED',
    }
}

