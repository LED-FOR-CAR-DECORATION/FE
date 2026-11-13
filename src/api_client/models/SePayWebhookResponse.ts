/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Outcome of processing a SePay payment webhook callback
 */
export type SePayWebhookResponse = {
    /**
     * SePay transaction ID (sepay_tx_id) from the webhook payload
     */
    sepayTxId: number;
    /**
     * Matched internal payment transaction ID
     */
    paymentId?: number | null;
    /**
     * Matched transfer payment code
     */
    paymentCode?: string | null;
    /**
     * Business target category
     */
    targetType?: SePayWebhookResponse.targetType;
    /**
     * Identifier of the target order or commission resource
     */
    targetId?: number | null;
    /**
     * Resulting payment status
     */
    status?: SePayWebhookResponse.status;
    /**
     * Webhook processing outcome (PROCESSED, IGNORED, or UNMATCHED)
     */
    outcome: string;
    /**
     * Human-readable processing summary
     */
    message: string;
};
export namespace SePayWebhookResponse {
    /**
     * Business target category
     */
    export enum targetType {
        ORDER = 'ORDER',
        COMMISSION_INITIAL = 'COMMISSION_INITIAL',
        COMMISSION_REVISION = 'COMMISSION_REVISION',
    }
    /**
     * Resulting payment status
     */
    export enum status {
        PENDING = 'PENDING',
        SUCCEEDED = 'SUCCEEDED',
        EXPIRED = 'EXPIRED',
        CANCELLED = 'CANCELLED',
        FAILED = 'FAILED',
        REFUNDED = 'REFUNDED',
    }
}

