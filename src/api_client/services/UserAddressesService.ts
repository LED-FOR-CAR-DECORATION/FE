/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddUserAddressRequest } from '../models/AddUserAddressRequest';
import type { UpdateUserAddressRequest } from '../models/UpdateUserAddressRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserAddressesService {
    /**
     * Update an existing delivery address for the current customer
     * Updates recipient contact details, Goong Map formatted full address, and WGS84 coordinates for a saved delivery address owned by the authenticated active CUSTOMER account while preserving the existing isDefault flag.
     * @param id Positive identifier of the saved delivery address
     * @param requestBody
     * @returns any Updated address inside ApiResponse<UserAddressResponse>
     * @throws ApiError
     */
    public static updateAddress(
        id: number,
        requestBody: UpdateUserAddressRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/users/me/addresses/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid address id, validation failed, or malformed JSON payload`,
                401: `Missing, expired, or invalid authentication`,
                403: `Caller is not an active CUSTOMER account`,
                404: `Delivery address not found/not owned, or user account not found`,
                500: `Unexpected storage or server failure`,
            },
        });
    }
    /**
     * Soft delete a delivery address for the current customer
     * Soft deletes a saved delivery address owned by the authenticated active CUSTOMER account without breaking existing order references. When deleting the default address, the newest remaining active address is automatically promoted to default.
     * @param id Positive identifier of the saved delivery address
     * @returns void
     * @throws ApiError
     */
    public static deleteAddress(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/me/addresses/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid address id parameter`,
                401: `Missing, expired, or invalid authentication`,
                403: `Caller is not an active CUSTOMER account`,
                404: `Delivery address not found/not owned, or user account not found`,
                500: `Unexpected storage or server failure`,
            },
        });
    }
    /**
     * List the current customer's saved delivery addresses
     * Returns saved delivery addresses owned by the authenticated active CUSTOMER account ordered default-first, then by latest update/creation timestamp descending.
     * @returns any ApiResponse<List<UserAddressResponse>>
     * @throws ApiError
     */
    public static listAddresses(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/me/addresses',
            errors: {
                401: `Missing, expired, or invalid authentication`,
                403: `Caller is not an active CUSTOMER account`,
                404: `Authenticated user account not found`,
                500: `Unexpected storage or server failure`,
            },
        });
    }
    /**
     * Add a new delivery address for the current customer
     * Saves a customer delivery address using recipient contact details, Goong Map formatted full address, and WGS84 coordinates. The first address is automatically marked default, and setting isDefault=true clears existing defaults.
     * @param requestBody
     * @returns any Created address inside ApiResponse<UserAddressResponse>
     * @throws ApiError
     */
    public static addAddress(
        requestBody: AddUserAddressRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/me/addresses',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed or malformed JSON payload`,
                401: `Missing, expired, or invalid authentication`,
                403: `Caller is not an active CUSTOMER account`,
                404: `Authenticated user account not found`,
                500: `Unexpected storage or server failure`,
            },
        });
    }
    /**
     * Set a saved delivery address as the current customer's default address
     * Marks a saved active delivery address owned by the authenticated active CUSTOMER account as the default shipping address, clearing any previous default within a single transaction. Calling on an address that is already default is idempotent.
     * @param id Positive identifier of the saved delivery address
     * @returns any Default address updated inside ApiResponse<UserAddressResponse>
     * @throws ApiError
     */
    public static setDefaultAddress(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/me/addresses/{id}/default',
            path: {
                'id': id,
            },
            errors: {
                400: `Invalid address id parameter`,
                401: `Missing, expired, or invalid authentication`,
                403: `Caller is not an active CUSTOMER account`,
                404: `Delivery address not found/not owned, or user account not found`,
                500: `Unexpected storage or server failure`,
            },
        });
    }
}
