/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Customer owned character details from store purchases
 */
export type CustomerOwnedCharacterResponse = {
    /**
     * Identifier of the character
     */
    characterId?: number;
    /**
     * Name of the character
     */
    characterName?: string;
    /**
     * Public CDN URL of preview animation GIF/PNG
     */
    previewGifUrl?: string;
    /**
     * Frame count of the animation
     */
    frameCount?: number;
    /**
     * Frame delay in milliseconds
     */
    frameDelayMs?: number;
    /**
     * Identifier of the purchase order
     */
    orderId?: number;
    /**
     * Identifier of the store product purchased
     */
    storeProductId?: number;
    /**
     * Store product title at purchase time
     */
    productName?: string;
    /**
     * Unit price at time of purchase
     */
    purchasedPrice?: number;
    /**
     * Timestamp when the character was granted/purchased
     */
    purchasedAt?: string;
};

