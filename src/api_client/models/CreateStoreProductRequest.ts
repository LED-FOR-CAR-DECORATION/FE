/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedDetails } from './LedDetails';
/**
 * Create an unpublished LED or CHARACTER product
 */
export type CreateStoreProductRequest = {
    productName: string;
    productType: CreateStoreProductRequest.productType;
    basePrice: number;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    tagIds?: Array<number>;
    characterVersionId?: number;
    ledDetails?: LedDetails;
};
export namespace CreateStoreProductRequest {
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
    }
}

