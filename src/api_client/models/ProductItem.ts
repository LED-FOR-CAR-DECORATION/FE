/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagItem } from './TagItem';
export type ProductItem = {
    productId?: number;
    productName?: string;
    description?: string;
    productType?: ProductItem.productType;
    basePrice?: number;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    tags?: Array<TagItem>;
    createdAt?: string;
};
export namespace ProductItem {
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
    }
}

