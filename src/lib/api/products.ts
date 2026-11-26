import axios from "axios";
import {
  ProductFilterRequest,
  StoreProductsService,
  StoreTagsService,
  type ApiResponseListProductItem,
  type ApiResponseProductDetailResponse,
  type CreateStoreProductRequest,
  type CreatedStoreProductResponse,
  type ProductDetailResponse,
  type ProductItem,
  type TagItem,
  type UpdateStoreProductRequest,
  type UpdatedStoreProductResponse,
} from "@/api_client";
import { request } from "@/api_client/core/request";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export function mapBackendProductType(type?: string): ProductType {
  if (type === "LED" || type === "LED_MODEL") return "LED_MODEL";
  if (type === "CHARACTER") return "CHARACTER";
  if (type === "BUNDLE") return "BUNDLE";
  if (type === "SUBSCRIPTION") return "SUBSCRIPTION";
  return "LED_MODEL";
}

export function mapFrontendToBackendProductType(
  type?: ProductType | "all",
): ProductFilterRequest.productType | undefined {
  if (!type || type === "all") return undefined;
  if (type === "LED_MODEL") return ProductFilterRequest.productType.LED;
  if (type === "CHARACTER") return ProductFilterRequest.productType.CHARACTER;
  if (type === "BUNDLE") return ProductFilterRequest.productType.BUNDLE;
  if (type === "SUBSCRIPTION") return ProductFilterRequest.productType.SUBSCRIPTION;
  return undefined;
}

export function mapProductItemToCatalog(item: ProductItem): CatalogProduct {
  const numericId = item.productId ?? 0;
  return {
    id: String(numericId),
    productId: numericId,
    productType: mapBackendProductType(item.productType),
    name: item.productName ?? "Sản phẩm",
    price: Number(item.basePrice ?? 0),
    description: item.description ?? "",
    previewUrl: item.thumbnailUrl || item.galleryUrls?.[0] || undefined,
    galleryUrls: item.galleryUrls ?? [],
    tags: item.tags ?? [],
  };
}

export function mapProductDetailToCatalog(detail: ProductDetailResponse): CatalogProduct {
  const components: CatalogProduct[] | undefined = detail.bundleDetails?.items?.map((bItem, idx) => ({
    id: String(bItem.productId ?? bItem.modelId ?? bItem.versionId ?? idx),
    productId: bItem.productId ?? undefined,
    productType: bItem.itemType === "LED" ? "LED_MODEL" : "CHARACTER",
    name: bItem.modelName ?? bItem.characterName ?? "Thành phần gói",
    price: Number(bItem.unitPrice ?? 0),
    quantity: bItem.quantity,
    previewUrl: bItem.previewGifUrl || bItem.thumbnailUrl || undefined,
  }));

  return {
    id: String(detail.productId),
    productId: detail.productId,
    productType: mapBackendProductType(detail.productType),
    name: detail.productName,
    price: Number(detail.basePrice ?? 0),
    description: detail.description ?? "",
    previewUrl:
      detail.characterDetails?.previewGifUrl ||
      detail.thumbnailUrl ||
      detail.galleryUrls?.[0] ||
      undefined,
    galleryUrls: detail.galleryUrls ?? [],
    tags: detail.tags ?? [],
    format: detail.characterDetails ? "GIF" : undefined,
    animationType:
      detail.characterDetails && (detail.characterDetails.frameCount ?? 0) > 1
        ? "LOOP"
        : "STATIC",
    components,
    ledDetails: detail.ledDetails,
    characterDetails: detail.characterDetails,
    bundleDetails: detail.bundleDetails,
    subscriptionDetails: detail.subscriptionDetails,
  };
}

export interface FetchProductsParams {
  productType?: ProductFilterRequest.productType;
  categoryTag?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
}

export async function fetchStoreProducts(
  params: FetchProductsParams = {},
): Promise<{ items: CatalogProduct[]; totalElements: number; totalPages: number }> {
  const res = await request<ApiResponseListProductItem>(OpenAPI, {
    method: "GET",
    url: "/api/store/products",
    query: {
      productType: params.productType,
      categoryTag: params.categoryTag,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      page: params.page ?? 0,
      size: params.size ?? 100,
    },
  });
  const rawItems = res.data ?? [];
  return {
    items: rawItems.map(mapProductItemToCatalog),
    totalElements: res.meta?.totalElements ?? rawItems.length,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchStoreProductDetail(productId: string | number): Promise<CatalogProduct | null> {
  const numericId = Number(productId);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  try {
    const res: ApiResponseProductDetailResponse = await StoreProductsService.getProductDetail(numericId);
    if (!res.data) return null;
    return mapProductDetailToCatalog(res.data);
  } catch {
    return null;
  }
}

export async function fetchStoreTags(): Promise<TagItem[]> {
  try {
    const res = await StoreTagsService.listTags();
    return (res.data as unknown as TagItem[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function apiCreateStoreTag(payload: { name: string; description?: string }): Promise<TagItem> {
  const token = await getSessionToken();
  const { data } = await axios.post<{ data: TagItem }>(
    "/api/management/admin/store/tags",
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

export async function apiUpdateStoreTag(
  id: number,
  payload: { name: string; description?: string },
): Promise<TagItem> {
  const token = await getSessionToken();
  const { data } = await axios.put<{ data: TagItem }>(
    `/api/management/admin/store/tags/${id}`,
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

export async function apiDeleteStoreTag(id: number): Promise<void> {
  const token = await getSessionToken();
  await axios.delete(`/api/management/admin/store/tags/${id}`, {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export type BackendProductStatus = "UNPUBLISHED" | "PUBLISHED" | "ARCHIVED" | "DELETED";

export interface ManagedStoreProductItem {
  productId: number;
  productName: string;
  description?: string | null;
  productType: "LED" | "CHARACTER" | "BUNDLE" | "SUBSCRIPTION";
  status: BackendProductStatus;
  basePrice: number;
  thumbnailUrl?: string | null;
  galleryUrls: string[];
  tags: TagItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export async function fetchManagedStoreProducts(params?: {
  productType?: "LED" | "CHARACTER" | "BUNDLE" | "SUBSCRIPTION";
  status?: BackendProductStatus;
  page?: number;
  size?: number;
}): Promise<{ items: ManagedStoreProductItem[]; totalElements: number; totalPages: number }> {
  const token = await getSessionToken();
  const { data: envelope } = await axios.get<{
    data?: ManagedStoreProductItem[];
    meta?: { totalElements?: number; totalPages?: number };
  }>("/api/management/admin/store/products", {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params: {
      productType: params?.productType,
      status: params?.status,
      page: params?.page ?? 0,
      size: params?.size ?? 200,
    },
  });
  const items = Array.isArray(envelope?.data) ? envelope.data : [];
  return {
    items,
    totalElements: envelope?.meta?.totalElements ?? items.length,
    totalPages: envelope?.meta?.totalPages ?? 1,
  };
}

export async function apiUpdateProductStatus(
  productId: number,
  status: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED",
): Promise<void> {
  const token = await getSessionToken();
  await axios.patch(
    `/api/management/admin/store/products/${productId}/status`,
    { status },
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
}

export async function apiCreateStoreProduct(
  payload: CreateStoreProductRequest,
): Promise<CreatedStoreProductResponse> {
  const token = await getSessionToken();
  const { data } = await axios.post<{ data: CreatedStoreProductResponse }>(
    "/api/management/admin/store/products",
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

export async function apiUpdateStoreProduct(
  productId: number,
  payload: UpdateStoreProductRequest,
): Promise<UpdatedStoreProductResponse> {
  const token = await getSessionToken();
  const { data } = await axios.put<{ data: UpdatedStoreProductResponse }>(
    `/api/management/admin/store/products/${productId}`,
    payload,
    {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return data.data;
}

export async function apiDeleteStoreProduct(productId: number): Promise<void> {
  const token = await getSessionToken();
  try {
    await axios.delete(`/api/management/admin/store/products/${productId}`, {
      baseURL: getApiBaseUrl(),
      withCredentials: OpenAPI.WITH_CREDENTIALS,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // Đã được xóa mềm trên server trước đó
      return;
    }
    throw err;
  }
}

export interface AdminCharacterSummary {
  characterId: number;
  characterName: string;
  description: string | null;
  characterType?: "STORE" | "COMMISSION";
  commissionId?: number | null;
  author?: {
    employeeId: number;
    fullName: string;
    email: string;
  } | null;
  totalVersions: number;
  createdAt: string;
}

export async function fetchAdminCharacters(params?: {
  query?: string;
  creatorEmployeeId?: number;
  characterType?: "STORE" | "COMMISSION";
  commissionId?: number;
  page?: number;
  size?: number;
}): Promise<AdminCharacterSummary[]> {
  const token = await getSessionToken();
  try {
    const res = await axios.get<{ data: AdminCharacterSummary[] }>(
      "/api/management/admin/characters",
      {
        baseURL: getApiBaseUrl(),
        withCredentials: OpenAPI.WITH_CREDENTIALS,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: {
          query: params?.query || undefined,
          creatorEmployeeId: params?.creatorEmployeeId || undefined,
          characterType: params?.characterType || undefined,
          commissionId: params?.commissionId || undefined,
          page: params?.page ?? 0,
          size: params?.size ?? 100,
        },
      },
    );
    return (res.data?.data ?? []).map((item) => ({
      ...item,
      characterType: item.characterType ?? "STORE",
      commissionId: item.commissionId ?? null,
    }));
  } catch (err) {
    console.warn("fetchAdminCharacters backend call failed:", err);
    return [];
  }
}
