/**
 * Shared contact-field rules (UI standard §4).
 * Backend accepts `^\+?[0-9]{8,15}$`; the normalized `0xxxxxxxxx` form always satisfies it.
 */

const VN_MOBILE = /^0(3|5|7|8|9)\d{8}$/;
const RECIPIENT_NAME = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;
const HOUSE_DETAIL = /^[\p{L}\p{N}\s,./#():&-]{2,100}$/u;
const RAW_COORDINATES = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;

/** Backend limit for `fullAddress` on AddUserAddressRequest. */
export const FULL_ADDRESS_MAX = 255;

/** Returns the phone as `0xxxxxxxxx`, or null when it is not a Vietnamese mobile number. */
export function normalizeVnMobile(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+84")) digits = "0" + digits.slice(3);
  else if (/^84\d{9}$/.test(digits)) digits = "0" + digits.slice(2);
  return VN_MOBILE.test(digits) ? digits : null;
}

/** `0912345678` → `0912 345 678`; other values are returned unchanged. */
export function formatVnMobile(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

export function validateRecipientName(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Vui lòng nhập họ và tên người nhận.";
  if (!RECIPIENT_NAME.test(trimmed)) return "Họ tên chỉ gồm chữ cái, 2–100 ký tự.";
  return null;
}

export function validateVnMobile(value: string): string | null {
  if (!value.trim()) return "Vui lòng nhập số điện thoại.";
  if (!normalizeVnMobile(value)) return "Số điện thoại chưa đúng. Nhập số di động 10 chữ số, VD 0912 345 678.";
  return null;
}

export function validateHouseDetail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập số nhà, hẻm hoặc tòa nhà.";
  if (!HOUSE_DETAIL.test(trimmed)) return "Số nhà chỉ gồm chữ, số và , . / # ( ) : & - (2–100 ký tự).";
  return null;
}

function sanitizeHouseCandidate(raw: string): string {
  return raw
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s,./#():&-]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .slice(0, 100)
    .trim();
}

/**
 * Extracts a concise street/building detail from a Goong formatted map address
 * so the house-detail input can be auto-filled when the customer picks a place.
 */
export function extractHouseDetailFromMapAddress(mapAddress: string): string {
  const trimmed = mapAddress.trim();
  if (!trimmed || RAW_COORDINATES.test(trimmed)) return "";

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  const primary =
    parts.length >= 4
      ? parts.slice(0, parts.length - 3).join(", ")
      : parts[0];

  const candidate = sanitizeHouseCandidate(primary);
  if (candidate.length >= 2) return candidate;

  return sanitizeHouseCandidate(parts.slice(0, Math.min(2, parts.length)).join(", "));
}

/** Joins the typed house detail with the map address while removing overlapping leading segments. */
export function composeFullAddress(houseDetail: string, mapAddress: string): string {
  const house = houseDetail.trim();
  const map = mapAddress.trim();
  if (!house) return map;
  if (!map) return house;
  if (map.toLowerCase().startsWith(house.toLowerCase())) return map;

  const houseParts = house.split(",").map((p) => p.trim()).filter(Boolean);
  const mapParts = map.split(",").map((p) => p.trim()).filter(Boolean);
  const maxOverlap = Math.min(houseParts.length, mapParts.length);

  for (let overlap = maxOverlap; overlap >= 1; overlap--) {
    const houseTail = houseParts.slice(houseParts.length - overlap);
    const mapHead = mapParts.slice(0, overlap);
    if (houseTail.every((part, idx) => part.toLowerCase() === mapHead[idx].toLowerCase())) {
      const remainingMap = mapParts.slice(overlap).join(", ");
      return remainingMap ? `${house}, ${remainingMap}` : house;
    }
  }

  return `${house}, ${map}`;
}
