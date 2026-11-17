/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Details of a graphic character version including Store listing status
 */
export type CharacterVersionResponse = {
    /**
     * Unique identifier of the character version
     */
    versionId?: number;
    /**
     * Incremental version sequence number
     */
    versionNumber?: number;
    /**
     * Public CDN URL for animated GIF preview
     */
    previewGifUrl?: string;
    /**
     * Total number of animation frames
     */
    frameCount?: number;
    /**
     * Frame delay duration in milliseconds
     */
    frameDelayMs?: number;
    /**
     * Binary payload size in bytes
     */
    byteSize?: number;
    /**
     * Whether this version is the current active revision
     */
    isCurrent?: boolean;
    /**
     * Whether this version is published/listed on the Store catalog
     */
    isListedOnStore?: boolean;
    /**
     * Associated Store product identifier if listed
     */
    productId?: number;
    /**
     * Store product publication status if listed
     */
    productStatus?: string;
    /**
     * Creation timestamp of this version
     */
    createdAt?: string;
};

