/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Snapshotted line item within an order
 */
export type OrderItemDetail = {
    /**
     * Order item identifier
     */
    orderItemId: number;
    /**
     * Product identifier
     */
    productId: number;
    /**
     * Product display name
     */
    productName: string;
    /**
     * Product type classification
     */
    productType?: OrderItemDetail.productType;
    /**
     * Product thumbnail image URL
     */
    thumbnailUrl?: string | null;
    /**
     * Preview GIF animation URL (populated for CHARACTER products)
     */
    previewGifUrl?: string | null;
    /**
     * Snapshotted unit price at checkout time in VND
     */
    unitPrice: number;
    /**
     * Purchased quantity
     */
    quantity: number;
    /**
     * Snapshotted line subtotal (unitPrice * quantity) in VND
     */
    subtotal: number;
};
export namespace OrderItemDetail {
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

