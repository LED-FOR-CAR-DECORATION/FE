/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload after successfully creating a character animation version
 */
export type CreateCharacterVersionResponse = {
    /**
     * Unique identifier of the newly created version
     */
    versionId?: number;
    /**
     * Identifier of the parent graphic character
     */
    characterId?: number;
    /**
     * Auto-incremented sequence number for this version
     */
    versionNumber?: number;
    /**
     * Public CDN URL for animated GIF preview
     */
    previewGifUrl?: string;
    /**
     * Whether this version is currently set as the active revision
     */
    isCurrent?: boolean;
    /**
     * Whether this version is listed on Store (always false upon initial creation)
     */
    isListedOnStore?: boolean;
    /**
     * Timestamp when this version was created
     */
    createdAt?: string;
};

