/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BundleItemDetail } from './BundleItemDetail';
/**
 * Bundle package details and included LED/Character components
 */
export type BundleDetail = {
    /**
     * Bundle identifier
     */
    bundleId: number;
    /**
     * Bundle promotional title
     */
    bundleName: string;
    /**
     * Detailed description of the bundle package
     */
    description?: string | null;
    /**
     * Combined original price of components before discount in VND
     */
    originalPrice?: number | null;
    /**
     * Promotional bundle selling price in VND
     */
    bundlePrice?: number | null;
    /**
     * ISO-8601 UTC bundle campaign start timestamp
     */
    startAt?: string | null;
    /**
     * ISO-8601 UTC bundle campaign end timestamp
     */
    endAt?: string | null;
    /**
     * Itemized hardware and digital components included in this bundle
     */
    items: Array<BundleItemDetail>;
};

