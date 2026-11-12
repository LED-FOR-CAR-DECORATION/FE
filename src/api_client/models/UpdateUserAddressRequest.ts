/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload to update an existing customer delivery address using Goong Map formatted address and WGS84 coordinates (preserves existing isDefault)
 */
export type UpdateUserAddressRequest = {
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
};

