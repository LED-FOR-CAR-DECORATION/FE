/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Item } from './Item';
export type UpdatedBundleResponse = {
    bundleId?: number;
    productId?: number;
    bundleName?: string;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    originalPrice?: number;
    bundlePrice?: number;
    status?: string;
    tagIds?: Array<number>;
    items?: Array<Item>;
};

