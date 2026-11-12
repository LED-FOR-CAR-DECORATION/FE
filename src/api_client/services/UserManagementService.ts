/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponseManagedUserDetailResponse } from '../models/ApiResponseManagedUserDetailResponse';
import type { ApiResponseManagedUserListResponse } from '../models/ApiResponseManagedUserListResponse';
import type { CreateInternalUserRequest } from '../models/CreateInternalUserRequest';
import type { ManagedUserFilterRequest } from '../models/ManagedUserFilterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserManagementService {
    /**
     * List internal users
     * Admin/manager only. Combines role, active status and email/name search filters. Excludes customer accounts and CUSTOMER roles in the database query before pagination. Results use stable accountId descending order.
     * @param filter
     * @returns ApiResponseManagedUserListResponse ApiResponse<ManagedUserListResponse>, containing items and meta
     * @throws ApiError
     */
    public static list(
        filter: ManagedUserFilterRequest,
    ): CancelablePromise<ApiResponseManagedUserListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/users',
            query: {
                'filter': filter,
            },
            errors: {
                400: `Invalid filters or pagination`,
                401: `Authentication required`,
                403: `Caller is not an active admin/manager`,
                500: `Unexpected storage failure`,
            },
        });
    }
    /**
     * Create an internal user
     * Current active ADMIN only. Creates an ACTIVE EMPLOYEE with one STAFF, MANAGER or DESIGNER role. Generates a random password; only its BCrypt hash is stored. Credentials email is sent asynchronously after commit with bounded retries. Email failure does not roll back the created account. Creation audit is logged after commit. Password is never returned.
     * @param requestBody
     * @returns any Internal account created; credentials email dispatched after commit
     * @throws ApiError
     */
    public static create(
        requestBody: CreateInternalUserRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/management/admin/users',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid email, name, role or JSON`,
                401: `Authentication required or caller account missing`,
                403: `Current active ADMIN access required`,
                409: `Email already registered`,
                500: `Unexpected infrastructure or missing configured role`,
            },
        });
    }
    /**
     * View an internal user's detail
     * Active Admin/Manager only. Returns profile, assigned role, account status and password-login lockout state. CUSTOMER accounts/roles are forbidden. Successful views of other users publish an audit event, logged after transaction commit; self views do not.
     * @param id Target account ID, greater than zero
     * @returns ApiResponseManagedUserDetailResponse ApiResponse<ManagedUserDetailResponse>
     * @throws ApiError
     */
    public static detail(
        id: number,
    ): CancelablePromise<ApiResponseManagedUserDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/management/admin/users/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Malformed, nonpositive or overflowing account ID`,
                401: `Authentication required or caller account missing`,
                403: `Forbidden caller or CUSTOMER target`,
                404: `Target account or employee profile missing`,
                500: `Unexpected infrastructure or profile integrity failure`,
            },
        });
    }
}
