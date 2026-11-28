/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthorSummary } from './AuthorSummary';
/**
 * Admin character summary item
 */
export type AdminCharacterItem = {
    /**
     * Unique character identifier
     */
    characterId?: number;
    /**
     * Display name of the graphic character
     */
    characterName?: string;
    /**
     * Detailed character description
     */
    description?: string;
    /**
     * Character usage type (STORE or COMMISSION)
     */
    characterType?: 'STORE' | 'COMMISSION';
    /**
     * Bound commission request ID if applicable
     */
    commissionId?: number | null;
    /**
     * Creator author employee summary
     */
    author?: AuthorSummary;
    /**
     * Total number of graphic versions created under this character
     */
    totalVersions?: number;
    /**
     * Timestamp when character was first created
     */
    createdAt?: string;
};

