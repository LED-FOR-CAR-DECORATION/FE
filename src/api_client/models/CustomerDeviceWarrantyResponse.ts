/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WarrantyTicketSummaryResponse } from './WarrantyTicketSummaryResponse';
/**
 * Response containing device warranty coverage details and ticket history
 */
export type CustomerDeviceWarrantyResponse = {
    /**
     * LED device instance ID
     */
    deviceId?: number;
    /**
     * Device hardware serial number
     */
    serialNumber?: string;
    /**
     * Device display or custom name
     */
    deviceName?: string;
    /**
     * Timestamp when the device was bound/claimed
     */
    boundAt?: string;
    /**
     * Timestamp when the hardware warranty expires
     */
    warrantyExpiresAt?: string;
    /**
     * Current derived warranty coverage state
     */
    warrantyStatus?: CustomerDeviceWarrantyResponse.warrantyStatus;
    /**
     * Remaining warranty days (0 if expired or not activated)
     */
    remainingDays?: number;
    /**
     * Active warranty ticket under review or repair, if any
     */
    activeTicket?: WarrantyTicketSummaryResponse;
    /**
     * Historical list of warranty tickets filed for this device
     */
    ticketHistory?: Array<WarrantyTicketSummaryResponse>;
};
export namespace CustomerDeviceWarrantyResponse {
    /**
     * Current derived warranty coverage state
     */
    export enum warrantyStatus {
        NOT_ACTIVATED = 'NOT_ACTIVATED',
        ACTIVE = 'ACTIVE',
        EXPIRED = 'EXPIRED',
    }
}

