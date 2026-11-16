/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Customer-visible artwork preview approved by Staff QA
 */
export type CustomerDeliveredPreviewItem = {
    /**
     * Submission identifier
     */
    submissionId: number;
    /**
     * Sequential draft version number
     */
    versionNumber: number;
    /**
     * Cloud storage URL of the delivered preview artwork (PNG/GIF)
     */
    imageUrl: string;
    /**
     * Optional note accompanying the delivered preview
     */
    designerNote?: string | null;
    /**
     * Customer-visible submission status (`STAFF_APPROVED` or `CUSTOMER_ACCEPTED`)
     */
    status: CustomerDeliveredPreviewItem.status;
    /**
     * ISO-8601 UTC timestamp when Staff delivered this preview to the customer
     */
    deliveredAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the draft version was uploaded
     */
    createdAt: string;
};
export namespace CustomerDeliveredPreviewItem {
    /**
     * Customer-visible submission status (`STAFF_APPROVED` or `CUSTOMER_ACCEPTED`)
     */
    export enum status {
        PENDING_STAFF_REVIEW = 'PENDING_STAFF_REVIEW',
        STAFF_REJECTED = 'STAFF_REJECTED',
        STAFF_APPROVED = 'STAFF_APPROVED',
        CUSTOMER_ACCEPTED = 'CUSTOMER_ACCEPTED',
    }
}

