/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseLedInstanceDetailResponse } from '../models/ApiResponseLedInstanceDetailResponse';
import type { ApiResponseListLedInstanceItem } from '../models/ApiResponseListLedInstanceItem';
import type { LedInstanceFilterRequest } from '../models/LedInstanceFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LedHardwareInventoryService {
    /**
     * List and track LED hardware instances
     * Retrieves a paginated list of individual physical ESP32 LED units across warehouse stock, transit, customer ownership, returns, and decommissioning for ADMIN and MANAGER users. Supports filtering by modelId, status, and case-insensitive serialNumber/macAddress search. Returns signed factory QR payloads only when status is neither BOUND nor DECOMMISSIONED.
     * @param filter
     * @returns ApiResponseListLedInstanceItem Paginated LED hardware instances retrieved successfully
     * @throws ApiError
     */
    public static listLedInstances(
        filter: LedInstanceFilterRequest,
    ): CancelablePromise<ApiResponseListLedInstanceItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/led-instances',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Bad Request: invalid pagination, modelId, or status filter parameter`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold ADMIN or MANAGER role`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get LED hardware instance details and factory QR payload
     * Retrieves full hardware unit details, parent LED model specifications, derived warranty status, linked fulfillment order info, customer owner summary (if bound), and signed factory QR payload for ADMIN and MANAGER users. Suppresses qrPayload when status is BOUND or DECOMMISSIONED.
     * @param id Numeric LED hardware instance identifier
     * @returns ApiResponseLedInstanceDetailResponse LED hardware instance detail retrieved successfully
     * @throws ApiError
     */
    public static getLedInstanceDetail(
        id: number,
    ): CancelablePromise<ApiResponseLedInstanceDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/led-instances/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: invalid or non-positive LED instance id`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold ADMIN or MANAGER role`,
                404: `Not Found: LED hardware instance does not exist`,
                500: `Internal server error`,
            },
        });
    }
}
