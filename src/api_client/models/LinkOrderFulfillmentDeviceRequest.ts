/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Payload to link a physical LED unit to an order item via serial number
 */
export type LinkOrderFulfillmentDeviceRequest = {
    /**
     * ID of the order item to be fulfilled (retrieved from GET /api/management/staff/orders/{id})
     */
    orderItemId: number;
    /**
     * Serial number printed on the LED unit label or packaging
     */
    serialNumber: string;
};

