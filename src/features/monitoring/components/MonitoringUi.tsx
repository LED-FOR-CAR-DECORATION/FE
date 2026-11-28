"use client";

import { useId, type ReactNode } from "react";
import { AlertTriangle, CircleHelp, Inbox, X, type LucideIcon } from "lucide-react";
import type { ComponentStatus, LiveEndpointItem } from "@/lib/api/monitoring";
import {
  TONE_BADGE,
  TONE_TEXT,
  errorRateTone,
  formatCount,
  formatLatency,
  formatRate,
  latencyTone,
} from "../format";

/* ------------------------------ Panel ------------------------------ */

export function Panel({
  label,
  icon: Icon,
  iconBoxClass = "bg-primary",
  title,
  titleAddon,
  description,
  actions,
  children,
  className = "",
}: {
  label: string;
  icon: LucideIcon;
  iconBoxClass?: string;
  title: string;
  /** Shown right after the title, e.g. an <InfoTip>. */
  titleAddon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`flex flex-col border-2 border-black bg-white shadow-[4px_4px_0_0_#000] ${className}`}
    >
      <div
        className={`flex flex-wrap justify-between gap-3 border-b-2 border-black px-4 py-3 sm:px-5 ${description ? "items-start" : "items-center"}`}
      >
        {/* Without a subtitle the title is a single line, so centre it on the icon. */}
        <div className={`flex min-w-0 gap-2.5 ${description ? "items-start" : "items-center"}`}>
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${description ? "mt-0.5" : ""} ${iconBoxClass}`}
          >
            <Icon className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-black sm:text-base">
              {title}
              {titleAddon}
            </h2>
            {description && <p className="mt-0.5 text-xs font-medium text-text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/* --------------------------- Metric card --------------------------- */

export function MetricCard({
  title,
  subtitle,
  value,
  valueClassName = "text-black",
  icon: Icon,
  iconBoxClass,
  badge,
  footer,
  loading = false,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueClassName?: string;
  icon: LucideIcon;
  iconBoxClass: string;
  badge?: { label: string; className: string };
  footer: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000]">
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${iconBoxClass}`}
            >
              <Icon className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase leading-snug tracking-wider text-black">{title}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-text-muted">{subtitle}</p>
            </div>
          </div>
          {badge && (
            <span
              className={`inline-flex shrink-0 items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-[1px_1px_0_0_#000] ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-32 animate-pulse bg-gray-200" />
          ) : (
            <span className={`text-xl font-black tracking-tight tabular-nums sm:text-2xl ${valueClassName}`}>{value}</span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-3.5 text-xs font-medium leading-relaxed text-text-muted">
        {footer}
      </div>
    </div>
  );
}

/* ----------------------------- Info tip ---------------------------- */

/** "(?)" icon that shows an explanation on hover or keyboard focus. */
export function InfoTip({ label, children, align = "left" }: { label: string; children: ReactNode; align?: "left" | "right" }) {
  const id = useId();
  return (
    <span className="group/info relative inline-flex normal-case tracking-normal">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="inline-flex cursor-help items-center text-text-muted transition-colors hover:text-black focus-visible:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <CircleHelp className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-30 mt-2 w-[min(360px,80vw)] border-2 border-black bg-white px-3 py-2.5 text-left text-xs font-medium leading-relaxed text-black opacity-0 shadow-[3px_3px_0_0_#000] transition-opacity duration-150 group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </span>
    </span>
  );
}

/* -------------------------- Latency strip -------------------------- */

const LATENCY_CELLS = [
  { key: "avg", label: "Trung bình (avg)" },
  { key: "p50", label: "p50 (median)" },
  { key: "p95", label: "p95" },
  { key: "p99", label: "p99" },
  { key: "max", label: "Tối đa (max)" },
] as const;

/** One explanation for all latency figures, shown in the latency panel's (?) icon. */
export const LATENCY_EXPLANATION = (
  <span className="block space-y-1.5">
    <span className="block">
      <strong>Trung bình:</strong> dễ bị vài yêu cầu rất chậm kéo lên hoặc nhiều yêu cầu nhanh kéo xuống.
    </span>
    <span className="block">
      <strong>p50 (median):</strong> một nửa số yêu cầu nhanh hơn mức này, tức trải nghiệm thường gặp.
    </span>
    <span className="block">
      <strong>p95:</strong> 95% yêu cầu nhanh hơn mức này. Đây là chỉ số chính để phát hiện hệ thống chậm.
    </span>
    <span className="block">
      <strong>p99:</strong> 1% yêu cầu chậm nhất bắt đầu từ mức này.
    </span>
    <span className="block">
      <strong>Tối đa:</strong> một yêu cầu chậm nhất, có thể chỉ là trường hợp cá biệt.
    </span>
    <span className="block text-text-muted">
      p50, p95 và p99 được ước tính theo các mốc cố định (25 ms, 50 ms, 100 ms, … 10 s), nên chỉ chính xác đến mốc gần nhất.
    </span>
  </span>
);

export function LatencyStrip({
  loading,
  ...values
}: {
  loading: boolean;
  avg?: number | null;
  p50?: number | null;
  p95?: number | null;
  p99?: number | null;
  max?: number | null;
}) {
  return (
    <div>
      <dl className="grid grid-cols-1 divide-y-2 divide-black/10 sm:grid-cols-5 sm:divide-x-2 sm:divide-y-0">
        {LATENCY_CELLS.map((cell) => {
          const value = values[cell.key];
          const main = cell.key === "p95";
          const tone = latencyTone(value);
          return (
            <div key={cell.key} className={`px-4 py-3 ${main ? "bg-[#e0f2fe]" : ""}`}>
              <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                {cell.label}
                {main && (
                  <span className="border border-black bg-[#7dd3fc] px-1 py-px text-[9px] text-black">Chỉ số chính</span>
                )}
              </dt>
              <dd className={`mt-1 font-black tabular-nums ${main ? "text-2xl" : "text-lg"} ${main ? TONE_TEXT[tone] : "text-black"}`}>
                {loading ? <span className="inline-block h-6 w-20 animate-pulse bg-gray-200" /> : formatLatency(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/* ------------------------- Small indicators ------------------------ */

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  UP: { label: "Hoạt động", className: "bg-primary text-black", dot: "bg-primary-ink" },
  DOWN: { label: "Mất kết nối", className: "bg-[#fecaca] text-black", dot: "bg-red-700" },
  OUT_OF_SERVICE: { label: "Ngừng phục vụ", className: "bg-[#fed7aa] text-black", dot: "bg-[#c2410c]" },
  UNKNOWN: { label: "Không rõ", className: "bg-gray-100 text-black", dot: "bg-gray-500" },
};

export function StatusBadge({ status }: { status: ComponentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${style.className}`}
    >
      <span className={`h-2 w-2 ${style.dot} ${status === "UP" ? "animate-pulse" : ""}`} aria-hidden="true" />
      {style.label}
    </span>
  );
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-[#bae6fd]",
  POST: "bg-primary/60",
  PUT: "bg-[#fef08a]",
  PATCH: "bg-[#e9d5ff]",
  DELETE: "bg-[#fecaca]",
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex w-[58px] shrink-0 justify-center border border-black px-1 py-0.5 font-mono text-[10px] font-black text-black ${METHOD_STYLES[method] ?? "bg-gray-100"}`}
    >
      {method}
    </span>
  );
}

/** Pill group styled like the month pills on the manager dashboard. */
export function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">{label}:</span>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-white text-black hover:bg-primary/20"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorBanner({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
    >
      <span className="inline-flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
        {message}
      </span>
      <span className="flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
          >
            Thử lại
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Đóng thông báo lỗi"
            className="shrink-0 cursor-pointer border border-black bg-white p-1 text-black transition-colors hover:bg-gray-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </span>
    </div>
  );
}

/* -------------------------- Endpoint table -------------------------- */

export function EndpointTable({
  items,
  loading,
  skeletonRows = 5,
  emptyTitle,
  emptyHint,
  onSelect,
  selectLabel,
}: {
  items: LiveEndpointItem[];
  loading: boolean;
  skeletonRows?: number;
  emptyTitle: string;
  emptyHint: string;
  onSelect?: (item: LiveEndpointItem) => void;
  selectLabel?: string;
}) {
  const header = (
    <thead>
      <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
        <th className="px-4 py-2.5 text-left">Endpoint</th>
        <th className="w-[92px] px-3 py-2.5 text-right">Lượt gọi</th>
        <th className="w-[92px] px-3 py-2.5 text-right">TB</th>
        <th className="w-[92px] px-3 py-2.5 text-right">p95</th>
        <th className="w-[92px] px-3 py-2.5 text-right">p99</th>
        <th className="w-[92px] px-3 py-2.5 text-right">Tối đa</th>
        <th className="w-[72px] px-3 py-2.5 text-right" title="Yêu cầu bị từ chối: dữ liệu sai, chưa đăng nhập, không có quyền, không tìm thấy">
          4xx
        </th>
        <th className="w-[72px] px-3 py-2.5 text-right" title="Lỗi máy chủ">
          5xx
        </th>
        <th className="w-[96px] px-3 py-2.5 text-right">Tỉ lệ lỗi</th>
        {onSelect && <th className="w-[136px] px-4 py-2.5 text-right">Thao tác</th>}
      </tr>
    </thead>
  );

  if (!loading && items.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center bg-gray-50 px-6 py-8 text-center">
        <div className="mb-3 grid h-11 w-11 place-items-center border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
          <Inbox size={22} className="text-black" aria-hidden="true" />
        </div>
        <p className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">{emptyTitle}</p>
        <p className="mt-1 text-xs font-medium text-text-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-sm">
        {header}
        <tbody className="divide-y-2 divide-black/10 bg-white">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="px-4 py-2.5">
                    <div className="h-5 w-64 bg-gray-200" />
                  </td>
                  {Array.from({ length: onSelect ? 9 : 8 }).map((__, cell) => (
                    <td key={cell} className="px-3 py-2.5">
                      <div className="ml-auto h-4 w-12 bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            : items.map((item) => {
                const p95Tone = latencyTone(item.p95LatencyMs);
                const rateTone = errorRateTone(item.errorRate);
                return (
                  <tr key={`${item.method} ${item.uri}`} className="transition-colors duration-150 hover:bg-[#f3faf5]">
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <MethodBadge method={item.method} />
                        <span className="truncate font-mono text-xs font-bold text-black" title={item.uri}>
                          {item.uri}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-black tabular-nums text-black">{formatCount(item.count)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-black">{formatLatency(item.avgLatencyMs)}</td>
                    <td className={`px-3 py-2.5 text-right text-xs font-black tabular-nums ${TONE_TEXT[p95Tone]}`}>
                      {formatLatency(item.p95LatencyMs)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-black">{formatLatency(item.p99LatencyMs)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-black">{formatLatency(item.maxLatencyMs)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-text-muted">{formatCount(item.clientErrors)}</td>
                    <td className={`px-3 py-2.5 text-right text-xs font-black tabular-nums ${item.serverErrors > 0 ? "text-red-700" : "text-text-muted"}`}>
                      {formatCount(item.serverErrors)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex border border-black px-1.5 py-0.5 text-[11px] font-black tabular-nums ${TONE_BADGE[rateTone]}`}
                      >
                        {formatRate(item.errorRate)}
                      </span>
                    </td>
                    {onSelect && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          aria-label={`${selectLabel ?? "Xem"} ${item.method} ${item.uri}`}
                          className="inline-flex h-7 cursor-pointer items-center border-2 border-black bg-white px-2 text-[11px] font-black uppercase text-black transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                          {selectLabel ?? "Xem"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
