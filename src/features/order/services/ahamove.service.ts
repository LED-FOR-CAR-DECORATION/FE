import type { MockOrder } from "@/features/order/types";

export interface AhamoveCreateOrderPayload {
  order_time: number;
  service_id: string;
  path: Array<{ lat: number; lng: number; address: string; short_address?: string }>;
  requests: Array<{
    id: string;
    num: number;
    name: string;
    price: number;
    weight: number;
    description: string;
  }>;
  payment_method: "CASH" | "BALANCE";
  pickup_payment: 0 | 1;
  comments: string;
}

export interface AhamoveCreateOrderResult {
  orderId: string;
  expectedAt: string;
}

/**
 * Frontend mock adapter for Ahamove's POST /v3/orders.
 * The payload mirrors the documented Ahamove contract; a backend proxy should
 * replace this method so the Ahamove token never reaches the browser.
 */
export const ahamoveService = {
  async createOrder(order: MockOrder): Promise<AhamoveCreateOrderResult> {
    const payload: AhamoveCreateOrderPayload = {
      order_time: 0,
      service_id: "SGN-2H",
      path: [
        { lat: 10.7769, lng: 106.7009, address: "Mirage Store", short_address: "Mirage" },
        { lat: 10.7769, lng: 106.7009, address: order.address.fullAddress, short_address: order.address.fullAddress },
      ],
      requests: order.items.map((item) => ({
        id: item.id,
        num: item.quantity,
        name: item.name,
        price: Math.round(item.price * 100),
        weight: 500,
        description: item.name,
      })),
      payment_method: "CASH",
      pickup_payment: 0,
      comments: `LED Controller order ${order.id}`,
    };

    void payload;
    await new Promise((resolve) => setTimeout(resolve, 450));
    return {
      orderId: `AHM-${order.id}`,
      expectedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};
