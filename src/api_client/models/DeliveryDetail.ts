/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Snapshotted recipient shipping details and live carrier tracking status
 */
export type DeliveryDetail = {
    /**
     * Assigned shipping carrier
     */
    carrier: string;
    /**
     * Snapshotted recipient full name
     */
    recipientName: string;
    /**
     * Snapshotted recipient phone number
     */
    recipientPhone: string;
    /**
     * Snapshotted full delivery street address
     */
    fullAddress: string;
    /**
     * Snapshotted delivery latitude coordinate
     */
    latitude: number;
    /**
     * Snapshotted delivery longitude coordinate
     */
    longitude: number;
    /**
     * Current shipment delivery status
     */
    deliveryStatus: DeliveryDetail.deliveryStatus;
    /**
     * Carrier waybill tracking number
     */
    trackingNumber?: string | null;
    /**
     * Carrier live map tracking URL
     */
    trackingUrl?: string | null;
    /**
     * Estimated delivery timestamp in UTC
     */
    estimatedDeliveryAt?: string | null;
};
export namespace DeliveryDetail {
    /**
     * Current shipment delivery status
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

