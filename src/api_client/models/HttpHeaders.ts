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
    origin?: string;
    range?: Array<HttpRange>;
    contentDisposition?: ContentDisposition;
    acceptCharset?: Array<string>;
    cacheControl?: string;
    contentLanguage?: string;
    etag?: string;
    acceptLanguage?: Array<{
        range?: string;
        weight?: number;
    }>;
    basicAuth?: string;
    acceptPatch?: Array<MediaType>;
    ifNoneMatch?: Array<string>;
    accessControlMaxAge?: number;
    acceptLanguageAsLocales?: Array<string>;
    ifUnmodifiedSince?: number;
    bearerAuth?: string;
    accessControlRequestHeaders?: Array<string>;
    accessControlRequestMethod?: HttpMethod;
    accessControlAllowMethods?: Array<HttpMethod>;
    accessControlAllowHeaders?: Array<string>;
    accessControlExposeHeaders?: Array<string>;
    accessControlAllowCredentials?: boolean;
    accessControlAllowOrigin?: string;
    allow?: Array<HttpMethod>;
    expires?: number;
    ifMatch?: Array<string>;
    pragma?: string;
    upgrade?: string;
    vary?: Array<string>;
    accept?: Array<MediaType>;
};

