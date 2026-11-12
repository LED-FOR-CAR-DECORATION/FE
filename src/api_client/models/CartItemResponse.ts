/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Line item in the shopping cart with real-time pricing and availability status
 */
export type CartItemResponse = {
    /**
     * Unique identifier of the cart item
     */
    cartItemId: number;
    /**
     * Product identifier
     */
    productId: number;
    /**
     * Current product name
     */
    productName: string;
    /**
     * Product type classification
     */
    productType: CartItemResponse.productType;
    /**
     * Product thumbnail image URL
     */
    thumbnailUrl?: string;
    /**
     * Requested quantity in cart
     */
    quantity: number;
    /**
     * Current unit price sourced from product base_price
     */
    unitPrice: number;
    /**
     * Line item subtotal calculated as unitPrice * quantity
     */
    subtotal: number;
    /**
     * Indicates whether this item can currently be purchased
     */
    isAvailable: boolean;
    /**
     * Machine-readable unavailability reason when isAvailable is false; null when available
     */
    unavailableReason?: string | null;
    /**
     * ISO-8601 UTC timestamp when the item was added to cart
     */
    addedAt: string;
};
export namespace CartItemResponse {
    /**
     * Product type classification
     */
    export enum productType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
        BUNDLE = 'BUNDLE',
        SUBSCRIPTION = 'SUBSCRIPTION',
    }
}

