/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Item } from './Item';
export type CreateBundleRequest = {
    bundleName: string;
    description?: string;
    thumbnailUrl?: string;
    galleryUrls?: Array<string>;
    bundlePrice: number;
    tagIds?: Array<number>;
    items: Array<Item>;
};

