/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for manually transitioning an order status by internal staff
 */
export type UpdateStaffOrderStatusRequest = {
    /**
     * Target order status allowed for manual staff transitions (CANCELLED normalizes to CANCELED)
     */
    status: UpdateStaffOrderStatusRequest.status;
};
export namespace UpdateStaffOrderStatusRequest {
    /**
     * Target order status allowed for manual staff transitions (CANCELLED normalizes to CANCELED)
     */
    export enum status {
        PROCESSING = 'PROCESSING',
        COMPLETED = 'COMPLETED',
        CANCELED = 'CANCELED',
        CANCELLED = 'CANCELLED',
    }
}

