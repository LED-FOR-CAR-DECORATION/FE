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
    acceptLanguage?: Array<{
        range?: string;
        weight?: number;
    }>;
    contentDisposition?: ContentDisposition;
    basicAuth?: string;
    acceptLanguageAsLocales?: Array<string>;
    acceptPatch?: Array<MediaType>;
    accessControlMaxAge?: number;
    acceptCharset?: Array<string>;
    connection?: Array<string>;
    bearerAuth?: string;
    ifUnmodifiedSince?: number;
    contentLanguage?: string;
    ifNoneMatch?: Array<string>;
    range?: Array<HttpRange>;
    cacheControl?: string;
    accessControlAllowCredentials?: boolean;
    accessControlAllowHeaders?: Array<string>;
    accessControlAllowMethods?: Array<HttpMethod>;
    accessControlAllowOrigin?: string;
    accessControlExposeHeaders?: Array<string>;
    accessControlRequestHeaders?: Array<string>;
    accessControlRequestMethod?: HttpMethod;
    etag?: string;
    pragma?: string;
    upgrade?: string;
    vary?: Array<string>;
    ifMatch?: Array<string>;
    expires?: number;
    accept?: Array<MediaType>;
    allow?: Array<HttpMethod>;
    ifModifiedSince?: number;
    contentType?: MediaType;
};

