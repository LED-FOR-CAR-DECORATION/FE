/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatePricingOptionRequest } from './CreatePricingOptionRequest';
/**
 * Request payload for creating a custom commission pricing rule
 */
export type CreatePricingRuleRequest = {
    /**
     * Unique rule configuration code/key
     */
    configCode: string;
    /**
     * Display name of the rule
     */
    configName: string;
    /**
     * Detailed prompt or helper description
     */
    description?: string;
    /**
     * Selection cardinality or input primitive type
     */
    selectionType: CreatePricingRuleRequest.selectionType;
    /**
     * UI component presentation type
     */
    uiType: CreatePricingRuleRequest.uiType;
    /**
     * Whether this rule contributes to the Base price bucket used by BASE_PERCENT modifiers (allowed on FLAT_ADD choice rules only)
     */
    isBasePrice?: boolean | null;
    /**
     * Minimum allowed count when selectionType is QUANTITY
     */
    minQuantity?: number | null;
    /**
     * Maximum allowed count when selectionType is QUANTITY
     */
    maxQuantity?: number | null;
    /**
     * Whether selection is mandatory
     */
    isRequired?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * Parent option ID this rule conditionally depends on (acyclic multi-level up to depth 5)
     */
    dependsOnOptionId?: number | null;
    /**
     * List of selectable options configured for this rule
     */
    options?: Array<CreatePricingOptionRequest>;
};
export namespace CreatePricingRuleRequest {
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

