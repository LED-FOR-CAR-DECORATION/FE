import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";
import { fetchStoreProductDetail, fetchStoreProducts } from "./products";
import { ProductFilterRequest } from "@/api_client/models/ProductFilterRequest";
import type { CatalogProduct } from "@/features/cart/catalog";

export type SubscriptionPlanStatus =
  | "UNPUBLISHED"
  | "PUBLISHED"
  | "HIDDEN"
  | "ARCHIVED"
  | "DELETED"
  | string;

export interface ManagedSubscriptionPlan {
  subscriptionDetailId: number;
  productId: number;
  planCode: string;
  planName: string;
  basePrice: number;
  isLifetime: boolean;
  durationDays: number | null;
  allAccessCharacters: boolean;
  status: SubscriptionPlanStatus;
  createdAt: string;
}

export interface SubscriptionDetailResult extends ManagedSubscriptionPlan {
  description?: string | null;
  thumbnailUrl?: string | null;
  tagIds?: number[];
}

export interface CreateSubscriptionPayload {
  planName: string;
  planCode: string;
  basePrice: number;
  description?: string;
  thumbnailUrl?: string;
  isLifetime: boolean;
  durationDays?: number | null;
  allAccessCharacters: boolean;
  tagIds?: number[];
}

export interface UpdateSubscriptionPayload {
  planName: string;
  basePrice: number;
  description?: string;
  thumbnailUrl?: string;
  durationDays?: number | null;
  allAccessCharacters: boolean;
}

interface ApiEnvelope<T> {
  code?: string;
  message?: string;
  data: T;
  meta?: unknown;
}

export async function fetchManagedSubscriptions(): Promise<ManagedSubscriptionPlan[]> {
  const token = await getSessionToken();
  const { data: envelope } = await axios.get<ApiEnvelope<ManagedSubscriptionPlan[]>>(
    "/api/management/admin/store/subscriptions",
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

export async function apiCreateSubscription(
  payload: CreateSubscriptionPayload,
): Promise<SubscriptionDetailResult> {
  const token = await getSessionToken();
  const { data: envelope } = await axios.post<ApiEnvelope<SubscriptionDetailResult>>(
    "/api/management/admin/store/subscriptions",
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return envelope.data;
}

export async function apiUpdateSubscription(
  subscriptionDetailId: number,
  payload: UpdateSubscriptionPayload,
): Promise<SubscriptionDetailResult> {
  const token = await getSessionToken();
  const { data: envelope } = await axios.put<ApiEnvelope<SubscriptionDetailResult>>(
    `/api/management/admin/store/subscriptions/${subscriptionDetailId}`,
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return envelope.data;
}

/** Fetch all PUBLISHED subscription plans with full details for the Customer storefront */
export async function fetchPublicSubscriptionPlans(): Promise<CatalogProduct[]> {
  const listRes = await fetchStoreProducts({
    productType: ProductFilterRequest.productType.SUBSCRIPTION,
    page: 0,
    size: 50,
  });

  const hydrated = await Promise.all(
    listRes.items.map(async (item) => {
      try {
        const detail = await fetchStoreProductDetail(item.id);
        return detail ?? item;
      } catch {
        return item;
      }
    }),
  );

  return hydrated.sort((a, b) => a.price - b.price);
}

export function formatSubscriptionApiError(err: any): string {
  const status: number | undefined = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.body;
  const code = data?.code;
  const serverMessage =
    data && typeof data === "object" && typeof data.message === "string"
      ? data.message
      : null;

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.";
  }
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này. Chức năng chỉ dành cho MANAGER (403).";
  }
  if (status === 409 || code === "PLAN_CODE_ALREADY_EXISTS") {
    return "Mã gói (planCode) này đã tồn tại trên hệ thống. Vui lòng chọn mã khác.";
  }
  if (status === 404 || code === "SUBSCRIPTION_NOT_FOUND") {
    return serverMessage || "Không tìm thấy gói hội viên hoặc thẻ phân loại tương ứng (404).";
  }
  if (code === "INVALID_SUBSCRIPTION_DURATION") {
    return "Thời hạn gói không hợp lệ: gói có thời hạn cần số ngày > 0, gói vĩnh viễn không được nhập số ngày.";
  }
  if (status === 400) {
    const details = Array.isArray(data?.details) ? data.details : [];
    if (details.length > 0) {
      const detailText = details
        .map((d: any) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .filter(Boolean)
        .join("; ");
      return `Dữ liệu không hợp lệ (400): ${detailText}`;
    }
    return serverMessage || "Dữ liệu nhập vào chưa hợp lệ (400).";
  }

  return serverMessage || err?.message || "Thao tác thất bại. Vui lòng thử lại.";
}
