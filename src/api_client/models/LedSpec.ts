/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpecAttribute } from './SpecAttribute';
/**
 * Structured technical specifications for an LED hardware model
 */
export type LedSpec = {
    /**
     * LED canvas width in pixels
     */
    widthPx?: number | null;
    /**
     * LED canvas height in pixels
     */
    heightPx?: number | null;
    /**
     * Ordered list of display specification attributes
     */
    attributes: Array<SpecAttribute>;
};

