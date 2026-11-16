import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export interface BundleConstituentItem {
  modelId?: number | null;
  versionId?: number | null;
  quantity: number;
}

export interface CreateBundlePayload {
  bundleName: string;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  bundlePrice: number;
  tagIds?: number[];
  items: BundleConstituentItem[];
}

export interface UpdateBundlePayload {
  bundleName: string;
  description?: string;
  thumbnailUrl?: string;
  bundlePrice: number;
  items?: BundleConstituentItem[];
}

export interface ManagedBundleItem {
  bundleId: number;
  productId: number;
  bundleName: string;
  description: string | null;
  originalPrice: number;
  bundlePrice: number;
  status: "UNPUBLISHED" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  itemCount: number;
}

export interface ManagedBundleDetail {
  bundleId: number;
  productId: number;
  bundleName: string;
  description: string;
  thumbnailUrl: string;
  galleryUrls: string[];
  originalPrice: number;
  bundlePrice: number;
  status: string;
  tagIds: number[];
  items: BundleConstituentItem[];
}

export interface ManagedBundleListResponse {
  items: ManagedBundleItem[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Lấy danh sách bundles cho Manager quản lý
 * GET /api/management/admin/store/bundles
 */
export async function fetchManagedBundles(params?: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<ManagedBundleListResponse> {
  const token = await getSessionToken();
  const queryParams: Record<string, string | number> = {
    page: params?.page ?? 0,
    size: params?.size ?? 50,
  };
  if (params?.status && params.status !== "ALL") {
    queryParams.status = params.status;
  }

  const { data } = await axios.get<{
    data: ManagedBundleItem[];
    meta?: {
      page?: number;
      size?: number;
      totalElements?: number;
      totalPages?: number;
    };
  }>("/api/management/admin/store/bundles", {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params: queryParams,
  });

  const rawItems = data.data ?? [];
  return {
    items: rawItems,
    totalElements: data.meta?.totalElements ?? rawItems.length,
    totalPages: data.meta?.totalPages ?? 1,
    currentPage: data.meta?.page ?? 0,
  };
}

/**
 * Lấy chi tiết bundle và các item cấu thành
 * GET /api/management/admin/store/bundles/{id}
 */
export async function fetchManagedBundleDetail(id: number): Promise<ManagedBundleDetail> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: ManagedBundleDetail }>(
    `/api/management/admin/store/bundles/${id}`,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

/**
 * Tạo mới Bundle
 * POST /api/management/admin/store/bundles
 */
export async function apiCreateBundle(payload: CreateBundlePayload): Promise<ManagedBundleDetail> {
  const token = await getSessionToken();
  const { data } = await axios.post<{ data: ManagedBundleDetail }>(
    "/api/management/admin/store/bundles",
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

/**
 * Cập nhật Bundle
 * PUT /api/management/admin/store/bundles/{id}
 */
export async function apiUpdateBundle(
  id: number,
  payload: UpdateBundlePayload,
): Promise<ManagedBundleDetail> {
  const token = await getSessionToken();
  const { data } = await axios.put<{ data: ManagedBundleDetail }>(
    `/api/management/admin/store/bundles/${id}`,
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

/**
 * Xóa hoặc lưu trữ Bundle
 * DELETE /api/management/admin/store/bundles/{id}
 */
export async function apiDeleteBundle(id: number): Promise<void> {
  const token = await getSessionToken();
  await axios.delete(`/api/management/admin/store/bundles/${id}`, {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

