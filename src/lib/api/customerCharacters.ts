import { ApiError } from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "./client";
import type { CustomerCommissionSummaryItem } from "@/api_client/models/CustomerCommissionSummaryItem";
import { getCustomerCommission } from "@/features/commission/services/customer-commission.api";

export interface CustomerOwnedCharacterItem {
  sourceType: "ORDER" | "OTHER";
  characterId: number;
  characterName: string;
  previewGifUrl: string;
  frameCount: number | null;
  frameDelayMs: number | null;
  orderId: number | null;
  storeProductId: number | null;
  productName: string;
  purchasedPrice: number | null;
  purchasedAt: string;
  unlockedBySubscription: boolean;
}

export interface CustomerActiveSubscription {
  subscriptionId: number;
  productId: number;
  orderId: number | null;
  planCode: string | null;
  planName: string | null;
  isLifetime: boolean;
  durationDays: number | null;
  allAccessCharacters: boolean;
  maxCommissionRevisions: number;
  maxMobileProfiles: number;
  activatedAt: string;
  expiresAt: string | null;
}

export interface CustomerAcceptedCommissionItem extends Omit<CustomerOwnedCharacterItem, "sourceType" | "characterId"> {
  sourceType: "COMMISSION";
  characterId: null;
  commissionId: number;
  submissionId: number;
}

export type CustomerGalleryItem = CustomerOwnedCharacterItem | CustomerAcceptedCommissionItem;

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
    sourceType: item.orderId == null ? "OTHER" : "ORDER",
    characterId: Number(item.characterId),
    characterName: item.characterName ?? "Nhân vật",
    previewGifUrl: item.previewGifUrl ?? "",
    frameCount: item.frameCount ?? null,
    frameDelayMs: item.frameDelayMs ?? null,
    orderId: item.orderId == null ? null : Number(item.orderId),
    storeProductId: item.storeProductId == null ? null : Number(item.storeProductId),
    productName: item.productName ?? item.characterName ?? "Sản phẩm nhân vật",
    purchasedPrice: item.purchasedPrice == null ? null : Number(item.purchasedPrice),
    purchasedAt: item.purchasedAt ?? "",
    unlockedBySubscription: Boolean(item.unlockedBySubscription),
  }));
}

/** Accepted artwork remains persisted by Commission; use its authorized, fresh media URLs. */
async function fetchAcceptedCommissionArtwork(): Promise<CustomerAcceptedCommissionItem[]> {
  const commissions: CustomerCommissionSummaryItem[] = [];
  const size = 100;
  for (let page = 0; ; page++) {
    const response = await request<{ data: CustomerCommissionSummaryItem[]; meta?: { hasNext?: boolean } }>(OpenAPI, {
      method: "GET", url: "/api/commissions/my", query: { status: "COMPLETED", page, size },
    });
    const items = response.data ?? [];
    commissions.push(...items);
    if (items.length === 0 || !(response.meta?.hasNext ?? items.length === size)) break;
  }

  const artwork: CustomerAcceptedCommissionItem[] = [];
  // Bound parallel detail requests for accounts with a large commission history.
  for (let offset = 0; offset < commissions.length; offset += 6) {
    const details = await Promise.all(commissions.slice(offset, offset + 6).map((item) => getCustomerCommission(item.commissionId!)));
    for (const { data } of details) {
      if (data.status !== "COMPLETED") continue;
      const accepted = data.deliveredPreviews.find((preview) =>
        preview.submissionId === data.approvedSubmissionId && preview.status === "CUSTOMER_ACCEPTED",
      );
      if (!accepted) continue;
      artwork.push({
        sourceType: "COMMISSION", commissionId: data.commissionId, submissionId: accepted.submissionId,
        characterId: null, characterName: data.title, previewGifUrl: accepted.imageUrl,
        frameCount: null, frameDelayMs: null, orderId: null, storeProductId: null,
        productName: data.targetMatrixDimensions ? `Commission · ${data.targetMatrixDimensions}` : "Commission",
        purchasedPrice: data.totalPrice, purchasedAt: data.updatedAt ?? accepted.deliveredAt ?? accepted.createdAt,
        unlockedBySubscription: false,
      });
    }
  }
  return artwork;
}

export async function fetchCustomerGallery(): Promise<CustomerGalleryItem[]> {
  const [purchases, commissions] = await Promise.all([fetchCustomerOwnedCharacters(), fetchAcceptedCommissionArtwork()]);
  return [...purchases, ...commissions].sort((a, b) =>
    (Date.parse(b.purchasedAt) || 0) - (Date.parse(a.purchasedAt) || 0),
  );
}

export async function fetchActiveCustomerSubscription(): Promise<CustomerActiveSubscription | null> {
  const res = await request<ApiEnvelope<CustomerActiveSubscription | null>>(OpenAPI, {
    method: "GET",
    url: "/api/customer/subscriptions/active",
    errors: {
      401: "Authentication is required.",
      403: "Access is denied.",
    },
  });

  if (!res.data) return null;
  return {
    subscriptionId: Number(res.data.subscriptionId),
    productId: Number(res.data.productId),
    orderId: res.data.orderId != null ? Number(res.data.orderId) : null,
    planCode: res.data.planCode ?? null,
    planName: res.data.planName ?? null,
    isLifetime: Boolean(res.data.isLifetime),
    durationDays: res.data.durationDays ?? null,
    allAccessCharacters: Boolean(res.data.allAccessCharacters),
    maxCommissionRevisions: Number(res.data.maxCommissionRevisions ?? 0),
    maxMobileProfiles: Number(res.data.maxMobileProfiles ?? 3),
    activatedAt: res.data.activatedAt ?? "",
    expiresAt: res.data.expiresAt ?? null,
  };
}

