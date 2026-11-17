/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Subscription plan entitlement attributes across store, commission, mobile app, and extensible features
 */
export type SubscriptionDetail = {
    /**
     * Subscription detail identifier
     */
    subscriptionDetailId: number;
    /**
     * Unique canonical subscription plan code for cross-module entitlement checks
     */
    planCode: string;
    /**
     * Subscription plan display name
     */
    planName: string;
    /**
     * Indicates whether entitlement validity is lifetime
     */
    isLifetime: boolean;
    /**
     * Plan validity duration in days when isLifetime is false (null for lifetime plans)
     */
    durationDays?: number | null;
    /**
     * Store benefit: grants unlimited access to all catalog characters
     */
    allAccessCharacters: boolean;
    /**
     * Commission benefit: number of commission redraw/revision requests included
     */
    maxCommissionRevisions: number;
    /**
     * Mobile app benefit: maximum saved profile slots allowed on mobile
     */
    maxMobileProfiles: number;
    /**
     * Extensible key-value map of additional multi-module feature flags and perks
     */
    features: Record<string, any>;
    /**
     * Detailed list or summary of subscription plan perks
     */
    perksDescription?: string | null;
};

