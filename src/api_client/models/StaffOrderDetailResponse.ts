/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CustomerSummary } from './CustomerSummary';
import type { DeliveryDetail } from './DeliveryDetail';
import type { OrderItemDetail } from './OrderItemDetail';
import type { StaffPaymentDetail } from './StaffPaymentDetail';
/**
 * Detailed order view for internal staff fulfillment including customer profile, snapshotted delivery details, line items, and payment reconciliation summary
 */
export type StaffOrderDetailResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order product category classification
     */
    orderType: StaffOrderDetailResponse.orderType;
    /**
     * Current order lifecycle status
     */
    status: StaffOrderDetailResponse.status;
    /**
     * Sum of snapshotted line item subtotals in VND
     */
    subtotal: number;
    /**
     * Shipping fee applied to this order in VND
     */
    shippingFee: number;
    /**
     * Final payable total in VND
     */
    totalAmount: number;
    /**
     * ISO-8601 UTC payment expiration timestamp (populated only when status is PENDING_PAYMENT)
     */
    expiresAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the order was created
     */
    createdAt: string;
    /**
     * ISO-8601 UTC timestamp when the order was last updated
     */
    updatedAt?: string | null;
    /**
     * Customer account contact summary from IAM
     */
    customer: CustomerSummary;
    /**
     * Ordered line items with immutable unit price snapshots
     */
    items: Array<OrderItemDetail>;
    /**
     * Snapshotted recipient shipping details and carrier tracking info (null if order has no delivery)
     */
    delivery?: DeliveryDetail;
    /**
     * Latest payment reconciliation summary without customer VietQR retry details
     */
    payment?: StaffPaymentDetail;
};
export namespace StaffOrderDetailResponse {
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

