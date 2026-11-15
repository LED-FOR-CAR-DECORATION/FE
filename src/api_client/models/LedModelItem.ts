/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedSpec } from './LedSpec';
/**
 * Summary representation of an LED hardware model
 */
export type LedModelItem = {
    /**
     * Unique LED hardware model identifier
     */
    modelId: number;
    /**
     * Linked Store product identifier, or null when the model is not yet linked to a Store product
     */
    productId?: number | null;
    /**
     * LED hardware model display name
     */
    modelName: string;
    /**
     * Available sellable warehouse stock quantity
     */
    stockQuantity: number;
    /**
     * Whether current stockQuantity is below the low-stock alert threshold (< 5)
     */
    isLowStock: boolean;
    /**
     * LED model lifecycle status
     */
    status: LedModelItem.status;
    /**
     * Structured technical specifications including canvas dimensions and ordered attributes
     */
    spec: LedSpec;
};
export namespace LedModelItem {
    /**
     * LED model lifecycle status
     */
    export enum status {
        ACTIVE = 'ACTIVE',
        OUT_OF_STOCK = 'OUT_OF_STOCK',
        DEPRECATED = 'DEPRECATED',
    }
}

