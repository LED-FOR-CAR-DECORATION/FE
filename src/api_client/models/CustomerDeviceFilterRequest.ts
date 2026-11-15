/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Pagination parameters for listing the authenticated customer's registered LED hardware devices.
 */
export type CustomerDeviceFilterRequest = {
    /**
     * Zero-based page index (0 to 1,000,000)
     */
    page?: number;
    /**
     * Number of items per page (1 to 100)
     */
    size?: number;
};

