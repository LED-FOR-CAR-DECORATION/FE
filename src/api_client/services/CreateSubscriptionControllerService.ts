/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCreatedSubscriptionResponse } from '../models/ApiResponseCreatedSubscriptionResponse';
import type { CreateSubscriptionRequest } from '../models/CreateSubscriptionRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CreateSubscriptionControllerService {
    /**
     * Create an unpublished subscription product
     * @param requestBody
     * @returns ApiResponseCreatedSubscriptionResponse Created
     * @throws ApiError
     */
    public static create2(
        requestBody: CreateSubscriptionRequest,
    ): CancelablePromise<ApiResponseCreatedSubscriptionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/admin/store/subscriptions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
