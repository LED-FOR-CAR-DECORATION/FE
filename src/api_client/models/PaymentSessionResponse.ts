/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * SePay VietQR payment session details and live status for QR modal display and status polling
 */
export type PaymentSessionResponse = {
    /**
     * Unique payment transaction identifier
     */
    paymentId: number;
    /**
     * Unique transfer code embedded in the VietQR description memo
     */
    paymentCode: string;
    /**
     * Business target category for this payment session
     */
    targetType: PaymentSessionResponse.targetType;
    /**
     * Identifier of the target order or commission resource
     */
    targetId: number;
    /**
     * Payment gateway provider name
     */
    gateway: string;
    /**
     * Dynamic SePay VietQR image URL (populated while PENDING)
     */
    qrUrl?: string | null;
    /**
     * Beneficiary bank short name
     */
    bankName: string;
    /**
     * Beneficiary bank account number
     */
    accountNumber: string;
    /**
     * Beneficiary bank account holder name
     */
    accountName: string;
    /**
     * Payable amount in VND
     */
    amount: number;
    /**
     * Current payment session lifecycle status
     */
    status: PaymentSessionResponse.status;
    /**
     * ISO-8601 UTC timestamp when this payment session expires
     */
    expiresAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when payment was confirmed (null until settled)
     */
    paidAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the payment session was created
     */
    createdAt: string;
};
export namespace PaymentSessionResponse {
    /**
     * Business target category for this payment session
     */
    export enum targetType {
        ORDER = 'ORDER',
        COMMISSION_INITIAL = 'COMMISSION_INITIAL',
        COMMISSION_REVISION = 'COMMISSION_REVISION',
    }
    /**
     * Current payment session lifecycle status
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

