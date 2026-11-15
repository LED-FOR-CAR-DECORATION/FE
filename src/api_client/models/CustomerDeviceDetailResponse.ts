/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FulfillmentInfo } from './FulfillmentInfo';
import type { ModelInfo } from './ModelInfo';
/**
 * Full customer-facing hardware profile, linked model specification, warranty coverage, and original order fulfillment reference for an owned LED device
 */
export type CustomerDeviceDetailResponse = {
    /**
     * Unique LED hardware device identifier (instance ID)
     */
    deviceId: number;
    /**
     * Factory-assigned unique serial number
     */
    serialNumber: string;
    /**
     * Hardware BLE MAC address in uppercase colon-separated format
     */
    macAddress: string;
    /**
     * Customer-assigned device display name
     */
    deviceName?: string | null;
    /**
     * Current lifecycle status of the hardware device
     */
    status: CustomerDeviceDetailResponse.status;
    /**
     * Currently installed firmware version identifier reported for the device
     */
    currentFirmwareId?: number | null;
    /**
     * ISO-8601 UTC timestamp when the device was bound to the customer account
     */
    boundAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the 180-day hardware warranty expires
     */
    warrantyExpiresAt?: string | null;
    /**
     * Computed hardware warranty coverage status relative to the current server time
     */
    warrantyStatus: CustomerDeviceDetailResponse.warrantyStatus;
    /**
     * Linked parent LED hardware model details and technical specifications
     */
    model: ModelInfo;
    /**
     * Original Store order fulfillment reference, or null when no fulfillment linkage exists
     */
    fulfillment?: FulfillmentInfo;
};
export namespace CustomerDeviceDetailResponse {
    /**
     * Current lifecycle status of the hardware device
     */
    export enum status {
        IN_STOCK = 'IN_STOCK',
        IN_TRANSIT = 'IN_TRANSIT',
        BOUND = 'BOUND',
        RETURNED = 'RETURNED',
        DECOMMISSIONED = 'DECOMMISSIONED',
    }
    /**
     * Computed hardware warranty coverage status relative to the current server time
     */
    export enum warrantyStatus {
        NOT_ACTIVATED = 'NOT_ACTIVATED',
        ACTIVE = 'ACTIVE',
        EXPIRED = 'EXPIRED',
    }
}

