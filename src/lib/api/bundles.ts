import { cachedManagerStore, markStoreChanged } from "@/lib/query/manager-store";
import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";
import {
  fetchAdminCharacters,
  fetchManagedStoreProducts,
  fetchStoreProducts,
} from "./products";
import { fetchManagedLedModels } from "./ledInstances";
import { fetchCharacterVersions, type CharacterVersionItem } from "./designerCharacters";

export interface BundleSelectableItem {
  productId: number;
  targetId: number; // modelId for LED, versionId for CHARACTER
  itemType: "LED" | "CHARACTER";
  name: string;
  subtitle?: string;
  price: number;
  previewUrl?: string;
}

export function normalizeBundleHttpUrl(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/") && typeof window !== "undefined") {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

export async function fetchBundleSelectableItems(): Promise<{
  ledOptions: BundleSelectableItem[];
  characterOptions: BundleSelectableItem[];
}> {
  const managedProductsPromise = fetchManagedStoreProducts({ size: 200 }).catch(async () => {
    const publicRes = await fetchStoreProducts({ size: 100 }).catch(() => ({ items: [] }));
    return {
      items: publicRes.items.map((p) => ({
        productId: p.productId ?? Number(p.id),
        productName: p.name,
        description: p.description,
        productType: (p.productType === "LED_MODEL" ? "LED" : p.productType) as
          | "LED"
          | "CHARACTER"
          | "BUNDLE"
          | "SUBSCRIPTION",
        status: "PUBLISHED" as const,
        basePrice: p.price,
        thumbnailUrl: p.previewUrl,
        galleryUrls: p.galleryUrls ?? [],
        tags: [],
      })),
    };
  });

  const [productsRes, ledModels, characters] = await Promise.all([
    managedProductsPromise,
    fetchManagedLedModels().catch(() => []),
    fetchAdminCharacters({ characterType: "STORE", size: 100 }).catch(() => []),
  ]);

  const ledModelByProductId = new Map<number, (typeof ledModels)[number]>();
  for (const model of ledModels) {
    if (model.productId != null) {
      ledModelByProductId.set(model.productId, model);
    }
  }

  const versionLists = await Promise.all(
    characters
      .filter((c) => (c.totalVersions ?? 0) > 0)
      .map((c) => fetchCharacterVersions(c.characterId).catch(() => [] as CharacterVersionItem[])),
  );
  const versionByProductId = new Map<number, CharacterVersionItem>();
  for (const list of versionLists) {
    for (const v of list) {
      if (v.productId != null) {
        versionByProductId.set(v.productId, v);
      }
    }
  }

  const ledOptions: BundleSelectableItem[] = [];
  const characterOptions: BundleSelectableItem[] = [];

  for (const p of productsRes.items) {
    if (p.productId == null || p.status === "DELETED") continue;
    const statusSuffix =
      p.status === "UNPUBLISHED"
        ? " • Chờ duyệt"
        : p.status === "ARCHIVED"
          ? " • Ngừng bán"
          : "";

    if (p.productType === "LED") {
      const matchedModel = ledModelByProductId.get(p.productId);
      if (matchedModel?.modelId != null) {
        ledOptions.push({
          productId: p.productId,
          targetId: matchedModel.modelId,
          itemType: "LED",
          name: p.productName,
          subtitle: `Mẫu LED #${matchedModel.modelId} • Tồn kho ${matchedModel.stockQuantity}${statusSuffix}`,
          price: Number(p.basePrice ?? 0),
          previewUrl: p.thumbnailUrl || undefined,
        });
      }
    } else if (p.productType === "CHARACTER") {
      const matchedVersion = versionByProductId.get(p.productId);
      if (matchedVersion?.versionId != null) {
        characterOptions.push({
          productId: p.productId,
          targetId: matchedVersion.versionId,
          itemType: "CHARACTER",
          name: p.productName,
          subtitle: `Phiên bản v${matchedVersion.versionNumber} • ID #${matchedVersion.versionId}${statusSuffix}`,
          price: Number(p.basePrice ?? 0),
          previewUrl: matchedVersion.previewGifUrl || p.thumbnailUrl || undefined,
        });
      }
    }
  }

  return { ledOptions, characterOptions };
}

export interface BundleConstituentItem {
  itemType?: "LED" | "CHARACTER";
  productId?: number | null;
  modelId?: number | null;
  modelName?: string | null;
  stockQuantity?: number | null;
  specifications?: Record<string, unknown> | null;
  versionId?: number | null;
  characterId?: number | null;
  characterName?: string | null;
  versionNumber?: number | null;
  previewGifUrl?: string | null;
  thumbnailUrl?: string | null;
  unitPrice?: number | null;
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
async function fetchManagedBundlesUncached(params?: {
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

/** Có cache ngắn hạn dùng chung (lib/query/manager-store.ts). */
export function fetchManagedBundles(params?: Parameters<typeof fetchManagedBundlesUncached>[0]) {
  return cachedManagerStore("bundles", params, () => fetchManagedBundlesUncached(params));
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
  markStoreChanged();
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
  markStoreChanged();
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
  markStoreChanged();
}

