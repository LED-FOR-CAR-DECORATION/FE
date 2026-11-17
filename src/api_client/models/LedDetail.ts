/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Hardware specification and inventory details for an LED product
 */
export type LedDetail = {
    /**
     * LED model identifier
     */
    modelId: number;
    /**
     * LED hardware model name
     */
    modelName: string;
    /**
     * Technical specifications JSON object
     */
    specifications: Record<string, any>;
    /**
     * Current available hardware stock count
     */
    stockQuantity: number;
};

