/**
 * Dữ liệu cửa hàng công khai (catalogue, tag, chi tiết sản phẩm) dùng chung cache giữa các trang.
 * Dữ liệu này đổi rất chậm nên giữ STORE_STALE_MS; `force` dùng cho nút "Tải lại".
 *
 * BE chưa có tìm kiếm/lọc/sort/facets phía server (docs/api-fetch-optimization.md, API #9) nên `/products`
 * vẫn phải tải cả catalogue — nhưng chỉ một lần cho cả trang chủ, `/products` và phần "sản phẩm liên quan".
 */
import type { QueryClient } from "@tanstack/react-query";
import type { TagItem } from "@/api_client";
import type { CatalogProduct } from "@/features/cart/catalog";
import { fetchAllPages } from "@/lib/api/paging";
import { fetchStoreProductDetail, fetchStoreProducts, fetchStoreTags } from "@/lib/api/products";
import { queryKeys } from "./keys";

export const STORE_STALE_MS = 5 * 60_000;

type ForceOption = { force?: boolean };

export function fetchStoreCatalogCached(queryClient: QueryClient, { force = false }: ForceOption = {}): Promise<CatalogProduct[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.store.products(),
    queryFn: () => fetchAllPages((page) => fetchStoreProducts({ page, size: 100 })),
    staleTime: force ? 0 : STORE_STALE_MS,
  });
}

export function fetchStoreTagsCached(queryClient: QueryClient, { force = false }: ForceOption = {}): Promise<TagItem[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.store.tags(),
    queryFn: () => fetchStoreTags(),
    staleTime: force ? 0 : STORE_STALE_MS,
  });
}

export function fetchStoreProductDetailCached(
  queryClient: QueryClient,
  productId: string | number,
  { force = false }: ForceOption = {},
): Promise<CatalogProduct | null> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.store.productDetail(productId),
    queryFn: () => fetchStoreProductDetail(productId),
    staleTime: force ? 0 : STORE_STALE_MS,
  });
}
