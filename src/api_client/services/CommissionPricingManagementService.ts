/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatePricingRuleRequest } from '../models/CreatePricingRuleRequest';
import type { ManagementCommissionPricingResponse } from '../models/ManagementCommissionPricingResponse';
import type { ManagementPricingRuleResponse } from '../models/ManagementPricingRuleResponse';
import type { ManagementPricingTierResponse } from '../models/ManagementPricingTierResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommissionPricingManagementService {
    /**
     * Create custom commission pricing rule
     * Creates a new custom commission pricing rule with associated options, validating invariants and uniqueness.
     * @param requestBody
     * @returns ManagementPricingRuleResponse Custom pricing rule created successfully
     * @throws ApiError
     */
    public static createCustomPricingRule(
        requestBody: CreatePricingRuleRequest,
    ): CancelablePromise<ManagementPricingRuleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/commissions/pricing/rules',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed or invalid rule configuration`,
                401: `Unauthenticated or missing/invalid token`,
                403: `Access denied: requires MANAGER or ADMIN role`,
                409: `Duplicate rule code conflict`,
                500: `Internal server error occurred`,
            },
        });
    }
    /**
     * View commission pricing configuration overview
     * Retrieves lightweight summary lists of all pricing tiers and configuration rules (active and inactive) for administrative management.
     * @returns ManagementCommissionPricingResponse Commission pricing configuration overview retrieved successfully
     * @throws ApiError
     */
    public static getManagementPricing(): CancelablePromise<ManagementCommissionPricingResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/commissions/pricing',
            errors: {
                401: `Unauthenticated or missing/invalid token`,
                403: `Access denied: requires MANAGER or ADMIN role`,
                500: `Internal server error occurred`,
            },
        });
    }
    /**
     * View management pricing tier detail
     * Retrieves full details of a specific commission pricing tier, including bundled rule options and discount breakdown.
     * @param tierId Unique ID of the pricing tier
     * @returns ManagementPricingTierResponse Pricing tier detail retrieved successfully
     * @throws ApiError
     */
    public static getManagementPricingTierDetail(
        tierId: number,
    ): CancelablePromise<ManagementPricingTierResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/commissions/pricing/tiers/{tierId}',
            path: {
                'tierId': tierId,
            },
            errors: {
                400: `Invalid path variable tierId`,
                401: `Unauthenticated or missing/invalid token`,
                403: `Access denied: requires MANAGER or ADMIN role`,
                404: `Pricing tier not found`,
                500: `Internal server error occurred`,
            },
        });
    }
    /**
     * View management pricing rule detail
     * Retrieves full details of a specific commission pricing configuration rule, including all options and dependency metadata.
     * @param ruleId Unique ID of the pricing configuration rule
     * @returns ManagementPricingRuleResponse Pricing rule detail retrieved successfully
     * @throws ApiError
     */
    public static getManagementPricingRuleDetail(
        ruleId: number,
    ): CancelablePromise<ManagementPricingRuleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/commissions/pricing/rules/{ruleId}',
            path: {
                'ruleId': ruleId,
            },
            errors: {
                400: `Invalid path variable ruleId`,
                401: `Unauthenticated or missing/invalid token`,
                403: `Access denied: requires MANAGER or ADMIN role`,
                404: `Pricing rule not found`,
                500: `Internal server error occurred`,
            },
        });
    }
}
