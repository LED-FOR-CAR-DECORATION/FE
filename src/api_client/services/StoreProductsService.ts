/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListProductItem } from '../models/ApiResponseListProductItem';
import type { ApiResponseProductDetailResponse } from '../models/ApiResponseProductDetailResponse';
import type { ProductFilterRequest } from '../models/ProductFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StoreProductsService {
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
    /**
     * View public product detail
     * Retrieves full public metadata and type-specific attributes (LED, CHARACTER, BUNDLE, SUBSCRIPTION) for a PUBLISHED or ARCHIVED store product. UNPUBLISHED and DELETED products return 404.
     * @param id Numeric store product identifier
     * @returns ApiResponseProductDetailResponse Product detail retrieved successfully
     * @throws ApiError
     */
    public static getProductDetail(
        id: number,
    ): CancelablePromise<ApiResponseProductDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/store/products/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: invalid or non-positive product id path parameter`,
                404: `Not Found: product does not exist, is UNPUBLISHED, or is DELETED`,
                500: `Internal server error`,
            },
        });
    }
}
