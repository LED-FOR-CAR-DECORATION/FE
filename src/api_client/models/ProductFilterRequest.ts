/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Filter parameters for browsing products in store catalog
 */
export type ProductFilterRequest = {
    /**
     * Filter by product type
     */
    productType?: ProductFilterRequest.productType;
    /**
     * Filter by tag/category name
     */
    categoryTag?: string;
    /**
     * Minimum price
     */
    minPrice?: number;
    /**
     * Maximum price
     */
    maxPrice?: number;
    /**
     * Page number (0-indexed)
     */
    page?: number;
    /**
     * Page size (1-100)
     */
    size?: number;
};
export namespace ProductFilterRequest {
    /**
     * Filter by product type
     */
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
    }
}

