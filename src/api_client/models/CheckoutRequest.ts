/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ShippingDetailsRequest } from './ShippingDetailsRequest';
/**
 * Request payload for checking out selected shopping cart items into an order
 */
export type CheckoutRequest = {
    /**
     * Non-empty list of selected cart item IDs belonging to the authenticated customer
     */
    cartItemIds: Array<number>;
    /**
     * Saved address ID from customer's address book (required for physical orders unless shippingDetails is supplied)
     */
    deliveryAddressId?: number | null;
    /**
     * Inline shipping delivery details with GPS coordinates (alternative to deliveryAddressId for physical orders)
     */
    shippingDetails?: ShippingDetailsRequest;
    /**
     * Selected payment gateway
     */
    paymentGateway: CheckoutRequest.paymentGateway;
};
export namespace CheckoutRequest {
    /**
     * Selected payment gateway
     */
    export enum paymentGateway {
        SEPAY = 'SEPAY',
    }
}

