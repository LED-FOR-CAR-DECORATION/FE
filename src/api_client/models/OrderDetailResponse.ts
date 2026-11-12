/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeliveryDetail } from './DeliveryDetail';
import type { OrderItemDetail } from './OrderItemDetail';
import type { PaymentDetail } from './PaymentDetail';
/**
 * Detailed purchase order view including line items, optional delivery tracking, and payment status/retry info
 */
export type OrderDetailResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Order product category classification
     */
    orderType: OrderDetailResponse.orderType;
    /**
     * Current order lifecycle status
     */
    status: OrderDetailResponse.status;
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
     * ISO-8601 UTC payment expiration timestamp (populated when status is PENDING_PAYMENT)
     */
    expiresAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the order was created
     */
    createdAt: string;
    /**
     * Ordered line items with immutable unit price snapshots
     */
    items: Array<OrderItemDetail>;
    /**
     * Snapshotted recipient address and AhaMove tracking details (null for digital-only orders)
     */
    delivery?: DeliveryDetail;
    /**
     * Latest payment transaction confirmation or active SePay VietQR retry instructions
     */
    payment?: PaymentDetail;
};
export namespace OrderDetailResponse {
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

