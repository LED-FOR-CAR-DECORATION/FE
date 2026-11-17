/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CustomerCommissionAttachmentItem } from './CustomerCommissionAttachmentItem';
import type { CustomerDeliveredPreviewItem } from './CustomerDeliveredPreviewItem';
/**
 * Detailed customer view of a personal custom artwork commission request, including requirements, payment code, reference attachments, and Staff-approved delivered previews
 */
export type CustomerCommissionDetailResponse = {
    /**
     * Unique commission request identifier
     */
    commissionId: number;
    /**
     * Owning customer account identifier
     */
    customerId: number;
    /**
     * Customer-supplied commission title
     */
    title: string;
    /**
     * Detailed customer character description and artwork requirements
     */
    description?: string | null;
    /**
     * Selected pricing tier code (`BASIC`, `ADVANCED`, `CUSTOM`)
     */
    tierCode: string;
    /**
     * Target LED matrix pixel dimensions
     */
    targetMatrixDimensions?: string | null;
    /**
     * Immutable JSON snapshot of selected pricing rules and option prices at submission time
     */
    priceBreakdownJson?: string | null;
    /**
     * Snapshotted initial commission price in VND
     */
    initialPrice: number;
    /**
     * Accumulated extra paid revision fees in VND
     */
    extraRevisionFee: number;
    /**
     * Total commission price (`initialPrice + extraRevisionFee`) in VND
     */
    totalPrice: number;
    /**
     * Number of customer revisions consumed so far
     */
    revisionsUsed: number;
    /**
     * Free revision quota included in the selected tier
     */
    maxRevisions: number;
    /**
     * Current commission lifecycle status
     */
    status: CustomerCommissionDetailResponse.status;
    /**
     * Active SePay payment code exposed only when status is `PENDING_PAYMENT` or `AWAITING_EXTRA_PAYMENT` (`null` otherwise)
     */
    activePaymentCode?: string | null;
    /**
     * Submission ID accepted by the customer upon completion (`null` until `COMPLETED`)
     */
    approvedSubmissionId?: number | null;
    /**
     * Reason provided by Staff if the initial request was rejected (`null` unless rejected)
     */
    rejectionReason?: string | null;
    /**
     * Whether the customer-facing commission chat room (`/api/commissions/{id}/messages`) is currently active
     */
    chatActive: boolean;
    /**
     * ISO-8601 UTC expiration timestamp for initial quote payment (`PENDING_PAYMENT`)
     */
    quoteExpiresAt?: string | null;
    /**
     * ISO-8601 UTC target delivery deadline for the current draft or revision
     */
    slaDueAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when a delivered preview will auto-complete if no customer action is taken
     */
    autoCompleteAt?: string | null;
    /**
     * ISO-8601 UTC timestamp when the commission request was created
     */
    createdAt: string;
    /**
     * ISO-8601 UTC timestamp when the commission request was last updated
     */
    updatedAt?: string | null;
    /**
     * Customer reference image attachments submitted with the request
     */
    attachments: Array<CustomerCommissionAttachmentItem>;
    /**
     * Staff-approved artwork previews delivered to the customer (excludes unapproved internal Designer drafts)
     */
    deliveredPreviews: Array<CustomerDeliveredPreviewItem>;
};
export namespace CustomerCommissionDetailResponse {
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

