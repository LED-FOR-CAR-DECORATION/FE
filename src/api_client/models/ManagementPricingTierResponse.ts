/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BundledOptionResponse } from './BundledOptionResponse';
/**
 * Management pricing preset/tier detail including configuration, active status, trigger options, and bundled options
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
     * Informational CUSTOM mode calculated price for identical options in VND
     */
    customCalculatedPrice?: number;
    /**
     * Informational savings amount in VND compared to CUSTOM mode
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
     * Optional option IDs that filter/display this preset (empty applies globally)
     */
    triggerOptionIds?: Array<number>;
    /**
     * List of bundled rule options included in this tier
     */
    includedOptions?: Array<BundledOptionResponse>;
    /**
     * List of option IDs bundled in this tier for fast management lookup
     */
    includedOptionIds?: Array<number>;
};

