/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CustomerDeviceWarrantyResponse } from '../models/CustomerDeviceWarrantyResponse';
import type { SubmitWarrantyClaimRequest } from '../models/SubmitWarrantyClaimRequest';
import type { WarrantyClaimResponse } from '../models/WarrantyClaimResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CustomerDeviceWarrantyService {
    /**
     * View device warranty coverage and claim history
     * Retrieves active warranty coverage, remaining warranty days, and full history of warranty claims for an LED device owned by the authenticated customer.
     * @param id Device instance ID
     * @returns CustomerDeviceWarrantyResponse Warranty coverage and claims retrieved successfully
     * @throws ApiError
     */
    public static getDeviceWarranty(
        id: number,
    ): CancelablePromise<CustomerDeviceWarrantyResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/devices/{id}/warranty',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid device ID format`,
                401: `Unauthorized — missing, expired, or invalid JWT`,
                403: `Forbidden — non-customer role or caller does not own the device`,
                404: `Device not found`,
            },
        });
    }
    /**
     * Submit a hardware warranty claim
     * Submits a new warranty claim for an active LED device owned by the authenticated customer. Verifies 180-day active warranty coverage, validates evidence media, prevents duplicate active claims, and creates a PENDING warranty ticket.
     * @param id Device instance ID
     * @param requestBody
     * @returns WarrantyClaimResponse Warranty claim created successfully
     * @throws ApiError
     */
    public static submitWarrantyClaim(
        id: number,
        requestBody: SubmitWarrantyClaimRequest,
    ): CancelablePromise<WarrantyClaimResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/devices/{id}/warranty',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failure, warranty not activated, or warranty expired`,
                401: `Unauthorized — missing, expired, or invalid JWT`,
                403: `Forbidden — non-customer role or caller does not own the device`,
                404: `Device not found`,
                409: `Active warranty claim already exists for this device`,
            },
        });
    }
}
