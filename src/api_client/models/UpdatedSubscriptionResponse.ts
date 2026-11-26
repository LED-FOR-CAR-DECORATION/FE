/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdatedSubscriptionResponse = {
    subscriptionDetailId?: number;
    productId?: number;
    planCode?: string;
    planName?: string;
    basePrice?: number;
    description?: string;
    thumbnailUrl?: string;
    isLifetime?: boolean;
    durationDays?: number;
    allAccessCharacters?: boolean;
    maxCommissionRevisions?: number;
    status?: UpdatedSubscriptionResponse.status;
    createdAt?: string;
    tagIds?: Array<number>;
};
export namespace UpdatedSubscriptionResponse {
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

