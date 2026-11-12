/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for adding a product to the authenticated customer's shopping cart
 */
export type AddCartItemRequest = {
    /**
     * Identifier of the product to add
     */
    productId: number;
    /**
     * Quantity of the product to add (minimum 1)
     */
    quantity: number;
};

