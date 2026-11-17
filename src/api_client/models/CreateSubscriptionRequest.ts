/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateSubscriptionRequest = {
    planName: string;
    planCode: string;
    basePrice: number;
    description?: string;
    thumbnailUrl?: string;
    isLifetime: boolean;
    durationDays?: number;
    allAccessCharacters: boolean;
    tagIds?: Array<number>;
};

