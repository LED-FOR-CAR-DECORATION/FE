/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Pagination and filter parameters for listing LED hardware models, combined with AND.
 */
export type LedModelFilterRequest = {
    /**
     * Zero-based page index (0 to 1,000,000)
     */
    page?: number;
    /**
     * Number of items per page (1 to 100)
     */
    size?: number;
    /**
     * Filter by LED model lifecycle status (ACTIVE, OUT_OF_STOCK, DEPRECATED)
     */
    status?: LedModelFilterRequest.status;
    /**
     * Filter by LED canvas width in pixels
     */
    widthPx?: number;
    /**
     * Filter by LED canvas height in pixels
     */
    heightPx?: number;
    /**
     * When true, returns only LED models not yet linked to any Store product (productId is null)
     */
    unlinkedToProductOnly?: boolean;
    /**
     * When true, returns only low-stock LED models (stockQuantity < 5)
     */
    lowStockOnly?: boolean;
    /**
     * Case-insensitive literal substring search on modelName; blank is ignored
     */
    keyword?: string;
};
export namespace LedModelFilterRequest {
    /**
     * Filter by LED model lifecycle status (ACTIVE, OUT_OF_STOCK, DEPRECATED)
     */
    export enum status {
        ACTIVE = 'ACTIVE',
        OUT_OF_STOCK = 'OUT_OF_STOCK',
        DEPRECATED = 'DEPRECATED',
    }
}

