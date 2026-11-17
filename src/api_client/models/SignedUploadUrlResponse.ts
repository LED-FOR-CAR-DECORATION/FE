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
     * Permanent public/CDN URL to reference the uploaded file in downstream endpoints
     */
    publicUrl?: string;
    /**
     * Bucket object key path under which the asset will reside
     */
    objectKey?: string;
    /**
     * Expiration timestamp of the signed upload URL in ISO-8601 format
     */
    expiresAt?: string;
};

