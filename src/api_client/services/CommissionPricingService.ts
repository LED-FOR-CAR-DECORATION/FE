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
     * Retrieves active presets (BASIC, ADVANCED), the dynamic CUSTOM mode, and active ordered pricing rules built with reusable primitives (SINGLE_SELECT, MULTI_SELECT, QUANTITY, TEXT_INPUT) and deterministic modifiers (FLAT_ADD, BASE_PERCENT, SUBTOTAL_PERCENT).
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
