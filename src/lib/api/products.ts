import axios from "axios";
import {
  ProductFilterRequest,
  StoreProductsService,
  StoreTagsService,
  type ApiResponseListProductItem,
  type ApiResponseProductDetailResponse,
  type ProductDetailResponse,
  type ProductItem,
  type TagItem,
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
    id: String(bItem.modelId ?? bItem.versionId ?? idx),
    productType: bItem.itemType === "LED" ? "LED_MODEL" : "CHARACTER",
    name: bItem.modelName ?? bItem.characterName ?? "Thành phần gói",
    price: 0,
    quantity: bItem.quantity,
    previewUrl: bItem.previewGifUrl ?? undefined,
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
    format: detail.characterDetails ? "LED_BINARY" : undefined,
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
