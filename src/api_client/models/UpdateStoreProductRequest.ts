/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Replace product details. Omit tagIds to keep existing tags, or send an empty array to clear them.
 */
export type UpdateStoreProductRequest = {
    productName: string;
    basePrice: number;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    tagIds?: Array<number>;
};

