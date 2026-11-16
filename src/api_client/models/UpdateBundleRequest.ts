/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Item } from './Item';
export type UpdateBundleRequest = {
    bundleName: string;
    description?: string;
    thumbnailUrl?: string;
    bundlePrice: number;
    items?: Array<Item>;
};

