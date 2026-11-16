/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Selectable option for a pricing configuration rule
 */
export type PricingOptionResponse = {
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
     * Display order sequence
     */
    displayOrder?: number;
};

