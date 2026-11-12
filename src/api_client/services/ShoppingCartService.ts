/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCartItemRequest } from '../models/AddCartItemRequest';
import type { ApiResponseCartResponse } from '../models/ApiResponseCartResponse';
import type { UpdateCartItemQuantityRequest } from '../models/UpdateCartItemQuantityRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ShoppingCartService {
    /**
     * Update cart item quantity
     * Overwrites the quantity of a physical item (LED or BUNDLE) in the authenticated customer's active cart after enforcing ownership (anti-IDOR), product availability, and real-time hardware stock. Quantity updates on digital products (CHARACTER or SUBSCRIPTION) are strictly rejected.
     * @param itemId Numeric cart item identifier
     * @param requestBody
     * @returns ApiResponseCartResponse Cart item quantity updated and refreshed shopping cart returned successfully
     * @throws ApiError
     */
    public static updateItemQuantity(
        itemId: number,
        requestBody: UpdateCartItemQuantityRequest,
    ): CancelablePromise<ApiResponseCartResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/cart/items/{itemId}',
            path: {
                'itemId': itemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: invalid path id or quantity, unavailable product, already owned digital product, digital quantity limit exceeded, or insufficient stock`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                404: `Not Found: cart item does not exist or belongs to another customer`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Remove item from shopping cart
     * Removes a specific line item from the authenticated customer's active cart after enforcing ownership (anti-IDOR), retaining the parent cart even when empty, and returning the updated shopping cart.
     * @param itemId Numeric cart item identifier
     * @returns ApiResponseCartResponse Cart item removed and remaining shopping cart returned successfully
     * @throws ApiError
     */
    public static removeItem(
        itemId: number,
    ): CancelablePromise<ApiResponseCartResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/cart/items/{itemId}',
            path: {
                'itemId': itemId,
            },
            errors: {
                400: `Bad Request: invalid or non-positive cart item identifier`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                404: `Not Found: cart item does not exist or belongs to another customer`,
                500: `Internal server error`,
            },
        });
    }
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
    /**
     * Clear active shopping cart
     * Unconditionally removes all line items from the authenticated customer's active shopping cart in a single bulk operation while retaining the parent cart record. Succeeds idempotently even if the cart is empty or has not yet been initialized (without creating a new cart row).
     * @returns any Shopping cart cleared successfully
     * @throws ApiError
     */
    public static clearCart(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/cart',
            errors: {
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                500: `Internal server error`,
            },
        });
    }
}
