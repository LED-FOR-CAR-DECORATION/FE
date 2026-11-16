/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PublicCommissionPricingResponse } from '../models/PublicCommissionPricingResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommissionPricingService {
    /**
     * Get commission pricing tiers and rules
     * Retrieves all active preset packages (BASIC, ADVANCED) and the dynamic CUSTOM tier alongside active system and manager-created rules with bundle discount calculations.
     * @returns PublicCommissionPricingResponse Commission pricing tiers and rules retrieved successfully
     * @throws ApiError
     */
    public static getCommissionPricing(): CancelablePromise<PublicCommissionPricingResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/commissions/pricing',
            errors: {
                500: `Internal server error occurred`,
            },
        });
    }
}
