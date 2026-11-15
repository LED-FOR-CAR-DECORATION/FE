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
    connection?: Array<string>;
    ifModifiedSince?: number;
    contentType?: MediaType;
    accessControlAllowCredentials?: boolean;
    accessControlRequestHeaders?: Array<string>;
    accessControlAllowOrigin?: string;
    accessControlRequestMethod?: HttpMethod;
    accessControlExposeHeaders?: Array<string>;
    accessControlAllowHeaders?: Array<string>;
    accessControlAllowMethods?: Array<HttpMethod>;
    origin?: string;
    range?: Array<HttpRange>;
    contentDisposition?: ContentDisposition;
    acceptCharset?: Array<string>;
    cacheControl?: string;
    etag?: string;
    contentLanguage?: string;
    acceptLanguage?: Array<{
        range?: string;
        weight?: number;
    }>;
    basicAuth?: string;
    ifUnmodifiedSince?: number;
    acceptPatch?: Array<MediaType>;
    bearerAuth?: string;
    accessControlMaxAge?: number;
    ifNoneMatch?: Array<string>;
    acceptLanguageAsLocales?: Array<string>;
    allow?: Array<HttpMethod>;
    vary?: Array<string>;
    accept?: Array<MediaType>;
    pragma?: string;
    expires?: number;
    upgrade?: string;
    ifMatch?: Array<string>;
};

