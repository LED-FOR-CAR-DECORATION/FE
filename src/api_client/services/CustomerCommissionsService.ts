/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCustomerCommissionDetailResponse } from '../models/ApiResponseCustomerCommissionDetailResponse';
import type { ApiResponseListCustomerCommissionSummaryItem } from '../models/ApiResponseListCustomerCommissionSummaryItem';
import type { CustomerCommissionFilterRequest } from '../models/CustomerCommissionFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CustomerCommissionsService {
    /**
     * View personal commission request details
     * Retrieves the complete customer-facing detail view of a commission request owned by the authenticated CUSTOMER account, including requirements, snapshotted pricing breakdown, reference attachments, `activePaymentCode` when payment is pending, and Staff-approved delivered previews (excluding unapproved internal Designer drafts).
     * @param id Unique commission request identifier
     * @returns ApiResponseCustomerCommissionDetailResponse Commission request details retrieved successfully
     * @throws ApiError
     */
    public static getMyCommissionDetail(
        id: number,
    ): CancelablePromise<ApiResponseCustomerCommissionDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/commissions/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid or non-positive commission id path parameter`,
                401: `Missing, expired, or invalid JWT access token`,
                403: `Caller does not hold the CUSTOMER role or does not own the requested commission`,
                404: `Commission request does not exist`,
                500: `Unexpected internal server error`,
            },
        });
    }
    /**
     * List personal commission requests
     * Retrieves a paginated list of custom artwork commission requests owned by the authenticated CUSTOMER account, supporting optional status filtering and sorting by submission date (`createdAt` ASC or DESC).
     * @param filter
     * @returns ApiResponseListCustomerCommissionSummaryItem Paginated list of personal commission requests retrieved successfully
     * @throws ApiError
     */
    public static listMyCommissions(
        filter: CustomerCommissionFilterRequest,
    ): CancelablePromise<ApiResponseListCustomerCommissionSummaryItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/commissions/my',
            query: {
                ...filter,
            },
            errors: {
                400: `Invalid pagination, status enum, or sortDirection query parameter`,
                401: `Missing, expired, or invalid JWT access token`,
                403: `Authenticated caller does not hold the CUSTOMER role`,
                500: `Unexpected internal server error`,
            },
        });
    }
}
