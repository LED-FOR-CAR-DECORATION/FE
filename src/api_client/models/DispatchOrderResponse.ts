/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Updated delivery tracking summary returned after dispatching an order to AhaMove
 */
export type DispatchOrderResponse = {
    /**
     * Unique order identifier
     */
    orderId: number;
    /**
     * Updated order lifecycle status
     */
    orderStatus: DispatchOrderResponse.orderStatus;
    /**
     * Updated delivery lifecycle status
     */
    deliveryStatus: DispatchOrderResponse.deliveryStatus;
    /**
     * Carrier waybill tracking identifier returned by AhaMove
     */
    trackingNumber: string;
    /**
     * Public AhaMove live tracking URL
     */
    trackingUrl?: string | null;
    /**
     * Carrier shipping fee quoted by AhaMove in VND
     */
    carrierFee?: number | null;
};
export namespace DispatchOrderResponse {
    /**
     * Updated order lifecycle status
     */
    export enum orderStatus {
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
     * Updated delivery lifecycle status
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

