/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PathPoint } from './PathPoint';
export type AhamoveWebhookRequest = {
    _id: string;
    status: string;
    sub_status?: string;
    shared_link?: string;
    total_fee?: number;
    total_pay?: number;
    complete_time?: number;
    path?: Array<PathPoint>;
};

