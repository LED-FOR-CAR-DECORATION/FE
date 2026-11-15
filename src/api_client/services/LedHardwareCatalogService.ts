/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListLedModelItem } from '../models/ApiResponseListLedModelItem';
import type { LedModelFilterRequest } from '../models/LedModelFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LedHardwareCatalogService {
    /**
     * List LED hardware models
     * Retrieves a paginated list of LED hardware models and warehouse inventory counts for internal ADMIN, MANAGER, and STAFF users. Supports filtering by status, canvas dimensions (widthPx/heightPx), unlinked Store product status, low-stock threshold (< 5), and case-insensitive modelName keyword.
     * @param filter
     * @returns ApiResponseListLedModelItem Paginated LED hardware models retrieved successfully
     * @throws ApiError
     */
    public static listLedModels(
        filter: LedModelFilterRequest,
    ): CancelablePromise<ApiResponseListLedModelItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/led-models',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Bad Request: invalid pagination, dimensions, or status filter parameter`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold ADMIN, MANAGER, or STAFF role`,
                500: `Internal server error`,
            },
        });
    }
}
