/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payment reconciliation summary for internal operations
 */
export type StaffPaymentDetail = {
    /**
     * Payment gateway used
     */
    paymentGateway: StaffPaymentDetail.paymentGateway;
    /**
     * Latest payment transaction status
     */
    status: StaffPaymentDetail.status;
    /**
     * Bank/gateway reference transaction code (settled payments only)
     */
    bankReferenceCode?: string | null;
    /**
     * Confirmed paid amount in VND (settled payments only)
     */
    paidAmount?: number | null;
    /**
     * ISO-8601 UTC timestamp when payment was confirmed (settled payments only)
     */
    paidAt?: string | null;
};
export namespace StaffPaymentDetail {
    /**
     * Payment gateway used
     */
    export enum paymentGateway {
        SEPAY = 'SEPAY',
    }
    /**
     * Latest payment transaction status
     */
    export enum status {
        PENDING = 'PENDING',
        SUCCESS = 'SUCCESS',
        FAILED = 'FAILED',
        REFUNDED = 'REFUNDED',
    }
}

