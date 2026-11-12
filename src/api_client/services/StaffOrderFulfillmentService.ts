/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListStaffOrderSummaryItem } from '../models/ApiResponseListStaffOrderSummaryItem';
import type { ApiResponseStaffOrderDetailResponse } from '../models/ApiResponseStaffOrderDetailResponse';
import type { ApiResponseStaffOrderStatusResponse } from '../models/ApiResponseStaffOrderStatusResponse';
import type { StaffOrderFilterRequest } from '../models/StaffOrderFilterRequest';
import type { UpdateStaffOrderStatusRequest } from '../models/UpdateStaffOrderStatusRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StaffOrderFulfillmentService {
    /**
     * Update order fulfillment status
     * Manually transitions an order across staff-permitted lifecycle transitions: PENDING_PAYMENT -> CANCELED (accepts CANCELLED alias and restores LED hardware stocks), DELIVERY_FAILED -> PROCESSING, and DELIVERED -> COMPLETED.
     * @param id Numeric purchase order identifier
     * @param requestBody
     * @returns ApiResponseStaffOrderStatusResponse Order status transitioned successfully
     * @throws ApiError
     */
    public static updateOrderStatus(
        id: number,
        requestBody: UpdateStaffOrderStatusRequest,
    ): CancelablePromise<ApiResponseStaffOrderStatusResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/management/staff/orders/{id}/status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: invalid path id, malformed JSON, or unsupported target status`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller is not an active internal STAFF, MANAGER, or ADMIN account`,
                404: `Not Found: order does not exist`,
                409: `Conflict: order status cannot transition from its current state to the requested target state`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List staff order fulfillment queue
     * Retrieves a paginated queue of physical LED fulfillment orders (requiring an order_delivery record), sorted by createdAt descending. Defaults to status in (PROCESSING, PARTIALLY_FULFILLED) when status filter is omitted, and supports filtering by order status, latest payment status, and delivery status.
     * @param request
     * @returns ApiResponseListStaffOrderSummaryItem Paginated fulfillment queue retrieved successfully
     * @throws ApiError
     */
    public static listOrders1(
        request: StaffOrderFilterRequest,
    ): CancelablePromise<ApiResponseListStaffOrderSummaryItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/staff/orders',
            query: {
                'request': request,
            },
            errors: {
                400: `Bad Request: invalid pagination or status filter enum`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller is not an active internal STAFF, MANAGER, or ADMIN account`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * View order fulfillment detail
     * Retrieves detailed fulfillment information for any order by ID, including IAM customer contact summary, snapshotted delivery address/tracking, purchased line items, and payment reconciliation summary (excluding customer VietQR retry fields).
     * @param id Numeric purchase order identifier
     * @returns ApiResponseStaffOrderDetailResponse Order detail retrieved successfully
     * @throws ApiError
     */
    public static getOrderDetail1(
        id: number,
    ): CancelablePromise<ApiResponseStaffOrderDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/staff/orders/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: invalid or non-positive order id path parameter`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller is not an active internal STAFF, MANAGER, or ADMIN account`,
                404: `Not Found: order does not exist`,
                500: `Internal server error`,
            },
        });
    }
}
