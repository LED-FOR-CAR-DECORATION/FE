/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseSignedUploadUrlResponse } from '../models/ApiResponseSignedUploadUrlResponse';
import type { CreateSignedUploadUrlRequest } from '../models/CreateSignedUploadUrlRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MediaServiceService {
    /**
     * Request a short-lived V4 signed upload URL for direct cloud storage upload
     * Issues a signed PUT upload URL locking MIME type, size limit (10MB), and public CDN cache headers. Returns the signed URL, permanent CDN public URL, and expiration timestamp.
     * @param requestBody
     * @returns ApiResponseSignedUploadUrlResponse OK
     * @throws ApiError
     */
    public static createSignedUploadUrl(
        requestBody: CreateSignedUploadUrlRequest,
    ): CancelablePromise<ApiResponseSignedUploadUrlResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/media/upload-url',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
