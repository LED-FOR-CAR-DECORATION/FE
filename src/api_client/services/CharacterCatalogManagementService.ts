/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseCreateCharacterResponse } from '../models/ApiResponseCreateCharacterResponse';
import type { ApiResponseUpdateCharacterResponse } from '../models/ApiResponseUpdateCharacterResponse';
import type { CharacterVersionResponse } from '../models/CharacterVersionResponse';
import type { CreateCharacterRequest } from '../models/CreateCharacterRequest';
import type { CreateCharacterVersionRequest } from '../models/CreateCharacterVersionRequest';
import type { CreateCharacterVersionResponse } from '../models/CreateCharacterVersionResponse';
import type { UpdateCharacterRequest } from '../models/UpdateCharacterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CharacterCatalogManagementService {
    /**
     * Update graphic character
     * Updates the name and description of an existing graphic character. Enforces BR-FL5-07 (Scoped Designer Workspace): only the authenticated graphic designer who authored the character is permitted to update it. Rejects other designers, staff, managers, admins, or customers with 403 Forbidden. Returns 404 Not Found if the character does not exist.
     * @param id ID of the character to update
     * @param requestBody
     * @returns ApiResponseUpdateCharacterResponse Graphic character updated successfully
     * @throws ApiError
     */
    public static updateCharacter(
        id: number,
        requestBody: UpdateCharacterRequest,
    ): CancelablePromise<ApiResponseUpdateCharacterResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/management/characters/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: characterName is blank, exceeds 255 characters, or id is non-positive`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess DESIGNER role, employee account is inactive, or designer does not own the character`,
                404: `Not Found: character with specified ID does not exist`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Delete graphic character
     * Deletes an unlisted draft graphic character and cascades deletion to all unlisted versions. Enforces BR-FL5-07 (Scoped Designer Workspace) and BR-FL5-09 (Product Integrity Guard): only the authoring designer can delete the character, and deletion is rejected with 409 Conflict if any version has already been listed on the Store. Returns 204 No Content upon success.
     * @param id ID of the character to delete
     * @returns void
     * @throws ApiError
     */
    public static deleteCharacter(
        id: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/management/characters/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: character ID is non-positive`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess DESIGNER role, employee account is inactive, or designer does not own the character`,
                404: `Not Found: character with specified ID does not exist`,
                409: `Conflict: character has one or more versions listed on the Store`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create graphic character
     * Creates a new graphic character catalog entry authored by the authenticated designer. The creator employee ID is automatically resolved from the caller's JWT and verified against the database. Rejects non-designers with 403 Forbidden.
     * @param requestBody
     * @returns ApiResponseCreateCharacterResponse Graphic character created successfully
     * @throws ApiError
     */
    public static createCharacter(
        requestBody: CreateCharacterRequest,
    ): CancelablePromise<ApiResponseCreateCharacterResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/characters',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: characterName is blank or exceeds 255 characters`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess the DESIGNER role or employee account is inactive`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * List character versions with store status
     * Retrieves all versions of a character ordered by version number descending. DESIGNER callers can only inspect versions of characters they created (BR-FL5-07 / BR-FL5-10). MANAGER and ADMIN callers can inspect versions for any character across the company. Includes Store listing metadata (isListedOnStore, productId, productStatus) and strictly omits proprietary LED binary URLs.
     * @param id Unique identifier of the character
     * @returns CharacterVersionResponse Character versions retrieved successfully
     * @throws ApiError
     */
    public static listVersions(
        id: number,
    ): CancelablePromise<Array<CharacterVersionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/characters/{id}/versions',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request: character ID is non-positive`,
                401: `Unauthorized: missing or invalid authentication token`,
                403: `Forbidden: caller lacks required roles (DESIGNER, MANAGER, ADMIN) or designer is not the creator of this character`,
                404: `Not Found: character ID does not exist`,
            },
        });
    }
    /**
     * Create character version
     * Uploads and registers a new animation revision for an existing graphic character. Enforces BR-FL5-07 / BR-FL5-10: only the authoring designer can create versions for their own characters. Automatically increments versionNumber, defaults product_id to null (unlisted), and updates any previous active versions to isCurrent = false if the new version is marked current. Returns 201 Created.
     * @param id Unique identifier of the target character
     * @param requestBody
     * @returns CreateCharacterVersionResponse Character version created successfully
     * @throws ApiError
     */
    public static createVersion(
        id: number,
        requestBody: CreateCharacterVersionRequest,
    ): CancelablePromise<CreateCharacterVersionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/characters/{id}/versions',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request: validation failed for character ID or version details`,
                401: `Unauthorized: missing or invalid authentication token`,
                403: `Forbidden: non-designer role or designer is not the creator of this character`,
                404: `Not Found: character ID does not exist`,
            },
        });
    }
    /**
     * Delete character version
     * Deletes an unlisted draft animation version for a graphic character. Enforces BR-FL5-07 (Scoped Designer Workspace) and BR-FL5-09 (Product Integrity Guard): only the authoring designer can delete the version, and deletion is rejected with 409 Conflict if the version has already been listed on the Store. Returns 204 No Content upon success.
     * @param characterId ID of the target character
     * @param versionId ID of the character version to delete
     * @returns void
     * @throws ApiError
     */
    public static deleteVersion(
        characterId: number,
        versionId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/management/characters/{characterId}/versions/{versionId}',
            path: {
                'characterId': characterId,
                'versionId': versionId,
            },
            errors: {
                400: `Bad Request: characterId or versionId is non-positive`,
                401: `Unauthorized: missing, expired, or invalid JWT authentication token`,
                403: `Forbidden: caller does not possess DESIGNER role, employee account is inactive, or designer does not own the character`,
                404: `Not Found: character or character version with specified ID does not exist`,
                409: `Conflict: version has already been listed on the Store`,
                500: `Internal server error`,
            },
        });
    }
}
