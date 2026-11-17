/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PricingOptionResponse } from './PricingOptionResponse';
/**
 * Commission pricing configuration rule
 */
export type PricingRuleResponse = {
    /**
     * Unique configuration rule ID
     */
    configId?: number;
    /**
     * Unique rule key code
     */
    ruleKey?: string;
    /**
     * Display name of the rule
     */
    configName?: string;
    /**
     * Detailed prompt or helper description
     */
    description?: string;
    /**
     * Selection cardinality type
     */
    selectionType?: PricingRuleResponse.selectionType;
    /**
     * UI component presentation type
     */
    uiType?: PricingRuleResponse.uiType;
    /**
     * Whether selection is mandatory
     */
    isRequired?: boolean;
    /**
     * Whether this is a locked system rule
     */
    isSystem?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * Parent option ID this rule depends on (null if root rule)
     */
    dependsOnOptionId?: number | null;
    /**
     * Parent rule key this rule depends on
     */
    dependsOnRuleKey?: string | null;
    /**
     * Parent option code this rule depends on
     */
    dependsOnOptionCode?: string | null;
    /**
     * Available selectable options for this rule
     */
    options?: Array<PricingOptionResponse>;
};
export namespace PricingRuleResponse {
    /**
     * Selection cardinality type
     */
    export enum selectionType {
        SINGLE_SELECT = 'SINGLE_SELECT',
        MULTI_SELECT = 'MULTI_SELECT',
        TEXT_INPUT = 'TEXT_INPUT',
    }
    /**
     * UI component presentation type
     */
    export enum uiType {
        RADIO = 'RADIO',
        DROPDOWN = 'DROPDOWN',
        CHECKBOX = 'CHECKBOX',
        TEXT = 'TEXT',
    }
}

