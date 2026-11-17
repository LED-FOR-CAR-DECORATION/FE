/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCreatedBundleResponse } from '../models/ApiResponseCreatedBundleResponse';
import type { CreateBundleRequest } from '../models/CreateBundleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CreateBundleControllerService {
    /**
     * Create an unpublished bundle product
     * @param requestBody
     * @returns ApiResponseCreatedBundleResponse Created
     * @throws ApiError
     */
    public static create4(
        requestBody: CreateBundleRequest,
    ): CancelablePromise<ApiResponseCreatedBundleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/admin/store/bundles',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
