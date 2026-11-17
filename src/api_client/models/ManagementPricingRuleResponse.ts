/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ManagementPricingOptionResponse } from './ManagementPricingOptionResponse';
/**
 * Management pricing configuration rule detail including options, primitive bounds, active status, and system lock flags
 */
export type ManagementPricingRuleResponse = {
    /**
     * Unique configuration rule ID
     */
    configId?: number;
    /**
     * Unique rule code identifier
     */
    configCode?: string;
    /**
     * Display name of the rule
     */
    configName?: string;
    /**
     * Detailed prompt or helper description
     */
    description?: string;
    /**
     * Selection cardinality or input primitive type
     */
    selectionType?: ManagementPricingRuleResponse.selectionType;
    /**
     * UI component presentation type
     */
    uiType?: ManagementPricingRuleResponse.uiType;
    /**
     * Whether this rule contributes to the Base price bucket
     */
    isBasePrice?: boolean;
    /**
     * Minimum allowed quantity when selectionType is QUANTITY
     */
    minQuantity?: number | null;
    /**
     * Maximum allowed quantity when selectionType is QUANTITY
     */
    maxQuantity?: number | null;
    /**
     * Whether selection is mandatory
     */
    isRequired?: boolean;
    /**
     * Whether this is a locked system rule
     */
    isSystem?: boolean;
    /**
     * Whether the rule is active and visible to customers
     */
    isActive?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * Parent option ID this rule depends on (null if root rule)
     */
    dependsOnOptionId?: number | null;
    /**
     * Parent rule code this rule depends on
     */
    dependsOnRuleKey?: string | null;
    /**
     * Parent option code this rule depends on
     */
    dependsOnOptionCode?: string | null;
    /**
     * All options configured for this rule (both active and inactive)
     */
    options?: Array<ManagementPricingOptionResponse>;
};
export namespace ManagementPricingRuleResponse {
    /**
     * Selection cardinality or input primitive type
     */
    export enum selectionType {
        SINGLE_SELECT = 'SINGLE_SELECT',
        MULTI_SELECT = 'MULTI_SELECT',
        QUANTITY = 'QUANTITY',
        TEXT_INPUT = 'TEXT_INPUT',
    }
    /**
     * UI component presentation type
     */
    export enum uiType {
        RADIO = 'RADIO',
        DROPDOWN = 'DROPDOWN',
        CHECKBOX = 'CHECKBOX',
        NUMBER = 'NUMBER',
        TEXT = 'TEXT',
    }
}

