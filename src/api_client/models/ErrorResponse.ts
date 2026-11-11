/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ErrorDetail } from './ErrorDetail';
/**
 * Standard error response payload
 */
export type ErrorResponse = {
    /**
     * Stable machine-readable error code
     */
    code?: string;
    /**
     * Safe human-readable error description
     */
    message?: string;
    /**
     * HTTP status code matching the response
     */
    status?: number;
    /**
     * ISO-8601 UTC timestamp of when the error occurred
     */
    timestamp?: string;
    /**
     * Unique trace ID for support and diagnostics
     */
    traceId?: string;
    /**
     * List of structured problem details related to the error
     */
    details?: Array<ErrorDetail>;
};

