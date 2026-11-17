/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpdateSubscriptionRequest } from '../models/UpdateSubscriptionRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UpdateSubscriptionControllerService {
    /**
     * Update a subscription plan
     * @param id
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static update3(
        id: number,
        requestBody: UpdateSubscriptionRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/management/admin/store/subscriptions/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `SUBSCRIPTION_NOT_FOUND`,
            },
        });
    }
}
