import { ApiError } from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "./client";

export interface CustomerOwnedCharacterItem {
  characterId: number;
  characterName: string;
  previewGifUrl: string;
  frameCount: number | null;
  frameDelayMs: number | null;
  orderId: number;
  storeProductId: number;
  productName: string;
  purchasedPrice: number;
  purchasedAt: string;
}

interface ApiEnvelope<T> {
  data?: T;
}

export function formatOwnedCharactersError(
  error: unknown,
  fallbackMessage = "Không thể tải danh sách nhân vật đã sở hữu.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Vui lòng đăng nhập để xem thư viện nhân vật đã sở hữu.";
    }
    if (error.status === 403) {
      return "Chỉ tài khoản Khách hàng mới có thể truy cập thư viện nhân vật đã mua.";
    }
    const serverMessage =
      error.body &&
      typeof error.body === "object" &&
      typeof (error.body as { message?: unknown }).message === "string"
        ? (error.body as { message: string }).message
        : null;
    if (serverMessage) return serverMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export async function fetchCustomerOwnedCharacters(): Promise<
  CustomerOwnedCharacterItem[]
> {
  const res = await request<ApiEnvelope<CustomerOwnedCharacterItem[]>>(OpenAPI, {
    method: "GET",
    url: "/api/customer/characters/owned",
    errors: {
      401: "Authentication is required.",
      403: "Access is denied.",
    },
  });

  const rawItems = Array.isArray(res.data) ? res.data : [];
  return rawItems.map((item) => ({
    characterId: Number(item.characterId),
    characterName: item.characterName ?? "Nhân vật",
    previewGifUrl: item.previewGifUrl ?? "",
    frameCount: item.frameCount ?? null,
    frameDelayMs: item.frameDelayMs ?? null,
    orderId: Number(item.orderId),
    storeProductId: Number(item.storeProductId),
    productName: item.productName ?? item.characterName ?? "Sản phẩm nhân vật",
    purchasedPrice: Number(item.purchasedPrice ?? 0),
    purchasedAt: item.purchasedAt ?? "",
  }));
}

