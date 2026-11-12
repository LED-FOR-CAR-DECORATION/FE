/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseStoreTagResponse } from '../models/ApiResponseStoreTagResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StoreTagsService {
    /**
     * List store category tags
     * Returns all tags ordered by name and ID.
     * @returns ApiResponseStoreTagResponse<any> Category tags
     * @throws ApiError
     */
    public static listTags(): CancelablePromise<ApiResponseStoreTagResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/store/tags',
            errors: {
                500: `Unable to load category tags`,
            },
        });
    }
}
