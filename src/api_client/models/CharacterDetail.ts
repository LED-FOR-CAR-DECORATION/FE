/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Public animation preview details for a CHARACTER product (binary file URL excluded)
 */
export type CharacterDetail = {
    /**
     * Character identifier
     */
    characterId: number;
    /**
     * Character display name
     */
    characterName: string;
    /**
     * Character lore or artistic description
     */
    description?: string | null;
    /**
     * Displayed release version number
     */
    versionNumber: number;
    /**
     * Animated GIF preview URL
     */
    previewGifUrl?: string | null;
    /**
     * Total animation frame count
     */
    frameCount?: number | null;
    /**
     * Delay per animation frame in milliseconds
     */
    frameDelayMs?: number | null;
};

