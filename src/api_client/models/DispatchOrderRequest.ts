/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for dispatching a packaged physical order to AhaMove
 */
export type DispatchOrderRequest = {
    /**
     * AhaMove service ID (e.g., SGN-BIKE) or group service ID (e.g., BIKE)
     */
    serviceId: string;
    /**
     * Optional delivery instructions for the driver
     */
    remarks?: string | null;
    /**
     * Optional parcel weight in kilograms for AhaMove package_detail
     */
    weight?: number | null;
};

