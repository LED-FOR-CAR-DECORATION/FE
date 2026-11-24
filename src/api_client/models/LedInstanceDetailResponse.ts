/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FulfillmentInfo } from './FulfillmentInfo';
import type { ModelInfo } from './ModelInfo';
import type { OwnerInfo } from './OwnerInfo';
/**
 * Detailed view of a physical LED hardware instance including model specs, warranty status, linked fulfillment info, owner summary, and re-printable factory QR payload
 */
export type LedInstanceDetailResponse = {
    /**
     * Unique LED hardware instance identifier
     */
    instanceId: number;
    /**
     * Parent LED hardware model details and technical specifications
     */
    model: ModelInfo;
    /**
     * Factory-assigned unique serial number
     */
    serialNumber: string;
    /**
     * Uppercase colon-separated ESP32 MAC address
     */
    macAddress: string;
    /**
     * Identifier of the firmware version currently installed on this LED instance, if reported
     */
    currentFirmwareId?: number | null;
    /**
     * Customer-assigned display name once claimed
     */
    deviceName?: string | null;
    /**
     * Physical unit lifecycle status
     */
    status: LedInstanceDetailResponse.status;
    /**
     * Derived hardware warranty coverage status
     */
    warrantyStatus: LedInstanceDetailResponse.warrantyStatus;
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
     * Linked Store order fulfillment identifiers, or null when not assigned to an order
     */
    fulfillment?: FulfillmentInfo;
    /**
     * Customer owner contact summary once permanently bound, or null when unbound
     */
    owner?: OwnerInfo;
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
export namespace LedInstanceDetailResponse {
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
    /**
     * Derived hardware warranty coverage status
     */
    export enum warrantyStatus {
        NOT_ACTIVATED = 'NOT_ACTIVATED',
        ACTIVE = 'ACTIVE',
        EXPIRED = 'EXPIRED',
    }
}

