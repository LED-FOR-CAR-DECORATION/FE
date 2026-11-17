/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseListManagedWarrantyClaimResponse } from '../models/ApiResponseListManagedWarrantyClaimResponse';
import type { ApiResponseWarrantyClaimResponse } from '../models/ApiResponseWarrantyClaimResponse';
import type { ProcessWarrantyClaimRequest } from '../models/ProcessWarrantyClaimRequest';
import type { WarrantyClaimFilterRequest } from '../models/WarrantyClaimFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WarrantyClaimsService {
    /**
     * Adjudicate and update status of a warranty claim
     * Allows staff, managers, and admins to transition a warranty claim from PENDING to APPROVED/REJECTED, or from APPROVED to COMPLETED/REJECTED. Non-blank resolutionNotes is required when rejecting or completing.
     * @param id
     * @param requestBody
     * @returns ApiResponseWarrantyClaimResponse Warranty claim status processed successfully
     * @throws ApiError
     */
    public static processWarrantyClaim(
        id: number,
        requestBody: ProcessWarrantyClaimRequest,
    ): CancelablePromise<ApiResponseWarrantyClaimResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/management/staff/warranty-claims/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: invalid ID or missing resolutionNotes for rejection/completion`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold STAFF, MANAGER, or ADMIN role`,
                404: `Not Found: warranty claim does not exist`,
                409: `Conflict: invalid status transition according to warranty state machine`,
            },
        });
    }
    /**
     * Adjudicate and update status of a warranty claim
     * Allows staff, managers, and admins to transition a warranty claim from PENDING to APPROVED/REJECTED, or from APPROVED to COMPLETED/REJECTED. Non-blank resolutionNotes is required when rejecting or completing.
     * @param id
     * @param requestBody
     * @returns ApiResponseWarrantyClaimResponse Warranty claim status processed successfully
     * @throws ApiError
     */
    public static processWarrantyClaim1(
        id: number,
        requestBody: ProcessWarrantyClaimRequest,
    ): CancelablePromise<ApiResponseWarrantyClaimResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/management/manager/warranty-claims/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: invalid ID or missing resolutionNotes for rejection/completion`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold STAFF, MANAGER, or ADMIN role`,
                404: `Not Found: warranty claim does not exist`,
                409: `Conflict: invalid status transition according to warranty state machine`,
            },
        });
    }
    /**
     * List and search warranty claims across the system
     * Retrieves a paginated list of warranty claims with enriched customer and device metadata. Supports filtering by lifecycle status and keyword search across device serial number, customer name, email, phone, or defect description.
     * @param filter
     * @returns ApiResponseListManagedWarrantyClaimResponse Paginated warranty claims retrieved successfully
     * @throws ApiError
     */
    public static listWarrantyClaims(
        filter: WarrantyClaimFilterRequest,
    ): CancelablePromise<ApiResponseListManagedWarrantyClaimResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/staff/warranty-claims',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Bad Request: invalid pagination or filter parameters`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold STAFF, MANAGER, or ADMIN role`,
            },
        });
    }
    /**
     * List and search warranty claims across the system
     * Retrieves a paginated list of warranty claims with enriched customer and device metadata. Supports filtering by lifecycle status and keyword search across device serial number, customer name, email, phone, or defect description.
     * @param filter
     * @returns ApiResponseListManagedWarrantyClaimResponse Paginated warranty claims retrieved successfully
     * @throws ApiError
     */
    public static listWarrantyClaims1(
        filter: WarrantyClaimFilterRequest,
    ): CancelablePromise<ApiResponseListManagedWarrantyClaimResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/manager/warranty-claims',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Bad Request: invalid pagination or filter parameters`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not hold STAFF, MANAGER, or ADMIN role`,
            },
        });
    }
}
