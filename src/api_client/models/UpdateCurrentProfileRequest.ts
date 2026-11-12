/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Replace editable profile fields. Null or blank phone/avatar clears the profile value; name is required.
 */
export type UpdateCurrentProfileRequest = {
    /**
     * Full name, trimmed, 1 to 255 characters
     */
    name: string;
    /**
     * 8 to 15 digits with an optional leading plus. Null or blank clears the phone.
     */
    phone?: string;
    /**
     * Absolute HTTP(S) avatar URL, maximum 255 characters. Null or blank clears the profile override, falling back to the account avatar.
     */
    avatar?: string;
};

