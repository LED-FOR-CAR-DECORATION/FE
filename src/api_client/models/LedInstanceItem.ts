/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FulfillmentInfo } from './FulfillmentInfo';
import type { OwnerInfo } from './OwnerInfo';
/**
 * Physical LED hardware instance tracking item
 */
export type LedInstanceItem = {
    /**
     * Unique LED hardware instance identifier
     */
    instanceId: number;
    /**
     * Parent LED hardware model identifier
     */
    modelId: number;
    /**
     * Parent LED hardware model display name
     */
    modelName?: string | null;
    /**
     * Factory-assigned unique serial number
     */
    serialNumber: string;
    /**
     * Uppercase colon-separated ESP32 MAC address
     */
    macAddress: string;
    /**
     * PCB hardware revision stamped at provisioning
     */
    hardwareRevision?: string | null;
    /**
     * Customer-assigned display name once claimed
     */
    deviceName?: string | null;
    /**
     * Physical unit lifecycle status
     */
    status: LedInstanceItem.status;
    /**
     * Linked Store order fulfillment identifiers, or null when not assigned to an order
     */
    fulfillment?: FulfillmentInfo;
    /**
     * Customer owner contact summary once permanently bound, or null when unbound
     */
    owner?: OwnerInfo;
    /**
     * ISO-8601 UTC timestamp when permanently bound and warranty started
     */
    boundAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when 180-day hardware warranty expires
     */
    warrantyExpiresAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the hardware unit was manufactured
     */
    manufacturedAt?: string | null;
    /**
     * Compact HMAC-SHA256 signed factory QR JSON payload string for re-printing; suppressed (null) when status is BOUND or DECOMMISSIONED
     */
    qrPayload?: string | null;
    /**
     * ISO-8601 UTC timestamp when the record was created
     */
    createdAt: string;
    /**
     * ISO-8601 UTC timestamp when the record was last updated
     */
    updatedAt?: string | null;
};
export namespace LedInstanceItem {
    /**
     * Physical unit lifecycle status
     */
    export enum status {
        IN_STOCK = 'IN_STOCK',
        IN_TRANSIT = 'IN_TRANSIT',
        BOUND = 'BOUND',
        RETURNED = 'RETURNED',
        DECOMMISSIONED = 'DECOMMISSIONED',
    }
}

