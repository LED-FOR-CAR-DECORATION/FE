/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContentDisposition } from './ContentDisposition';
import type { HttpMethod } from './HttpMethod';
import type { HttpRange } from './HttpRange';
import type { MediaType } from './MediaType';
export type HttpHeaders = {
    empty?: boolean;
    location?: string;
    host?: {
        address?: {
            address?: string;
            hostAddress?: string;
            linkLocalAddress?: boolean;
            hostName?: string;
            multicastAddress?: boolean;
            anyLocalAddress?: boolean;
            loopbackAddress?: boolean;
            siteLocalAddress?: boolean;
            mcglobal?: boolean;
            mcnodeLocal?: boolean;
            mclinkLocal?: boolean;
            mcsiteLocal?: boolean;
            mcorgLocal?: boolean;
            canonicalHostName?: string;
        };
        port?: number;
        hostName?: string;
        unresolved?: boolean;
        hostString?: string;
    };
    all?: Record<string, string>;
    lastModified?: number;
    date?: number;
    contentLength?: number;
    origin?: string;
    range?: Array<HttpRange>;
    acceptCharset?: Array<string>;
    contentDisposition?: ContentDisposition;
    cacheControl?: string;
    contentLanguage?: string;
    etag?: string;
    acceptLanguage?: Array<{
        range?: string;
        weight?: number;
    }>;
    basicAuth?: string;
    accessControlAllowHeaders?: Array<string>;
    accessControlAllowOrigin?: string;
    accessControlAllowCredentials?: boolean;
    accessControlAllowMethods?: Array<HttpMethod>;
    accessControlRequestHeaders?: Array<string>;
    accessControlRequestMethod?: HttpMethod;
    accessControlExposeHeaders?: Array<string>;
    accessControlMaxAge?: number;
    acceptPatch?: Array<MediaType>;
    acceptLanguageAsLocales?: Array<string>;
    ifMatch?: Array<string>;
    expires?: number;
    accept?: Array<MediaType>;
    vary?: Array<string>;
    pragma?: string;
    allow?: Array<HttpMethod>;
    upgrade?: string;
    ifNoneMatch?: Array<string>;
    ifUnmodifiedSince?: number;
    connection?: Array<string>;
    bearerAuth?: string;
    ifModifiedSince?: number;
    contentType?: MediaType;
};

