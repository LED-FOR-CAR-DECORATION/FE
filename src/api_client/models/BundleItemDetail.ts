/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Single LED hardware or Character animation item included within a bundle
 */
export type BundleItemDetail = {
    /**
     * Included bundle component type (LED or CHARACTER)
     */
    itemType: BundleItemDetail.itemType;
    /**
     * Included LED model identifier (for LED items)
     */
    modelId?: number | null;
    /**
     * Included LED model name (for LED items)
     */
    modelName?: string | null;
    /**
     * Current available hardware stock of the LED model (for LED items)
     */
    stockQuantity?: number | null;
    /**
     * Included character version identifier (for CHARACTER items)
     */
    versionId?: number | null;
    /**
     * Included character identifier (for CHARACTER items)
     */
    characterId?: number | null;
    /**
     * Included character name (for CHARACTER items)
     */
    characterName?: string | null;
    /**
     * Included character version number (for CHARACTER items)
     */
    versionNumber?: number | null;
    /**
     * Animated preview GIF URL of the character (for CHARACTER items)
     */
    previewGifUrl?: string | null;
    /**
     * Quantity of this item included per bundle unit
     */
    quantity: number;
};
export namespace BundleItemDetail {
    /**
     * Included bundle component type (LED or CHARACTER)
     */
    export enum itemType {
        LED = 'LED',
        CHARACTER = 'CHARACTER',
    }
}

