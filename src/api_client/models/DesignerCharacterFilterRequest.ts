/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Query parameters for filtering designer's personal graphic character catalog
 */
export type DesignerCharacterFilterRequest = {
    /**
     * Optional search query substring matching character name or description (case-insensitive)
     */
    query?: string;
    /**
     * Optional filter by character type (STORE or COMMISSION)
     */
    characterType?: 'STORE' | 'COMMISSION';
    /**
     * Optional filter by linked commission ID
     */
    commissionId?: number;
    /**
     * 0-based page index
     */
    page?: number;
    /**
     * Page size (number of records per page, between 1 and 100)
     */
    size?: number;
};

