/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCustomerDeviceDetailResponse } from '../models/ApiResponseCustomerDeviceDetailResponse';
import type { ApiResponseListCustomerDeviceItem } from '../models/ApiResponseListCustomerDeviceItem';
import type { ClaimDeviceRequest } from '../models/ClaimDeviceRequest';
import type { ClaimDeviceResponse } from '../models/ClaimDeviceResponse';
import type { CustomerDeviceFilterRequest } from '../models/CustomerDeviceFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CustomerDevicesService {
    /**
     * Claim an LED device via factory QR code
     * Verifies the cryptographic HMAC-SHA256 signature embedded in the scanned factory QR payload, confirms the device is not already bound, verifies that the physical unit was fulfilled for a DELIVERED or COMPLETED order owned by the authenticated customer, and atomically binds the device to the customer's account while activating its 180-day warranty.
     * @param requestBody
     * @returns ClaimDeviceResponse Device claimed and warranty activated successfully
     * @throws ApiError
     */
    public static claimDevice(
        requestBody: ClaimDeviceRequest,
    ): CancelablePromise<ClaimDeviceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/devices/claim',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation error or invalid/tampered QR code signature (INVALID_DEVICE_QR)`,
                401: `Unauthorized — missing, expired, or invalid JWT token`,
                403: `Forbidden — requires CUSTOMER role, or device does not belong to an order owned by this customer (DEVICE_OWNERSHIP_MISMATCH)`,
                404: `LED hardware instance not found (LED_INSTANCE_NOT_FOUND)`,
                409: `Conflict — device is already bound (DEVICE_ALREADY_BOUND) or the associated order is not yet DELIVERED/COMPLETED (ORDER_NOT_DELIVERED_YET)`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List customer owned LED devices
     * Returns a paginated list of physical LED hardware devices currently bound to the authenticated CUSTOMER account, ordered from newest to oldest by pairing timestamp (`boundAt DESC`). Includes device identifiers, BLE MAC address, display name, lifecycle status, hardware model resolution (`widthPx` x `heightPx`), reported firmware ID, and computed warranty status.
     * @param filter
     * @returns ApiResponseListCustomerDeviceItem Paginated list of customer-owned LED hardware devices retrieved successfully
     * @throws ApiError
     */
    public static listDevices(
        filter: CustomerDeviceFilterRequest,
    ): CancelablePromise<ApiResponseListCustomerDeviceItem> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/devices',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Invalid pagination parameters`,
                401: `Missing, expired, or invalid JWT access token`,
                403: `Authenticated user does not hold the CUSTOMER role`,
                500: `Unexpected internal server error`,
            },
        });
    }
    /**
     * Get customer owned LED device detail
     * Returns the full hardware profile, linked parent LED model specifications (including deprecated models for already-owned hardware), calculated warranty coverage status, and original purchase order fulfillment linkage for a single device owned by the authenticated CUSTOMER account. Factory QR payload secrets and live BLE state are omitted.
     * @param id Unique LED hardware device identifier (instance ID)
     * @returns ApiResponseCustomerDeviceDetailResponse Customer-owned LED hardware device details retrieved successfully
     * @throws ApiError
     */
    public static getDeviceDetail(
        id: number,
    ): CancelablePromise<ApiResponseCustomerDeviceDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/devices/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid device path identifier`,
                401: `Missing, expired, or invalid JWT access token`,
                403: `Caller lacks the CUSTOMER role or does not own the requested LED hardware device`,
                404: `Requested LED hardware device was not found`,
                500: `Unexpected internal server error`,
            },
        });
    }
}
