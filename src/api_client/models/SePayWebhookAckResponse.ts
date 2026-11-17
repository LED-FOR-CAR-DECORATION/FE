/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SePayWebhookResponse } from './SePayWebhookResponse';
/**
 * SePay webhook acknowledgement envelope containing both SePay's top-level success flag and standard API data payload
 */
export type SePayWebhookAckResponse = {
    /**
     * Top-level acknowledgement flag required by SePay webhooks
     */
    success: boolean;
    /**
     * Standard API payload describing the webhook processing outcome
     */
    data: SePayWebhookResponse;
};

