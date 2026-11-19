/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Bundled option details inside a pricing tier detail view
 */
export type BundledOptionResponse = {
    /**
     * Option ID
     */
    optionId?: number;
    /**
     * Configuration rule code
     */
    ruleKey?: string;
    /**
     * Configuration rule display name
     */
    configName?: string;
    /**
     * Option code
     */
    optionCode?: string;
    /**
     * Option display label
     */
    optionLabel?: string;
    /**
     * Pricing modifier calculation type
     */
    modifierType?: BundledOptionResponse.modifierType;
    /**
     * Standard individual option price in VND or percentage points
     */
    basePrice?: number;
};
export namespace BundledOptionResponse {
    /**
     * Pricing modifier calculation type
     */
    export enum modifierType {
        FLAT_ADD = 'FLAT_ADD',
        BASE_PERCENT = 'BASE_PERCENT',
        SUBTOTAL_PERCENT = 'SUBTOTAL_PERCENT',
    }
}

