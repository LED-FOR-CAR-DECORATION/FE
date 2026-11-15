/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseStoreTagResponse } from '../models/ApiResponseStoreTagResponse';
import type { CreateStoreTagRequest } from '../models/CreateStoreTagRequest';
import type { UpdateStoreTagRequest } from '../models/UpdateStoreTagRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StoreTagManagementService {
    /**
     * Update a category tag
     * @param id
     * @param requestBody
     * @returns ApiResponseStoreTagResponse Tag updated
     * @throws ApiError
     */
    public static update2(
        id: number,
        requestBody: UpdateStoreTagRequest,
    ): CancelablePromise<ApiResponseStoreTagResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/management/admin/store/tags/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid tag name`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `TAG_NOT_FOUND`,
                409: `TAG_ALREADY_EXISTS`,
            },
        });
    }
    /**
     * Delete a category tag
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static delete1(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/management/admin/store/tags/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid tag ID`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `TAG_NOT_FOUND`,
            },
        });
    }
    /**
     * Create a category tag
     * @param requestBody
     * @returns ApiResponseStoreTagResponse Tag created
     * @throws ApiError
     */
    public static create1(
        requestBody: CreateStoreTagRequest,
    ): CancelablePromise<ApiResponseStoreTagResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/admin/store/tags',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid tag name`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                409: `TAG_ALREADY_EXISTS`,
            },
        });
    }
}
