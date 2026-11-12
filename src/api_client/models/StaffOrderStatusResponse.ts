/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload after manually transitioning an order status by internal staff
 */
export type StaffOrderStatusResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order status prior to this transition
     */
    previousStatus: StaffOrderStatusResponse.previousStatus;
    /**
     * Updated order status persisted after transition
     */
    status: StaffOrderStatusResponse.status;
    /**
     * ISO-8601 UTC timestamp when the transition was recorded
     */
    updatedAt: string;
};
export namespace StaffOrderStatusResponse {
    /**
     * Order status prior to this transition
     */
    export enum previousStatus {
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
     * Updated order status persisted after transition
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

