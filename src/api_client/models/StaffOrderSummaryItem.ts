/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary card of a physical fulfillment order for staff queue management
 */
export type StaffOrderSummaryItem = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order product category classification
     */
    orderType: StaffOrderSummaryItem.orderType;
    /**
     * Current order lifecycle status
     */
    status: StaffOrderSummaryItem.status;
    /**
     * Latest payment transaction status
     */
    paymentStatus?: StaffOrderSummaryItem.paymentStatus;
    /**
     * Current delivery status from order_delivery
     */
    deliveryStatus?: StaffOrderSummaryItem.deliveryStatus;
    /**
     * Customer account identifier
     */
    customerId: number;
    /**
     * Customer full name from IAM customer profile
     */
    customerFullName?: string | null;
    /**
     * Customer account email from IAM
     */
    customerEmail?: string | null;
    /**
     * Snapshotted delivery recipient name
     */
    recipientName?: string | null;
    /**
     * Snapshotted delivery recipient phone number
     */
    recipientPhone?: string | null;
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
     * ISO-8601 UTC timestamp when the order was created
     */
    createdAt: string;
    /**
     * ISO-8601 UTC timestamp when the order was last updated
     */
    updatedAt?: string | null;
};
export namespace StaffOrderSummaryItem {
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
    /**
     * Latest payment transaction status
     */
    export enum paymentStatus {
        PENDING = 'PENDING',
        SUCCESS = 'SUCCESS',
        FAILED = 'FAILED',
        REFUNDED = 'REFUNDED',
    }
    /**
     * Current delivery status from order_delivery
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

