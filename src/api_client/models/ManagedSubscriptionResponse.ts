/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ManagedSubscriptionResponse = {
    subscriptionDetailId?: number;
    productId?: number;
    planCode?: string;
    planName?: string;
    basePrice?: number;
    isLifetime?: boolean;
    durationDays?: number;
    allAccessCharacters?: boolean;
    maxCommissionRevisions?: number;
    status?: ManagedSubscriptionResponse.status;
    createdAt?: string;
};
export namespace ManagedSubscriptionResponse {
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

