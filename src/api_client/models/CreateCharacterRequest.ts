/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payload to create a new graphic character catalog entry
 */
export type CreateCharacterRequest = {
    /**
     * Display name of the graphic character
     */
    characterName: string;
    /**
     * Optional detailed character description
     */
    description?: string;
    /**
     * Target usage type of character (STORE or COMMISSION)
     */
    characterType?: 'STORE' | 'COMMISSION';
    /**
     * Optional commission request ID when characterType is COMMISSION
     */
    commissionId?: number;
};

