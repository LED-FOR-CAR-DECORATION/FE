/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AhamoveWebhookResponse = {
    trackingNumber?: string;
    outcome?: string;
    deliveryStatus?: AhamoveWebhookResponse.deliveryStatus;
    orderStatus?: AhamoveWebhookResponse.orderStatus;
    message?: string;
};
export namespace AhamoveWebhookResponse {
    export enum deliveryStatus {
        PENDING = 'PENDING',
        ASSIGNED = 'ASSIGNED',
        PICKED_UP = 'PICKED_UP',
        SHIPPING = 'SHIPPING',
        DELIVERED = 'DELIVERED',
        FAILED = 'FAILED',
        RETURNED = 'RETURNED',
    }
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
}

