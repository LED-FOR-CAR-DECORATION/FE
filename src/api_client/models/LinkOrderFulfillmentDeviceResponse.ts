/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FulfillmentProgress } from './FulfillmentProgress';
export type LinkOrderFulfillmentDeviceResponse = {
    orderId?: number;
    orderStatus?: string;
    fulfillmentId?: number;
    orderItemId?: number;
    instanceId?: number;
    serialNumber?: string;
    macAddress?: string;
    modelId?: number;
    modelName?: string;
    instanceStatus?: string;
    progress?: FulfillmentProgress;
    linkedAt?: string;
};

