/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request body for adjudicating and transitioning a warranty claim status
 */
export type ProcessWarrantyClaimRequest = {
    /**
     * New lifecycle status of the claim (APPROVED, REJECTED, or COMPLETED)
     */
    status: ProcessWarrantyClaimRequest.status;
    /**
     * Resolution or rejection notes explaining the decision or service provided (required for REJECTED and COMPLETED)
     */
    resolutionNotes?: string | null;
};
export namespace ProcessWarrantyClaimRequest {
    /**
     * New lifecycle status of the claim (APPROVED, REJECTED, or COMPLETED)
     */
    export enum status {
        PENDING = 'PENDING',
        APPROVED = 'APPROVED',
        REJECTED = 'REJECTED',
        COMPLETED = 'COMPLETED',
    }
}

