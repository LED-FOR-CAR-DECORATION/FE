/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdatedStoreProductStatusResponse = {
    productId?: number;
    status?: UpdatedStoreProductStatusResponse.status;
};
export namespace UpdatedStoreProductStatusResponse {
    export enum status {
        UNPUBLISHED = 'UNPUBLISHED',
        PUBLISHED = 'PUBLISHED',
        ARCHIVED = 'ARCHIVED',
        DELETED = 'DELETED',
    }
}

