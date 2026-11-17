/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CustomerOwnedCharacterResponse } from '../models/CustomerOwnedCharacterResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CustomerCharacterGalleryService {
    /**
     * List customer owned characters
     * Retrieves all character animations purchased and owned by the authenticated customer. Strictly ordered by purchase timestamp descending. Returns order and store product linkage for purchases, along with animation specifications (previewGifUrl, frameCount, frameDelayMs) for connected LED display rendering.
     * @returns CustomerOwnedCharacterResponse Owned characters retrieved successfully
     * @throws ApiError
     */
    public static listOwnedCharacters(): CancelablePromise<Array<CustomerOwnedCharacterResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/customer/characters/owned',
            errors: {
                401: `Unauthorized: missing or invalid authentication token`,
                403: `Forbidden: caller lacks required CUSTOMER role`,
            },
        });
    }
}
