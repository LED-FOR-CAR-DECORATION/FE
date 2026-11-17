/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Management option details including active status, modifier type, base price, and default selection
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
     * Pricing modifier calculation type
     */
    modifierType?: ManagementPricingOptionResponse.modifierType;
    /**
     * Fixed VND surcharge (FLAT_ADD) or percentage points (BASE_PERCENT / SUBTOTAL_PERCENT)
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
export namespace ManagementPricingOptionResponse {
    /**
     * Pricing modifier calculation type
     */
    export enum modifierType {
        FLAT_ADD = 'FLAT_ADD',
        BASE_PERCENT = 'BASE_PERCENT',
        SUBTOTAL_PERCENT = 'SUBTOTAL_PERCENT',
    }
}

