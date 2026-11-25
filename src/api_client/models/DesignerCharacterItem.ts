/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrentVersionSummary } from './CurrentVersionSummary';
/**
 * Designer character summary item
 */
export type DesignerCharacterItem = {
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
     * Total number of graphic versions created under this character
     */
    totalVersions?: number;
    /**
     * Current active graphic version summary, or null if no versions exist
     */
    currentVersion?: CurrentVersionSummary;
    /**
     * Timestamp when character was first created
     */
    createdAt?: string;
};

