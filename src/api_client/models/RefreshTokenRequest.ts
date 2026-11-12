/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Refresh token request payload containing the single-use refresh token
 */
export type RefreshTokenRequest = {
    /**
     * Signed JWT refresh token previously issued upon login or token renewal
     */
    refreshToken: string;
};

