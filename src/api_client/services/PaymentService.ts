/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponsePaymentSessionResponse } from '../models/ApiResponsePaymentSessionResponse';
import type { HttpHeaders } from '../models/HttpHeaders';
import type { SePayWebhookAckResponse } from '../models/SePayWebhookAckResponse';
import type { SePayWebhookRequest } from '../models/SePayWebhookRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PaymentService {
    /**
     * Process SePay payment webhook
     * Public webhook endpoint authenticated via the Apikey header (Authorization: Apikey <key> or Apikey header). Enforces idempotency via sepay_tx_id, atomically marks the matching pending payment transaction SUCCEEDED, and publishes PaymentSucceededEvent.
     * @param headers
     * @param requestBody
     * @returns SePayWebhookAckResponse Webhook accepted (processed, ignored as duplicate/non-pending/underpaid, or unmatched transfer)
     * @throws ApiError
     */
    public static handleSePayWebhook(
        headers: HttpHeaders,
        requestBody: SePayWebhookRequest,
    ): CancelablePromise<SePayWebhookAckResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/payments/webhooks/sepay',
            headers: {
                'headers': headers,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request: malformed JSON payload or missing required webhook fields (id, transferType, transferAmount)`,
                401: `Unauthorized: missing or invalid SePay Apikey webhook credential`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get SePay payment session and poll status
     * Retrieves the SePay VietQR payment session details (QR URL, bank details, amount, expiration) and current status for 3-second frontend polling. Restricted to the owning CUSTOMER account.
     * @param paymentCode Unique SePay transfer payment code
     * @returns ApiResponsePaymentSessionResponse Payment session retrieved successfully
     * @throws ApiError
     */
    public static getPaymentSession(
        paymentCode: string,
    ): CancelablePromise<ApiResponsePaymentSessionResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/payments/{paymentCode}',
            path: {
                'paymentCode': paymentCode,
            },
            errors: {
                400: `Bad request: blank or invalid paymentCode parameter`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: account is not CUSTOMER or does not own the payment session`,
                404: `Payment session not found`,
                500: `Internal server error`,
            },
        });
    }
}
