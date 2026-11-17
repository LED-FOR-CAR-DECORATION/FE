/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ManagementPricingRuleSummaryResponse } from './ManagementPricingRuleSummaryResponse';
import type { ManagementPricingTierSummaryResponse } from './ManagementPricingTierSummaryResponse';
/**
 * Commission pricing overview response for store managers and administrators
 */
export type ManagementCommissionPricingResponse = {
    /**
     * Summary list of all pricing tiers (preset packages and custom tier, active and inactive)
     */
    tiers?: Array<ManagementPricingTierSummaryResponse>;
    /**
     * Summary list of all configuration rules (system and custom rules, active and inactive)
     */
    rules?: Array<ManagementPricingRuleSummaryResponse>;
};

