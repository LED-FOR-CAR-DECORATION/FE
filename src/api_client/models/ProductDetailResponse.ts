/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BundleDetail } from './BundleDetail';
import type { CharacterDetail } from './CharacterDetail';
import type { LedDetail } from './LedDetail';
import type { SubscriptionDetail } from './SubscriptionDetail';
import type { TagItem } from './TagItem';
/**
 * Public store product detail payload including common metadata and type-specific attributes
 */
export type ProductDetailResponse = {
    /**
     * Unique product identifier
     */
    productId: number;
    /**
     * Product display name
     */
    productName: string;
    /**
     * Detailed product marketing and feature description
     */
    description?: string | null;
    /**
     * Catalog product category type
     */
    productType: ProductDetailResponse.productType;
    /**
     * Base selling price in VND
     */
    basePrice: number;
    /**
     * Publicly viewable lifecycle status (PUBLISHED or ARCHIVED)
     */
    status: ProductDetailResponse.status;
    /**
     * Primary product cover image URL
     */
    thumbnailUrl?: string | null;
    /**
     * Supplementary gallery slider image URLs
     */
    galleryUrls: Array<string>;
    /**
     * Assigned catalog category tags
     */
    tags: Array<TagItem>;
    /**
     * LED hardware model specifications and stock (present when productType is LED)
     */
    ledDetails?: LedDetail;
    /**
     * Character animation metadata excluding ledBinaryUrl (present when productType is CHARACTER)
     */
    characterDetails?: CharacterDetail;
    /**
     * Bundle package pricing, schedule, and itemized breakdown (present when productType is BUNDLE)
     */
    bundleDetails?: BundleDetail;
    /**
     * Subscription plan entitlement metadata (present when productType is SUBSCRIPTION)
     */
    subscriptionDetails?: SubscriptionDetail;
    /**
     * ISO-8601 UTC product creation timestamp
     */
    createdAt: string;
};
export namespace ProductDetailResponse {
    /**
     * Catalog product category type
     */
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
    }
    /**
     * Publicly viewable lifecycle status (PUBLISHED or ARCHIVED)
     */
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

