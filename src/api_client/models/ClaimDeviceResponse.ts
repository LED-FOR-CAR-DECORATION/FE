/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedSpec } from './LedSpec';
/**
 * Response returned after permanently binding an LED hardware device to the customer account and starting its 180-day warranty
 */
export type ClaimDeviceResponse = {
    /**
     * Unique LED hardware device instance identifier
     */
    deviceId: number;
    /**
     * Factory-assigned unique serial number
     */
    serialNumber: string;
    /**
     * Uppercase colon-separated ESP32 MAC address
     */
    macAddress: string;
    /**
     * Assigned display name for the device (custom or model name fallback)
     */
    deviceName: string;
    /**
     * Parent LED hardware model identifier
     */
    modelId: number;
    /**
     * Parent LED hardware model display name
     */
    modelName?: string | null;
    /**
     * Structured technical specifications including canvas dimensions and ordered attributes
     */
    spec: LedSpec;
    /**
     * ISO-8601 UTC timestamp when the device was permanently bound and warranty started
     */
    boundAt: string;
    /**
     * ISO-8601 UTC timestamp when the 180-day hardware warranty expires
     */
    warrantyExpiresAt: string;
};

