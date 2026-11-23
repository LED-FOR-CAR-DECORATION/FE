/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for generating a short-lived V4 signed upload URL
 */
export type CreateSignedUploadUrlRequest = {
    /**
     * Original filename of the file to be uploaded
     */
    fileName: string;
    /**
     * MIME content type of the image
     */
    contentType: string;
    /**
     * Exact size of the file in bytes (max 10MB)
     */
    fileSize: number;
    /**
     * Strict business purpose categorization for folder scoping and access control
     */
    purpose: CreateSignedUploadUrlRequest.purpose;
    /**
     * Optional context identifier (commissionId or deviceId) required for specific purposes
     */
    targetId?: number;
};
export namespace CreateSignedUploadUrlRequest {
    /**
     * Strict business purpose categorization for folder scoping and access control
     */
    export enum purpose {
        COMMISSION_REFERENCE = 'COMMISSION_REFERENCE',
        COMMISSION_CHAT = 'COMMISSION_CHAT',
        COMMISSION_DRAFT = 'COMMISSION_DRAFT',
        WARRANTY_EVIDENCE = 'WARRANTY_EVIDENCE',
        CHARACTER_ASSET = 'CHARACTER_ASSET',
        STORE_PRODUCT = 'STORE_PRODUCT',
        PRODUCT_LED = 'PRODUCT_LED',
        PRODUCT_BUNDLE = 'PRODUCT_BUNDLE',
        PRODUCT_SUBSCRIPTION = 'PRODUCT_SUBSCRIPTION',
    }
}

