/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CartItemResponse } from './CartItemResponse';
/**
 * Active shopping cart response for the authenticated customer
 */
export type CartResponse = {
    /**
     * Unique identifier of the shopping cart
     */
    cartId: number;
    /**
     * List of items currently in the shopping cart
     */
    items: Array<CartItemResponse>;
    /**
     * ISO-8601 UTC timestamp when the cart was last updated
     */
    updatedAt: string;
};

