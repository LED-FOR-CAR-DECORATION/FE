/**
 * Danh sách nhân vật của designer trong cache TanStack, dùng chung giữa studio, đăng bán, đăng tải phiên bản
 * và workspace commission. Mọi thao tác ghi trong lib/api/designerCharacters.ts tự invalidate cache này.
 *
 * BE chưa có GET nhân vật theo id (docs/api-fetch-optimization.md, API #12) nên studio vẫn tìm trong danh sách —
 * nhưng danh sách chỉ tải một lần cho mọi trang designer.
 */
import { fetchCharacterVersions, fetchMyCharacters, type DesignerCharacterItem } from "@/lib/api/designerCharacters";
import { fetchAllPages } from "@/lib/api/paging";
import { getQueryClient } from "@/lib/query/client";

export const DESIGNER_CHARACTERS_KEY = ["designer", "characters"] as const;
const ALL_KEY = [...DESIGNER_CHARACTERS_KEY, "all"] as const;
const COMMISSION_KEY = [...DESIGNER_CHARACTERS_KEY, "COMMISSION"] as const;
const STALE_MS = 60_000;

type ForceOption = { force?: boolean };

/** Toàn bộ nhân vật của designer hiện tại (mọi loại). */
export function fetchAllMyCharactersCached({ force = false }: ForceOption = {}): Promise<DesignerCharacterItem[]> {
  return getQueryClient().fetchQuery({
    queryKey: ALL_KEY,
    queryFn: () =>
      fetchAllPages(async (page) => {
        const res = await fetchMyCharacters({ page, size: 100 });
        return { items: res.items, totalPages: res.meta.totalPages };
      }),
    staleTime: force ? 0 : STALE_MS,
  });
}

/** Nhân vật loại COMMISSION (trang đầu, tối đa 100 — giữ nguyên giới hạn cũ). */
export function fetchCommissionCharactersCached({ force = false }: ForceOption = {}): Promise<DesignerCharacterItem[]> {
  return getQueryClient().fetchQuery({
    queryKey: COMMISSION_KEY,
    queryFn: async () => (await fetchMyCharacters({ page: 0, size: 100, characterType: "COMMISSION" })).items,
    staleTime: force ? 0 : STALE_MS,
  });
}

/**
 * Phiên bản của một nhân vật (cache 30s). Tạo/xoá phiên bản đã invalidate cả nhóm ["designer","characters"],
 * nên sau khi đăng tải/xoá, lần gọi kế tiếp luôn lấy dữ liệu mới.
 */
export function fetchCharacterVersionsCached(characterId: number, { force = false }: ForceOption = {}) {
  return getQueryClient().fetchQuery({
    queryKey: [...DESIGNER_CHARACTERS_KEY, characterId, "versions"],
    queryFn: () => fetchCharacterVersions(characterId),
    staleTime: force ? 0 : 30_000,
  });
}
