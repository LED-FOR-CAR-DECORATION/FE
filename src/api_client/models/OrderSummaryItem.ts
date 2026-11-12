/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary card of a customer purchase order
 */
export type OrderSummaryItem = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order product category classification
     */
    orderType: OrderSummaryItem.orderType;
    /**
     * Current order lifecycle status
     */
    status: OrderSummaryItem.status;
    /**
     * Final order payable amount in VND
     */
    totalAmount: number;
    /**
     * Total number of distinct order line items (COUNT of order_item)
     */
    totalItems: number;
    /**
     * Display name of the primary (first) product in the order
     */
    primaryProductName: string;
    /**
     * Thumbnail image URL of the primary (first) product in the order
     */
    primaryProductThumbnail?: string | null;
    /**
     * ISO-8601 UTC payment expiration timestamp (populated only when status is PENDING_PAYMENT)
     */
    expiresAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the order was created
     */
    createdAt: string;
};
export namespace OrderSummaryItem {
    /**
     * Order product category classification
     */
    export enum orderType {
        PHYSICAL = 'PHYSICAL',
        DIGITAL = 'DIGITAL',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
        MIXED = 'MIXED',
    }
    /**
     * Current order lifecycle status
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

