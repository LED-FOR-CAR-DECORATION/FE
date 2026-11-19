/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Details of a hardware warranty claim ticket
 */
export type WarrantyClaimResponse = {
    /**
     * Unique ticket ID
     */
    ticketId?: number;
    /**
     * Device ID
     */
    deviceId?: number;
    /**
     * Device hardware serial number
     */
    deviceSerialNumber?: string;
    /**
     * Assigned user-friendly name of the LED device
     */
    deviceName?: string | null;
    /**
     * Current lifecycle status of the claim
     */
    status?: WarrantyClaimResponse.status;
    /**
     * Description of the hardware defect
     */
    issueDescription?: string;
    /**
     * Evidence image/video URLs supporting the claim
     */
    evidenceMediaUrls?: Array<string>;
    /**
     * Resolution or rejection notes entered by management
     */
    resolutionNotes?: string | null;
    /**
     * Creation timestamp (UTC)
     */
    createdAt?: string;
    /**
     * Last update timestamp (UTC)
     */
    updatedAt?: string | null;
};
export namespace WarrantyClaimResponse {
    /**
     * Current lifecycle status of the claim
     */
    export enum status {
        PENDING = 'PENDING',
        APPROVED = 'APPROVED',
        REJECTED = 'REJECTED',
        COMPLETED = 'COMPLETED',
    }
}

