/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload to save a new customer delivery address using Goong Map formatted address and WGS84 coordinates
 */
export type AddUserAddressRequest = {
    /**
     * Recipient full name, trimmed, 1 to 100 characters
     */
    recipientName: string;
    /**
     * Recipient phone number (8 to 15 digits with an optional leading plus)
     */
    recipientPhone: string;
    /**
     * Full formatted delivery address from Goong Map, trimmed, 1 to 255 characters
     */
    fullAddress: string;
    /**
     * WGS84 latitude coordinate (-90 to 90); rounded to 7 decimal places on save
     */
    latitude: number;
    /**
     * WGS84 longitude coordinate (-180 to 180); rounded to 7 decimal places on save
     */
    longitude: number;
    /**
     * Whether to set this address as default; the customer's first saved address is always set as default
     */
    isDefault?: boolean;
};

