/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCheckoutResponse } from '../models/ApiResponseCheckoutResponse';
import type { ApiResponseListOrderSummaryItem } from '../models/ApiResponseListOrderSummaryItem';
import type { ApiResponseOrderDetailResponse } from '../models/ApiResponseOrderDetailResponse';
import type { CheckoutRequest } from '../models/CheckoutRequest';
import type { OrderFilterRequest } from '../models/OrderFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrdersService {
    /**
     * Checkout selected cart items to create an order
     * Creates a PENDING_PAYMENT order from selected cart items, deducts physical LED hardware stock atomically, snapshots order items and delivery information (when physical goods are present), initializes SEPAY payment intent, and removes only the checked-out cart items.
     * @param requestBody
     * @returns ApiResponseCheckoutResponse Order created successfully and awaiting payment confirmation
     * @throws ApiError
     */
    public static checkout(
        requestBody: CheckoutRequest,
    ): CancelablePromise<ApiResponseCheckoutResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/orders/checkout',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: validation failure, invalid cart item, missing delivery address for physical goods, unavailable product, already owned digital product, or insufficient LED stock`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                404: `Not Found: deliveryAddressId does not exist or belongs to another customer`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List authenticated customer's purchase orders
     * Retrieves a paginated history of orders owned by the authenticated CUSTOMER, sorted by createdAt descending with optional status and UTC date-range filters.
     * @param request
     * @returns ApiResponseListOrderSummaryItem Paginated order history retrieved successfully
     * @throws ApiError
     */
    public static listOrders(
        request: OrderFilterRequest,
    ): CancelablePromise<ApiResponseListOrderSummaryItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/orders',
            query: {
                'request': request,
            },
            errors: {
                400: `Bad Request: invalid pagination, status enum, date format, or fromDate after toDate`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * View purchase order detail
     * Retrieves full details of an order owned by the authenticated CUSTOMER, including snapshotted line items (with previewGifUrl for CHARACTER items), optional AhaMove delivery tracking, and active SePay VietQR retry info or confirmed payment summary.
     * @param id Numeric purchase order identifier
     * @returns ApiResponseOrderDetailResponse Order detail retrieved successfully
     * @throws ApiError
     */
    public static getOrderDetail(
        id: number,
    ): CancelablePromise<ApiResponseOrderDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/orders/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: invalid or non-positive order id path parameter`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account type is not CUSTOMER (e.g. EMPLOYEE accounts are denied)`,
                404: `Not Found: order does not exist or belongs to another customer`,
                500: `Internal server error`,
            },
        });
    }
}
