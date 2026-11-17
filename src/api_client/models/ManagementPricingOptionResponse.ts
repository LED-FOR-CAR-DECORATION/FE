/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Management option details including active status, base price, and default selection
 */
export type ManagementPricingOptionResponse = {
    /**
     * Unique option ID
     */
    optionId?: number;
    /**
     * Unique option code within the rule
     */
    optionCode?: string;
    /**
     * Display label of the option
     */
    optionLabel?: string;
    /**
     * Price surcharge in VND
     */
    basePrice?: number;
    /**
     * Whether option is selected by default
     */
    isDefault?: boolean;
    /**
     * Whether the option is active and selectable by customers
     */
    isActive?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
};

