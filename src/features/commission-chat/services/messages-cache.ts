/**
 * Lịch sử tin nhắn của mỗi commission nằm trong cache TanStack (một key cho cả hộp thư lẫn phòng chat).
 *
 * BE chưa có API "tin cuối" hay "tin sau id" (xem docs/api-fetch-optimization.md, mục #3, #4) nên hộp thư phải tải
 * cả lịch sử để lấy tin cuối. Dùng chung cache giúp: mở hội thoại vừa thấy trong hộp thư không tải lại, quay lại
 * hộp thư trong vòng MESSAGES_STALE_MS không tải lại, và tin realtime được ghi thẳng vào cache.
 */
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { createLimiter } from "@/lib/query/limit";
import { listCommissionMessages, mergeMessages, type CommissionMessage } from "./commission-messages.api";

export const MESSAGES_STALE_MS = 60_000;
const runHistory = createLimiter(6);

/** Lịch sử đầy đủ; `force` bỏ qua cache (kết nối lại, poll dự phòng, kiểm tra kết nối). */
export function fetchMessagesCached(
  queryClient: QueryClient,
  commissionId: number,
  { force = false }: { force?: boolean } = {},
): Promise<CommissionMessage[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.commissions.messages(commissionId),
    queryFn: () => runHistory(async () => (await listCommissionMessages(commissionId)).data ?? []),
    staleTime: force ? 0 : MESSAGES_STALE_MS,
    retry: false,
  });
}

/** Tin cuối của hội thoại (undefined nếu chưa có tin hoặc lỗi). */
export async function fetchLastMessageCached(
  queryClient: QueryClient,
  commissionId: number,
  options?: { force?: boolean },
): Promise<CommissionMessage | undefined> {
  try {
    const list = await fetchMessagesCached(queryClient, commissionId, options);
    return list.length ? list[list.length - 1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Gộp tin mới (realtime, tin vừa gửi, thẻ trả về từ thao tác) vào cache nếu hội thoại đã có trong cache.
 * Không tạo mục mới: cache chỉ giữ lịch sử đầy đủ, một tin lẻ không phải là lịch sử.
 */
export function appendMessagesToCache(queryClient: QueryClient, commissionId: number, incoming: CommissionMessage[]): void {
  if (incoming.length === 0) return;
  queryClient.setQueryData<CommissionMessage[]>(queryKeys.commissions.messages(commissionId), (current) =>
    current ? mergeMessages(current, incoming) : current,
  );
}
