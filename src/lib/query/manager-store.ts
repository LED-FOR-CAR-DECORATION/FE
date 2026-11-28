/**
 * Danh sách quản lý cửa hàng (sản phẩm, bundle, gói hội viên) trong cache ngắn hạn.
 *
 * Trang "Niêm yết & giá" mount nhiều bảng cùng lúc, mỗi bảng tự gọi các list này (vd. admin/store/products ×5),
 * và đây là nhóm endpoint chậm nhất trên monitoring (TB ~2s, p95 6–8s). Cache 30s gộp các lần gọi trùng; mọi thao
 * tác ghi trong lib/api/{products,bundles,subscriptions}.ts gọi `markStoreChanged()` để lần sau tải mới.
 */
import { getQueryClient } from "./client";

const MANAGER_STORE_KEY = "manager-store";
const STALE_MS = 30_000;

export function cachedManagerStore<T>(name: string, params: unknown, fetcher: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return fetcher();
  return getQueryClient().fetchQuery({
    queryKey: [MANAGER_STORE_KEY, name, params ?? null],
    queryFn: fetcher,
    staleTime: STALE_MS,
  });
}

/** Sau khi tạo/sửa/xoá sản phẩm, bundle, gói, tag: bỏ cache quản lý và cache cửa hàng công khai. */
export function markStoreChanged(): void {
  if (typeof window === "undefined") return;
  const queryClient = getQueryClient();
  void queryClient.invalidateQueries({ queryKey: [MANAGER_STORE_KEY] });
  void queryClient.invalidateQueries({ queryKey: ["store"] });
}
