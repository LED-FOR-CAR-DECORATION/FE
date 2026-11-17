/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaginationMeta } from './PaginationMeta';
import type { UserItem } from './UserItem';
/**
 * Paginated internal users, ordered by accountId descending
 */
export type ManagedUserListResponse = {
    /**
     * Safe internal-user summaries
     */
    items: Array<UserItem>;
    /**
     * Standard pagination metadata
     */
    meta: PaginationMeta;
};

