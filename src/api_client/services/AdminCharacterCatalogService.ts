/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminCharacterFilterRequest } from '../models/AdminCharacterFilterRequest';
import type { ApiResponseListAdminCharacterItem } from '../models/ApiResponseListAdminCharacterItem';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminCharacterCatalogService {
    /**
     * Admin list all characters
     * Retrieves a paginated list of all graphic characters across the entire company for oversight, copyright audits, and project handovers. Supports optional keyword query filtering, optional creator employee filter, batch loading of author details from IAM, and version counts without N+1 queries.
     * @param request
     * @returns ApiResponseListAdminCharacterItem Company character catalog retrieved successfully
     * @throws ApiError
     */
    public static listAllCharacters(
        request: AdminCharacterFilterRequest,
    ): CancelablePromise<ApiResponseListAdminCharacterItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/characters',
            query: {
                'request': request,
            },
            errors: {
                400: `Bad Request: invalid pagination or creator ID parameters`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess the MANAGER or ADMIN role`,
                500: `Internal server error`,
            },
        });
    }
}
