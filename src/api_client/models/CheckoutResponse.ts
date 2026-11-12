/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Order checkout summary with initialized payment intent details
 */
export type CheckoutResponse = {
    /**
     * Newly created order identifier
     */
    orderId: number;
    /**
     * Initialized payment transaction identifier
     */
    paymentId: number;
    /**
     * Payment gateway used for the transaction
     */
    paymentGateway: CheckoutResponse.paymentGateway;
    /**
     * Total order amount in VND
     */
    totalAmount: number;
    /**
     * Initial order status awaiting payment confirmation
     */
    status: CheckoutResponse.status;
    /**
     * ISO-8601 UTC timestamp when unpaid checkout reservation expires
     */
    expiresAt: string;
};
export namespace CheckoutResponse {
    /**
     * Payment gateway used for the transaction
     */
    export enum paymentGateway {
        SEPAY = 'SEPAY',
    }
    /**
     * Initial order status awaiting payment confirmation
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

