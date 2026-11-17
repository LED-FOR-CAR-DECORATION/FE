/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for claiming and permanently binding a physical LED device via factory QR scan
 */
export type ClaimDeviceRequest = {
    /**
     * Compact HMAC-SHA256 signed factory QR JSON payload string scanned from the hardware unit
     */
    qrPayload: string;
    /**
     * Optional custom display name for the claimed device; defaults to the LED model name when omitted or blank
     */
    deviceName?: string | null;
};

