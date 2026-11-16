/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PricingRuleResponse } from './PricingRuleResponse';
import type { PricingTierSummaryResponse } from './PricingTierSummaryResponse';
/**
 * Public response containing commission pricing tier summaries and active configuration rules
 */
export type PublicCommissionPricingResponse = {
    /**
     * List of active commission pricing tier summaries including bundle savings
     */
    tiers?: Array<PricingTierSummaryResponse>;
    /**
     * List of active pricing configuration rules ordered by displayOrder
     */
    rules?: Array<PricingRuleResponse>;
};

