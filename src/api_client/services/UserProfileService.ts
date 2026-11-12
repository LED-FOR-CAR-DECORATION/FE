/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCurrentProfileResponse } from '../models/ApiResponseCurrentProfileResponse';
import type { UpdateCurrentProfileRequest } from '../models/UpdateCurrentProfileRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserProfileService {
    /**
     * Get the current user's profile
     * Identity comes from the authenticated JWT subject. Returns current database profile and roles; credentials and security fields are excluded.
     * @returns ApiResponseCurrentProfileResponse ApiResponse<CurrentProfileResponse>
     * @throws ApiError
     */
    public static me(): CancelablePromise<ApiResponseCurrentProfileResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/me',
            errors: {
                401: `Missing or invalid authentication`,
                403: `Inactive account`,
                404: `Account or profile missing`,
                500: `Unexpected failure`,
            },
        });
    }
    /**
     * Update the current user's profile
     * Replace name, phone and avatar for the authenticated account. Null or blank phone/avatar clears that profile value. Account email, credentials and roles cannot be changed.
     * @param requestBody
     * @returns ApiResponseCurrentProfileResponse Updated profile inside ApiResponse<CurrentProfileResponse>
     * @throws ApiError
     */
    public static update(
        requestBody: UpdateCurrentProfileRequest,
    ): CancelablePromise<ApiResponseCurrentProfileResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/users/me',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid name, phone, avatar or JSON`,
                401: `Authentication required`,
                403: `Inactive account`,
                404: `Account or profile missing`,
                500: `Unexpected storage failure`,
            },
        });
    }
}
