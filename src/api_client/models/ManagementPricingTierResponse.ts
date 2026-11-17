/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BundledOptionResponse } from './BundledOptionResponse';
/**
 * Management pricing tier detail including configuration, active status, and bundled options
 */
export type ManagementPricingTierResponse = {
    /**
     * Unique tier ID
     */
    tierId?: number;
    /**
     * Unique tier code identifier
     */
    tierCode?: string;
    /**
     * Display name of the tier
     */
    tierName?: string;
    /**
     * Marketing and deliverable description
     */
    description?: string;
    /**
     * Base tier price in VND
     */
    basePrice?: number;
    /**
     * Calculated custom builder price for identical options in VND
     */
    customCalculatedPrice?: number;
    /**
     * Savings amount in VND compared to custom configurator
     */
    savingsAmount?: number;
    /**
     * Discount percentage applied to bundled options
     */
    discountPercent?: number;
    /**
     * Included revision quota
     */
    maxRevisions?: number;
    /**
     * Extra revision fee percentage surcharge (default 10%)
     */
    extraRevisionFeePercent?: number;
    /**
     * Flag indicating if this is the dynamic CUSTOM configurator
     */
    isCustom?: boolean;
    /**
     * Whether the tier is active and visible to customers
     */
    isActive?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * List of bundled rule options included in this tier
     */
    includedOptions?: Array<BundledOptionResponse>;
    /**
     * List of option IDs bundled in this tier for fast management lookup
     */
    includedOptionIds?: Array<number>;
};

