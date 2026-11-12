const TIME_ZONE = "Asia/Ho_Chi_Minh";
const LOCALE = "vi-VN";

/** Fixed time zone + locale so server and client render identical text (no hydration mismatch). */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatVnd(amount: number) {
  return `${amount.toLocaleString(LOCALE)} ₫`;
}
