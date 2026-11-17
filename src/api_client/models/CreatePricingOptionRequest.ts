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
     * Deterministic price calculation modifier (FLAT_ADD, BASE_PERCENT, SUBTOTAL_PERCENT). Defaults to FLAT_ADD.
     */
    modifierType?: CreatePricingOptionRequest.modifierType;
    /**
     * Price surcharge in VND (for FLAT_ADD / unit rate) or percentage points (for BASE_PERCENT / SUBTOTAL_PERCENT)
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
export namespace CreatePricingOptionRequest {
    /**
     * Deterministic price calculation modifier (FLAT_ADD, BASE_PERCENT, SUBTOTAL_PERCENT). Defaults to FLAT_ADD.
     */
    export enum modifierType {
        FLAT_ADD = 'FLAT_ADD',
        BASE_PERCENT = 'BASE_PERCENT',
        SUBTOTAL_PERCENT = 'SUBTOTAL_PERCENT',
    }
}

