/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedSpec } from './LedSpec';
/**
 * Parent LED hardware model details and technical specifications
 */
export type ModelInfo = {
    /**
     * Unique LED hardware model identifier
     */
    modelId: number;
    /**
     * Linked Store product identifier, or null when the model is not yet linked to a Store product
     */
    productId?: number | null;
    /**
     * Parent LED hardware model display name
     */
    modelName?: string | null;
    /**
     * LED model lifecycle status
     */
    status?: ModelInfo.status;
    /**
     * Structured technical specifications including canvas dimensions and ordered attributes
     */
    spec?: LedSpec;
};
export namespace ModelInfo {
    /**
     * LED model lifecycle status
     */
    export enum status {
        ACTIVE = 'ACTIVE',
        OUT_OF_STOCK = 'OUT_OF_STOCK',
        DEPRECATED = 'DEPRECATED',
    }
}

