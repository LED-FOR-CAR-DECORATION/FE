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
    accessControlAllowOrigin?: string;
    accessControlRequestMethod?: HttpMethod;
    accessControlExposeHeaders?: Array<string>;
    accessControlAllowCredentials?: boolean;
    accessControlAllowHeaders?: Array<string>;
    accessControlAllowMethods?: Array<HttpMethod>;
    accessControlRequestHeaders?: Array<string>;
    basicAuth?: string;
    acceptLanguage?: Array<{
        range?: string;
        weight?: number;
    }>;
    accessControlMaxAge?: number;
    bearerAuth?: string;
    acceptPatch?: Array<MediaType>;
    ifNoneMatch?: Array<string>;
    contentDisposition?: ContentDisposition;
    ifUnmodifiedSince?: number;
    acceptLanguageAsLocales?: Array<string>;
    acceptCharset?: Array<string>;
    contentLanguage?: string;
    upgrade?: string;
    vary?: Array<string>;
    expires?: number;
    allow?: Array<HttpMethod>;
    etag?: string;
    ifMatch?: Array<string>;
    accept?: Array<MediaType>;
    pragma?: string;
    range?: Array<HttpRange>;
    cacheControl?: string;
};

