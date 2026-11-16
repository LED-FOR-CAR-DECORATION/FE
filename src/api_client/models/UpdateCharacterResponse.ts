/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response payload after successfully updating a graphic character
 */
export type UpdateCharacterResponse = {
    /**
     * Unique identifier of the character
     */
    characterId?: number;
    /**
     * Display name of the character
     */
    characterName?: string;
    /**
     * Detailed description of the character
     */
    description?: string;
    /**
     * Timestamp when the character was last updated
     */
    updatedAt?: string;
};

