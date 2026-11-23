/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload containing pre-signed upload URL and public CDN asset URL
 */
export type SignedUploadUrlResponse = {
    /**
     * Time-limited V4 pre-signed PUT URL to upload binary directly to Firebase Cloud Storage
     */
    signedUploadUrl?: string;
    /**
     * Permanent public CDN URL. Only set for public purposes (CHARACTER_ASSET, STORE_PRODUCT); null for private purposes (COMMISSION_REFERENCE, COMMISSION_CHAT, COMMISSION_DRAFT, WARRANTY_EVIDENCE), which are only viewable through short-lived signed URLs returned by the owning endpoints.
     */
    publicUrl?: string | null;
    /**
     * Bucket object key of the asset. For private purposes, send this value as the imageUrl / mediaUrl / evidenceMediaUrls item of the downstream endpoint.
     */
    objectKey?: string;
    /**
     * Headers the client must send verbatim with the PUT upload (they are part of the signature)
     */
    uploadHeaders?: Record<string, string>;
    /**
     * Expiration timestamp of the signed upload URL in ISO-8601 format
     */
    expiresAt?: string;
};

