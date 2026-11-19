/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Manager view of a warranty claim enriched with customer contact details and device metadata
 */
export type ManagedWarrantyClaimResponse = {
    /**
     * Unique ID of the warranty claim ticket
     */
    ticketId?: number;
    /**
     * Customer account ID of the claim owner
     */
    customerId?: number;
    /**
     * Customer full name
     */
    customerName?: string | null;
    /**
     * Customer email address
     */
    customerEmail?: string | null;
    /**
     * Customer contact phone number
     */
    customerPhone?: string | null;
    /**
     * Serial number of the claimed LED device
     */
    deviceSerialNumber?: string;
    /**
     * Assigned user-friendly name of the LED device
     */
    deviceName?: string | null;
    /**
     * Originating order item ID if purchased via store
     */
    orderItemId?: number | null;
    /**
     * Current lifecycle status of the claim
     */
    status?: ManagedWarrantyClaimResponse.status;
    /**
     * Detailed description of the hardware defect
     */
    issueDescription?: string;
    /**
     * Evidence image/video URLs supporting the claim
     */
    evidenceMediaUrls?: Array<string>;
    /**
     * Resolution notes entered during inspection or processing
     */
    resolutionNotes?: string | null;
    /**
     * Claim creation timestamp (UTC)
     */
    createdAt?: string;
    /**
     * Claim last update timestamp (UTC)
     */
    updatedAt?: string | null;
};
export namespace ManagedWarrantyClaimResponse {
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

