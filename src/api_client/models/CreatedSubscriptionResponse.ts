/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreatedSubscriptionResponse = {
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
    status?: CreatedSubscriptionResponse.status;
    createdAt?: string;
    tagIds?: Array<number>;
};
export namespace CreatedSubscriptionResponse {
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

