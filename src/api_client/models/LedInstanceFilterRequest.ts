/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Pagination and filter parameters for listing and tracking physical LED instances, combined with AND.
 */
export type LedInstanceFilterRequest = {
    /**
     * Zero-based page index (0 to 1,000,000)
     */
    page?: number;
    /**
     * Number of items per page (1 to 100)
     */
    size?: number;
    /**
     * Filter by parent LED hardware model identifier
     */
    modelId?: number;
    /**
     * Filter by physical instance lifecycle status (IN_STOCK, IN_TRANSIT, BOUND, RETURNED, DECOMMISSIONED)
     */
    status?: LedInstanceFilterRequest.status;
    /**
     * Case-insensitive literal substring search on serialNumber or macAddress; blank is ignored
     */
    search?: string;
};
export namespace LedInstanceFilterRequest {
    /**
     * Filter by physical instance lifecycle status (IN_STOCK, IN_TRANSIT, BOUND, RETURNED, DECOMMISSIONED)
     */
    export enum status {
        IN_STOCK = 'IN_STOCK',
        IN_TRANSIT = 'IN_TRANSIT',
        BOUND = 'BOUND',
        RETURNED = 'RETURNED',
        DECOMMISSIONED = 'DECOMMISSIONED',
    }
}

