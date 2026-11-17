/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdatedStoreProductResponse = {
    productId?: number;
    productName?: string;
    productType?: UpdatedStoreProductResponse.productType;
    basePrice?: number;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    status?: UpdatedStoreProductResponse.status;
    tagIds?: Array<number>;
};
export namespace UpdatedStoreProductResponse {
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

