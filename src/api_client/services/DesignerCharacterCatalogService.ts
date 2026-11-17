/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListDesignerCharacterItem } from '../models/ApiResponseListDesignerCharacterItem';
import type { DesignerCharacterFilterRequest } from '../models/DesignerCharacterFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DesignerCharacterCatalogService {
    /**
     * List my characters
     * Retrieves a paginated list of graphic characters created by the authenticated designer, sorted by creation date descending. Supports optional keyword query filtering across character names and descriptions. Calculates total version counts and extracts current active version summaries without N+1 queries.
     * @param request
     * @returns ApiResponseListDesignerCharacterItem Personal character catalog retrieved successfully
     * @throws ApiError
     */
    public static listMyCharacters(
        request: DesignerCharacterFilterRequest,
    ): CancelablePromise<ApiResponseListDesignerCharacterItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/designer/characters/my',
            query: {
                'request': request,
            },
            errors: {
                400: `Bad Request: invalid pagination parameters`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess the DESIGNER role or employee account is inactive`,
                500: `Internal server error`,
            },
        });
    }
}
