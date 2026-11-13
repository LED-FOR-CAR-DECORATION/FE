/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload returned after a customer confirms receipt of a delivered order
 */
export type ConfirmOrderDeliveryResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order status prior to confirmation
     */
    previousStatus: ConfirmOrderDeliveryResponse.previousStatus;
    /**
     * Updated order status persisted after confirmation
     */
    status: ConfirmOrderDeliveryResponse.status;
    /**
     * ISO-8601 UTC timestamp when delivery confirmation was recorded
     */
    updatedAt: string;
};
export namespace ConfirmOrderDeliveryResponse {
    /**
     * Order status prior to confirmation
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
     * Updated order status persisted after confirmation
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

