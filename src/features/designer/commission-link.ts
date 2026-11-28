import {
  createDesignerCharacter,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { fetchCommissionCharactersCached } from "./designer-characters-cache";
import { setStoredMatrixSize, type MatrixSize } from "./context/DesignerCharactersContext";

/**
 * Character của commission là một character bình thường trong thư viện designer.
 * Liên kết được ghi bằng dấu `[COMMISSION #id]` ở đầu mô tả (bền, thấy được trên mọi máy),
 * kèm bản nhớ localStorage để tìm nhanh.
 */
const STORAGE_PREFIX = "designer_commission_character_";
const MARKER = /\[COMMISSION #(\d+)\]/;
const MAX_DESCRIPTION = 500;

export function commissionMarker(commissionId: number) {
  return `[COMMISSION #${commissionId}]`;
}

/** Mã commission mà character này thuộc về (nếu có). */
export function linkedCommissionId(description?: string | null): number | undefined {
  const match = description?.match(MARKER);
  return match ? Number(match[1]) : undefined;
}

/** Bỏ dấu liên kết khi hiển thị mô tả. */
export function stripCommissionMarker(description?: string | null) {
  return (description ?? "").replace(MARKER, "").trim();
}

/** "32x64" (hàng × cột của commission) → khổ "rộng x cao" của studio; khác 3 khổ hỗ trợ thì trả undefined. */
export function studioMatrixSize(dimensions?: string | null): MatrixSize | undefined {
  const numbers = (dimensions ?? "").match(/\d+/g)?.map(Number).sort((a, b) => a - b);
  if (!numbers || numbers.length !== 2) return undefined;
  const key = numbers.join("x");
  return key === "32x32" ? "32x32" : key === "32x64" ? "64x32" : key === "64x64" ? "64x64" : undefined;
}

function remember(commissionId: number, characterId: number) {
  try { window.localStorage.setItem(`${STORAGE_PREFIX}${commissionId}`, String(characterId)); } catch { /* bỏ qua */ }
}

function recalled(commissionId: number) {
  try { return Number(window.localStorage.getItem(`${STORAGE_PREFIX}${commissionId}`)) || undefined; } catch { return undefined; }
}

/** Tìm character đã liên kết với commission trong thư viện của designer hiện tại. */
export async function findCommissionCharacter(commissionId: number): Promise<DesignerCharacterItem | undefined> {
  const items = await fetchCommissionCharactersCached();
  const cachedId = recalled(commissionId);
  const matches = (item: DesignerCharacterItem) =>
    item.commissionId === commissionId || linkedCommissionId(item.description) === commissionId;
  const found =
    items.find((item) => item.characterId === cachedId && matches(item)) ?? items.find(matches);
  if (found) remember(commissionId, found.characterId);
  return found;
}

/** Tạo character mới cho commission (tên = tiêu đề commission, khóa kích thước theo commission). */
export async function createCommissionCharacter(commission: {
  commissionId: number;
  title: string;
  description?: string | null;
  targetMatrixDimensions?: string | null;
}) {
  const brief = (commission.description ?? "").trim();
  const description = `${commissionMarker(commission.commissionId)} ${brief}`.slice(0, MAX_DESCRIPTION).trim();
  const created = await createDesignerCharacter({
    characterName: commission.title.slice(0, 120),
    description,
    characterType: "COMMISSION",
    commissionId: commission.commissionId,
  });
  setStoredMatrixSize(created.characterId, studioMatrixSize(commission.targetMatrixDimensions) ?? "32x32");
  remember(commission.commissionId, created.characterId);
  return created;
}
