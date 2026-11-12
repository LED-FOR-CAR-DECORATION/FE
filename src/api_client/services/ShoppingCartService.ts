/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCartItemRequest } from '../models/AddCartItemRequest';
import type { ApiResponseCartResponse } from '../models/ApiResponseCartResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ShoppingCartService {
    /**
     * Add item to active shopping cart
     * Adds a published product to the authenticated customer's active cart, initializing the cart if absent, enforcing digital item limits/ownership, and accumulating LED/bundle quantities within available stock.
     * @param requestBody
     * @returns ApiResponseCartResponse Item added and updated shopping cart returned successfully
     * @throws ApiError
     */
    public static addItem(
        requestBody: AddCartItemRequest,
    ): CancelablePromise<ApiResponseCartResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/cart/items',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: validation failure, unavailable product, already owned digital product, digital quantity limit exceeded, or insufficient stock`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * View active shopping cart
     * Retrieves the authenticated customer's active shopping cart with real-time product base prices, item subtotals, and availability flags. Initializes an empty cart if none exists.
     * @returns ApiResponseCartResponse Active shopping cart retrieved successfully
     * @throws ApiError
     */
    public static viewCart(): CancelablePromise<ApiResponseCartResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/cart',
            errors: {
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                500: `Internal server error`,
            },
        });
    }
}
