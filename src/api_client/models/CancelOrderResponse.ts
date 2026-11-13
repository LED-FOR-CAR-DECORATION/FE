/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload returned after a customer cancels an order
 */
export type CancelOrderResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order status prior to cancellation
     */
    previousStatus: CancelOrderResponse.previousStatus;
    /**
     * Updated order status persisted after cancellation (CANCELED or REFUNDED)
     */
    status: CancelOrderResponse.status;
    /**
     * ISO-8601 UTC timestamp when cancellation was recorded
     */
    updatedAt: string;
};
export namespace CancelOrderResponse {
    /**
     * Order status prior to cancellation
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
     * Updated order status persisted after cancellation (CANCELED or REFUNDED)
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

