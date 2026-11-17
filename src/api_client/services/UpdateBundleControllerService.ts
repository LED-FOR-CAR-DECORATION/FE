/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseUpdatedBundleResponse } from '../models/ApiResponseUpdatedBundleResponse';
import type { UpdateBundleRequest } from '../models/UpdateBundleRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UpdateBundleControllerService {
    /**
     * Update a bundle product
     * @param id
     * @param requestBody
     * @returns ApiResponseUpdatedBundleResponse OK
     * @throws ApiError
     */
    public static update5(
        id: number,
        requestBody: UpdateBundleRequest,
    ): CancelablePromise<ApiResponseUpdatedBundleResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/management/admin/store/bundles/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
