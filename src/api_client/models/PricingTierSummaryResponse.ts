/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary of a commission pricing tier with bundle savings and revision quota
 */
export type PricingTierSummaryResponse = {
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
     * Included revision quota
     */
    maxRevisions?: number;
    /**
     * Flag indicating if this is the dynamic CUSTOM configurator
     */
    isCustom?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * List of option IDs bundled in this tier for client lookup against the rules list
     */
    bundledOptionIds?: Array<number>;
};

