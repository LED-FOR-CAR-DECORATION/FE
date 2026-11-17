/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Lightweight management summary of a commission pricing preset or CUSTOM mode
 */
export type ManagementPricingTierSummaryResponse = {
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
     * Number of rule options bundled in this tier
     */
    includedOptionCount?: number;
};

