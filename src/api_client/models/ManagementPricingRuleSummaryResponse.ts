/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Lightweight management summary of a commission pricing rule
 */
export type ManagementPricingRuleSummaryResponse = {
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
     * Selection cardinality type
     */
    selectionType?: ManagementPricingRuleSummaryResponse.selectionType;
    /**
     * UI component presentation type
     */
    uiType?: ManagementPricingRuleSummaryResponse.uiType;
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
     * Total number of options configured for this rule
     */
    optionCount?: number;
};
export namespace ManagementPricingRuleSummaryResponse {
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

