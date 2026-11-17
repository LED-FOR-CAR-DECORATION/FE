/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inbound SePay bank transfer notification webhook payload
 */
export type SePayWebhookRequest = {
    /**
     * Unique SePay transaction ID (sepay_tx_id) used for webhook idempotency (0 may be sent by SePay dashboard test pings)
     */
    id: number;
    /**
     * Receiving bank short name reported by SePay
     */
    gateway?: string | null;
    /**
     * Bank transaction timestamp string (yyyy-MM-dd HH:mm:ss or ISO-8601)
     */
    transactionDate?: string | null;
    /**
     * Beneficiary bank account number
     */
    accountNumber?: string | null;
    /**
     * Auto-detected payment code extracted by SePay (if configured)
     */
    code?: string | null;
    /**
     * Bank transfer memo content
     */
    content?: string | null;
    /**
     * Transfer direction ('in' for incoming deposit, 'out' for withdrawal)
     */
    transferType: string;
    /**
     * Transferred amount in VND
     */
    transferAmount: number;
    /**
     * Cumulative bank account balance after transaction
     */
    accumulated?: number | null;
    /**
     * Virtual sub-account number if used
     */
    subAccount?: string | null;
    /**
     * Bank SMS/transaction reference code
     */
    referenceCode?: string | null;
    /**
     * Full raw SMS/bank transfer narrative
     */
    description?: string | null;
    incomingTransfer?: boolean;
};

