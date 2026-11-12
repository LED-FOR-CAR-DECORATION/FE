/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payment details showing active SePay VietQR retry info when PENDING_PAYMENT or settled payment confirmation when SUCCESS
 */
export type PaymentDetail = {
    /**
     * Payment gateway used
     */
    paymentGateway: PaymentDetail.paymentGateway;
    /**
     * Current payment transaction status
     */
    status: PaymentDetail.status;
    /**
     * Bank transfer memo content required for SePay matching (active PENDING_PAYMENT only)
     */
    paymentContent?: string | null;
    /**
     * Dynamic SePay VietQR image URL (null when paid or expired)
     */
    qrCodeUrl?: string | null;
    /**
     * Receiving bank account number (active PENDING_PAYMENT only)
     */
    bankAccount?: string | null;
    /**
     * Receiving bank code/name (active PENDING_PAYMENT only)
     */
    bankName?: string | null;
    /**
     * ISO-8601 UTC expiration timestamp for pending payment
     */
    expiresAt?: string | null;
    /**
     * Bank/gateway reference transaction code (settled payments)
     */
    bankReferenceCode?: string | null;
    /**
     * Confirmed paid amount in VND (settled payments)
     */
    paidAmount?: number | null;
    /**
     * ISO-8601 UTC timestamp when payment was confirmed (settled payments)
     */
    paidAt?: string | null;
};
export namespace PaymentDetail {
    /**
     * Payment gateway used
     */
    export enum paymentGateway {
        SEPAY = 'SEPAY',
    }
    /**
     * Current payment transaction status
     */
    export enum status {
        PENDING = 'PENDING',
        SUCCESS = 'SUCCESS',
        FAILED = 'FAILED',
        REFUNDED = 'REFUNDED',
    }
}

