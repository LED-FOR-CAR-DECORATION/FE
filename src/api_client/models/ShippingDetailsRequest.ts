/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inline shipping recipient and coordinate details
 */
export type ShippingDetailsRequest = {
    /**
     * Recipient full name
     */
    recipientName: string;
    /**
     * Recipient phone number
     */
    recipientPhone: string;
    /**
     * Full shipping street address
     */
    fullAddress: string;
    /**
     * Delivery latitude coordinate (-90 to 90)
     */
    latitude: number;
    /**
     * Delivery longitude coordinate (-180 to 180)
     */
    longitude: number;
};

