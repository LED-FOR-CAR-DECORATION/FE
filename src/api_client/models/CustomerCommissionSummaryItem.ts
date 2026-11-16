/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary card of a personal custom artwork commission request
 */
export type CustomerCommissionSummaryItem = {
    /**
     * Unique commission request ID
     */
    commissionId?: number;
    /**
     * Commission request title
     */
    title?: string;
    /**
     * Selected pricing tier code
     */
    tierCode?: string;
    /**
     * Target LED matrix resolution
     */
    targetMatrixDimensions?: string | null;
    /**
     * Current commission lifecycle status
     */
    status?: CustomerCommissionSummaryItem.status;
    /**
     * Initial package/configuration price in VND
     */
    initialPrice?: number;
    /**
     * Accumulated extra revision fee in VND
     */
    extraRevisionFee?: number;
    /**
     * Total commission price in VND (initialPrice + extraRevisionFee)
     */
    totalPrice?: number;
    /**
     * Number of free revisions consumed
     */
    revisionsUsed?: number;
    /**
     * Maximum free revisions included in the commission
     */
    maxRevisions?: number;
    /**
     * Active SePay payment code when status is PENDING_PAYMENT or AWAITING_EXTRA_PAYMENT
     */
    activePaymentCode?: string | null;
    /**
     * Quotation payment expiration timestamp in UTC
     */
    quoteExpiresAt?: string | null;
    /**
     * Timestamp when the commission request was submitted in UTC
     */
    createdAt?: string;
    /**
     * Timestamp when the commission request was last updated in UTC
     */
    updatedAt?: string;
};
export namespace CustomerCommissionSummaryItem {
    /**
     * Current commission lifecycle status
     */
    export enum status {
        PENDING_REVIEW = 'PENDING_REVIEW',
        PENDING_PAYMENT = 'PENDING_PAYMENT',
        PAID = 'PAID',
        IN_PROGRESS = 'IN_PROGRESS',
        INTERNAL_REVIEW = 'INTERNAL_REVIEW',
        INTERNAL_REVISION_REQUIRED = 'INTERNAL_REVISION_REQUIRED',
        PREVIEW_DELIVERED = 'PREVIEW_DELIVERED',
        AWAITING_EXTRA_PAYMENT = 'AWAITING_EXTRA_PAYMENT',
        CUSTOMER_REVISION_REQUESTED = 'CUSTOMER_REVISION_REQUESTED',
        AWAITING_ESTIMATE = 'AWAITING_ESTIMATE',
        COMPLETED = 'COMPLETED',
        CANCELLED = 'CANCELLED',
        EXPIRED = 'EXPIRED',
    }
}

