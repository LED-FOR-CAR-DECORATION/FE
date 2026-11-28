/** Display helpers for the system monitoring page. Times are shown in Vietnam time. */

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 1000) {
    return `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: ms >= 10_000 ? 1 : 2 })} s`;
  }
  return `${ms.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ms`;
}

export function formatRate(ratio: number | null | undefined): string {
  if (ratio == null) return "—";
  const percent = ratio * 100;
  return `${percent.toLocaleString("vi-VN", { maximumFractionDigits: percent < 1 ? 2 : 1 })}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("vi-VN");
}

export function formatPerMinute(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/phút`;
}

export function formatMb(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1024) return `${(value / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} GB`;
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} MB`;
}

export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export function formatClock(iso: string | null | undefined, withSeconds = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: VN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "dd/MM" in Vietnam time (the vi-VN locale would print "dd-MM"). */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  });
}

/** Latency thresholds used to colour values (BR-GEN-28 placeholders: 2 s average is the alert level). */
export function latencyTone(ms: number | null | undefined): "ok" | "warn" | "bad" | "none" {
  if (ms == null) return "none";
  if (ms >= 2000) return "bad";
  if (ms >= 1000) return "warn";
  return "ok";
}

/** 5xx rate thresholds (BR-GEN-28 placeholder: 5% is the alert level). */
export function errorRateTone(ratio: number | null | undefined): "ok" | "warn" | "bad" | "none" {
  if (ratio == null) return "none";
  if (ratio >= 0.05) return "bad";
  if (ratio > 0) return "warn";
  return "ok";
}

export const TONE_TEXT: Record<"ok" | "warn" | "bad" | "none", string> = {
  ok: "text-primary-ink",
  warn: "text-[#b45309]",
  bad: "text-red-700",
  none: "text-text-muted",
};

export const TONE_BADGE: Record<"ok" | "warn" | "bad" | "none", string> = {
  ok: "bg-primary text-black",
  warn: "bg-[#fef08a] text-black",
  bad: "bg-[#fecaca] text-black",
  none: "bg-gray-100 text-black",
};
