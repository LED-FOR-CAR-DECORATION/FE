/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for creating an option within a commission pricing rule
 */
export type CreatePricingOptionRequest = {
    /**
     * Unique option code within the rule
     */
    optionCode: string;
    /**
     * Display label of the option
     */
    optionLabel: string;
    /**
     * Optional custom value string
     */
    optionValue?: string | null;
    /**
     * Price surcharge in VND (must be non-negative)
     */
    basePrice: number;
    /**
     * Whether this option is selected by default
     */
    isDefault?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
};

