/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Reference attachment uploaded by the customer for the commission request
 */
export type CustomerCommissionAttachmentItem = {
    /**
     * Attachment identifier
     */
    attachmentId: number;
    /**
     * Cloud storage URL of the reference image
     */
    imageUrl: string;
    /**
     * Optional caption or note describing the reference image
     */
    caption?: string | null;
    /**
     * Zero-based display order of the attachment
     */
    displayOrder: number;
    /**
     * ISO-8601 UTC timestamp when the attachment was recorded
     */
    createdAt: string;
};

