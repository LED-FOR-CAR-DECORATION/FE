/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary of a commission pricing preset or CUSTOM mode with bundle comparison and revision quota
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
     * Informational CUSTOM mode calculated price for identical options in VND
     */
    customCalculatedPrice?: number;
    /**
     * Informational savings amount in VND compared to CUSTOM mode
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
     * Optional option IDs that filter/display this preset (empty means available globally)
     */
    triggerOptionIds?: Array<number>;
    /**
     * List of option IDs bundled in this tier for client lookup against the rules list
     */
    bundledOptionIds?: Array<number>;
};

