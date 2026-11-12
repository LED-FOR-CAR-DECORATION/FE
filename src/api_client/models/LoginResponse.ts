/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * JWT authentication response containing access and refresh tokens
 */
export type LoginResponse = {
    /**
     * Signed JWT access token for authenticating protected requests
     */
    accessToken?: string;
    /**
     * Signed JWT refresh token for renewing access tokens
     */
    refreshToken?: string;
    /**
     * OAuth token authorization scheme type
     */
    tokenType?: string;
    /**
     * Access token lifespan in seconds (15 minutes = 900s)
     */
    expiresIn?: number;
};

