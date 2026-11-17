/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedDetails } from './LedDetails';
/**
 * Newly created store product and its requested links
 */
export type CreatedStoreProductResponse = {
    productId?: number;
    productName?: string;
    productType?: CreatedStoreProductResponse.productType;
    basePrice?: number;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    status?: CreatedStoreProductResponse.status;
    tagIds?: Array<number>;
    characterVersionId?: number;
    ledDetails?: LedDetails;
};
export namespace CreatedStoreProductResponse {
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
    }
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

