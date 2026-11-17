/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AhamoveWebhookRequest } from '../models/AhamoveWebhookRequest';
import type { ApiResponseAhamoveWebhookResponse } from '../models/ApiResponseAhamoveWebhookResponse';
import type { HttpHeaders } from '../models/HttpHeaders';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommerceWebhooksService {
    /**
     * Process AhaMove delivery status webhook
     * Public webhook endpoint authenticated via configurable AhaMove webhook token (API-Key header or Authorization Bearer token). Atomically, idempotently, and monotonically synchronizes AhaMove order lifecycle updates into order_delivery.delivery_status and orders.status.
     * @param headers
     * @param requestBody
     * @returns ApiResponseAhamoveWebhookResponse Webhook accepted (processed, ignored as idempotent/terminal, or unmatched tracking number)
     * @throws ApiError
     */
    public static handleAhamoveWebhook(
        headers: HttpHeaders,
        requestBody: AhamoveWebhookRequest,
    ): CancelablePromise<ApiResponseAhamoveWebhookResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/commerce/webhooks/ahamove',
            headers: {
                'headers': headers,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: malformed JSON payload or missing required webhook fields (_id, status)`,
                401: `Unauthorized: missing or invalid webhook authentication header/token`,
                500: `Internal server error`,
            },
        });
    }
}
