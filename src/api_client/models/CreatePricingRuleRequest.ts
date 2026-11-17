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
     * Selection cardinality type
     */
    selectionType: CreatePricingRuleRequest.selectionType;
    /**
     * UI component presentation type
     */
    uiType: CreatePricingRuleRequest.uiType;
    /**
     * Whether selection is mandatory
     */
    isRequired?: boolean;
    /**
     * Display order sequence
     */
    displayOrder?: number;
    /**
     * Parent option ID this rule conditionally depends on
     */
    dependsOnOptionId?: number | null;
    /**
     * List of selectable options configured for this rule
     */
    options?: Array<CreatePricingOptionRequest>;
};
export namespace CreatePricingRuleRequest {
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

