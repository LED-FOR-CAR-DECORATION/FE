/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary of a customer-owned LED hardware device for mobile device list rendering and BLE discovery
 */
export type CustomerDeviceItem = {
    /**
     * Unique LED hardware device identifier (instance ID)
     */
    deviceId?: number;
    /**
     * Unique factory serial number
     */
    serialNumber?: string;
    /**
     * Hardware BLE MAC address in uppercase colon-separated format
     */
    macAddress?: string;
    /**
     * User-friendly device display name
     */
    deviceName?: string;
    /**
     * Current lifecycle status of the hardware device
     */
    status?: CustomerDeviceItem.status;
    /**
     * Hardware model catalog ID
     */
    modelId?: number;
    /**
     * Hardware model display name
     */
    modelName?: string;
    /**
     * LED matrix pixel width from the hardware model specification
     */
    widthPx?: number;
    /**
     * LED matrix pixel height from the hardware model specification
     */
    heightPx?: number;
    /**
     * Currently reported firmware version ID on the device (nullable until reported)
     */
    currentFirmwareId?: number | null;
    /**
     * Timestamp when the device was bound to the customer account
     */
    boundAt?: string;
    /**
     * Timestamp when the hardware warranty expires
     */
    warrantyExpiresAt?: string;
    /**
     * Computed warranty status relative to the current server time
     */
    warrantyStatus?: CustomerDeviceItem.warrantyStatus;
};
export namespace CustomerDeviceItem {
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
     * Computed warranty status relative to the current server time
     */
    export enum warrantyStatus {
        NOT_ACTIVATED = 'NOT_ACTIVATED',
        ACTIVE = 'ACTIVE',
        EXPIRED = 'EXPIRED',
    }
}

