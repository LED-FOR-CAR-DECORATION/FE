/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request payload for uploading and creating a new character animation version
 */
export type CreateCharacterVersionRequest = {
    /**
     * Public CDN URL of the animated preview GIF
     */
    previewGifUrl: string;
    /**
     * Total number of animation frames in the sequence
     */
    frameCount: number;
    /**
     * Duration to display each frame in milliseconds
     */
    frameDelayMs: number;
    /**
     * Byte size of the animation payload
     */
    byteSize: number;
    /**
     * Whether to set this newly uploaded version as active current revision (defaults to true)
     */
    isCurrent?: boolean;
};

