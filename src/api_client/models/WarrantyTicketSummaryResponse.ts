/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Warranty ticket summary details
 */
export type WarrantyTicketSummaryResponse = {
    /**
     * Warranty ticket ID
     */
    ticketId?: number;
    /**
     * Ticket processing status
     */
    status?: WarrantyTicketSummaryResponse.status;
    /**
     * Issue description reported by customer
     */
    issueDescription?: string;
    /**
     * Evidence media URLs uploaded by customer
     */
    evidenceMediaUrls?: Array<string>;
    /**
     * Manager resolution or feedback notes
     */
    resolutionNotes?: string;
    /**
     * Ticket creation timestamp
     */
    createdAt?: string;
    /**
     * Ticket last update timestamp
     */
    updatedAt?: string;
};
export namespace WarrantyTicketSummaryResponse {
    /**
     * Ticket processing status
     */
    export enum status {
        PENDING = 'PENDING',
        APPROVED = 'APPROVED',
        REJECTED = 'REJECTED',
        COMPLETED = 'COMPLETED',
    }
}

