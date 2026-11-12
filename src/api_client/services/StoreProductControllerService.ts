/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListProductItem } from '../models/ApiResponseListProductItem';
import type { ProductFilterRequest } from '../models/ProductFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StoreProductControllerService {
    /**
     * @param request
     * @returns ApiResponseListProductItem OK
     * @throws ApiError
     */
    public static listProducts(
        request: ProductFilterRequest,
    ): CancelablePromise<ApiResponseListProductItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/store/products',
            query: {
                'request': request,
            },
        });
    }
}
