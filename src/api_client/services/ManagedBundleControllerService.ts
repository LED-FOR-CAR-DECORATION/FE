/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListManagedBundleResponse } from '../models/ApiResponseListManagedBundleResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ManagedBundleControllerService {
    /**
     * List store bundles
     * Returns a page of bundles with an optional status filter and the number of included item entries.
     * @param page
     * @param size
     * @param status
     * @returns ApiResponseListManagedBundleResponse OK
     * @throws ApiError
     */
    public static list1(
        page?: number,
        size: number = 10,
        status?: 'UNPUBLISHED' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED',
    ): CancelablePromise<ApiResponseListManagedBundleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/store/bundles',
            query: {
                'page': page,
                'size': size,
                'status': status,
            },
        });
    }
}
