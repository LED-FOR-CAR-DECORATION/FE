/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCreatedStoreProductResponse } from '../models/ApiResponseCreatedStoreProductResponse';
import type { ApiResponseUpdatedStoreProductResponse } from '../models/ApiResponseUpdatedStoreProductResponse';
import type { ApiResponseUpdatedStoreProductStatusResponse } from '../models/ApiResponseUpdatedStoreProductStatusResponse';
import type { CreateStoreProductRequest } from '../models/CreateStoreProductRequest';
import type { UpdateStoreProductRequest } from '../models/UpdateStoreProductRequest';
import type { UpdateStoreProductStatusRequest } from '../models/UpdateStoreProductStatusRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StoreProductManagementService {
    /**
     * Update an existing store product
     * Updates product details and optional tag associations. Historical order prices are preserved.
     * @param id
     * @param requestBody
     * @returns ApiResponseUpdatedStoreProductResponse Updated product
     * @throws ApiError
     */
    public static update1(
        id: number,
        requestBody: UpdateStoreProductRequest,
    ): CancelablePromise<ApiResponseUpdatedStoreProductResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/management/admin/store/products/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid ID or payload`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `Product or tag not found`,
            },
        });
    }
    /**
     * Soft-delete a store product
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static delete(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/management/admin/store/products/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid product ID`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `Product is missing or already deleted`,
            },
        });
    }
    /**
     * Create an unpublished store product
     * @param requestBody
     * @returns ApiResponseCreatedStoreProductResponse Product created
     * @throws ApiError
     */
    public static create1(
        requestBody: CreateStoreProductRequest,
    ): CancelablePromise<ApiResponseCreatedStoreProductResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/admin/store/products',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid request`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `Tag or character version missing`,
                409: `Character version already linked`,
            },
        });
    }
    /**
     * Update store product status
     * Publishes, unpublishes, or archives an existing store product.
     * @param id
     * @param requestBody
     * @returns ApiResponseUpdatedStoreProductStatusResponse Updated product
     * @throws ApiError
     */
    public static update2(
        id: number,
        requestBody: UpdateStoreProductStatusRequest,
    ): CancelablePromise<ApiResponseUpdatedStoreProductStatusResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/management/admin/store/products/{id}/status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid ID or payload`,
                401: `Authentication required`,
                403: `ADMIN or MANAGER required`,
                404: `Product is missing or deleted`,
            },
        });
    }
}
