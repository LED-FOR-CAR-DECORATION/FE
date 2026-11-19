/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListManagedSubscriptionResponse } from '../models/ApiResponseListManagedSubscriptionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ManagedSubscriptionControllerService {
    /**
     * List configured subscription plans
     * @returns ApiResponseListManagedSubscriptionResponse OK
     * @throws ApiError
     */
    public static list1(): CancelablePromise<ApiResponseListManagedSubscriptionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/store/subscriptions',
        });
    }
}
