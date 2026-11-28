"use client";

import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";

export const STORE_FORBIDDEN_HINT =
  "Chỉ Quản lý mới có quyền thay đổi trạng thái hiển thị trên cửa hàng.";

export const STORE_TABLE_CLASS = "w-full min-w-[960px] table-fixed border-collapse text-left text-sm";
export const STORE_THEAD_CLASS = "sticky top-0 z-10 border-b-2 border-black bg-[#e9f5ed]";
export const STORE_TH_CLASS =
  "whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-black";

export function storeRowClass(isDeleted: boolean): string {
  return `border-b-2 border-black/10 last:border-0 transition-colors duration-150 ${
    isDeleted
      ? "bg-gray-100/80 opacity-60 grayscale"
      : "bg-white hover:bg-[#f3faf5]"
  }`;
}

const ACTION_VARIANT: Record<"primary" | "secondary" | "danger", string> = {
  primary: "btn-primary shadow-[2px_2px_0_0_#000]",
  secondary: "btn-secondary shadow-[2px_2px_0_0_#000]",
  danger: "btn-danger shadow-[2px_2px_0_0_#000]",
};

export function StoreActionButton({
  variant,
  icon,
  children,
  className = "",
  ...props
}: {
  variant: keyof typeof ACTION_VARIANT;
  icon: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5! py-1.5! text-[11px] font-black uppercase tracking-wide ${ACTION_VARIANT[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

const HOVER_TONE_CLASS = {
  neutral: "bg-white hover:bg-neutral-100",
  primary: "bg-white hover:bg-primary/25",
  approve: "bg-white hover:bg-primary",
  danger: "bg-white hover:bg-[#fecaca]",
} as const;

const HOVER_MAX_WIDTH_CLASS = {
  short: "group-hover/btn:max-w-[84px] group-focus-visible/btn:max-w-[84px]",
  medium: "group-hover/btn:max-w-[140px] group-focus-visible/btn:max-w-[140px]",
} as const;

export function StoreHoverActionButton({
  tone = "neutral",
  labelSize = "short",
  icon,
  label,
  title,
  className = "",
  ...props
}: {
  tone?: keyof typeof HOVER_TONE_CLASS;
  labelSize?: keyof typeof HOVER_MAX_WIDTH_CLASS;
  icon: ReactNode;
  label: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      aria-label={props["aria-label"] ?? label}
      title={title ?? label}
      {...props}
      className={`group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black px-2 text-xs font-black uppercase text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-45 ${HOVER_TONE_CLASS[tone]} ${className}`}
    >
      {icon}
      <span
        className={`max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:opacity-100 ${HOVER_MAX_WIDTH_CLASS[labelSize]}`}
      >
        {label}
      </span>
    </button>
  );
}

export function StoreThumbnail({
  src,
  alt,
  fallback,
  pixelated = false,
}: {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  pixelated?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-50">
        <Image
          src={src}
          alt={alt}
          width={44}
          height={44}
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain ${
            pixelated ? "[image-rendering:pixelated]" : ""
          }`}
        />
      </div>
    );
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-black bg-gray-50 text-primary-ink">
      {fallback}
    </div>
  );
}

export function StoreSkeletonRows({
  columns,
  thumbnailColumnIndex = 1,
  rows = 5,
}: {
  columns: number;
  thumbnailColumnIndex?: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-b-2 border-black/10" aria-hidden="true">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-2.5">
              <div
                className={`animate-pulse border border-black/10 bg-gray-200 ${
                  colIndex === thumbnailColumnIndex
                    ? "h-11 w-11"
                    : colIndex === 0
                      ? "h-4 w-12"
                      : colIndex === 2
                        ? "h-4 w-44"
                        : "h-4 w-24"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StoreErrorRow({
  colSpan,
  message,
  onRetry,
}: {
  colSpan: number;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-3 border-2 border-black bg-[#fee2e2] p-5 shadow-[4px_4px_0_0_#000]"
        >
          <AlertTriangle size={22} className="text-red-700" aria-hidden="true" />
          <p className="text-xs font-black text-black sm:text-sm">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              <RotateCcw size={13} aria-hidden="true" /> Thử lại
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function StoreEmptyRow({
  colSpan,
  message,
  hasActiveFilters,
  onResetFilters,
  action,
}: {
  colSpan: number;
  message: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 border-2 border-dashed border-black/25 bg-gray-50 px-5 py-8">
          <p className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
            {message}
          </p>
          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              <RotateCcw size={13} aria-hidden="true" /> Đặt lại bộ lọc
            </button>
          )}
          {!hasActiveFilters && action}
        </div>
      </td>
    </tr>
  );
}

export function useStoreTablePagination<T>(
  items: T[],
  resetKey?: string,
) {
  const { rows: pageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 70,
    rowGap: 0,
    chromeHeight: 460,
    minRows: 2,
    maxRows: 12,
    defaultRows: 5,
  });
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const pagedItems = useMemo(
    () => items.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    ready,
    totalPages,
    totalElements: items.length,
    pagedItems,
  };
}

export function StoreTablePagination({
  page,
  size,
  totalElements,
  totalPages,
  totalUnfilteredCount,
  unitLabel,
  onPageChange,
  disabled = false,
  ariaLabel = "Phân trang",
}: {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totalUnfilteredCount?: number;
  unitLabel: string;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(0, page), safeTotalPages - 1);
  const startItem = totalElements === 0 ? 0 : safePage * size + 1;
  const endItem = Math.min(totalElements, (safePage + 1) * size);
  const showUnfiltered =
    totalUnfilteredCount !== undefined && totalUnfilteredCount !== totalElements;

  return (
    <div
      className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-4 py-2 text-xs sm:px-5"
      aria-live="polite"
    >
      <span className="font-bold text-black">
        {totalElements > 0 ? (
          <>
            <strong className="font-mono tabular-nums">
              {startItem}–{endItem}
            </strong>{" "}
            / <strong className="font-mono tabular-nums">{totalElements}</strong> {unitLabel}
            {showUnfiltered && (
              <span className="font-medium text-text-muted">
                {" "}
                (tổng {totalUnfilteredCount})
              </span>
            )}{" "}
            ·{" "}
          </>
        ) : (
          <>0 {unitLabel} · </>
        )}
        Trang <strong className="font-mono tabular-nums">{safePage + 1}</strong> /{" "}
        {safeTotalPages}
      </span>

      <nav aria-label={ariaLabel} className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || safePage <= 0}
          onClick={() => onPageChange(safePage - 1)}
          className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Trước
        </button>

        <button
          type="button"
          disabled={disabled || safePage >= safeTotalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
          className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
        >
          Sau
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

export function StoreTableFooter({
  filteredCount,
  totalCount,
  unitLabel,
}: {
  filteredCount: number;
  totalCount: number;
  unitLabel: string;
}) {
  return (
    <p
      className="border-t-2 border-dashed border-gray-200 bg-white px-4 py-3 text-xs font-medium text-text-muted tabular-nums"
      aria-live="polite"
    >
      Hiển thị <strong className="font-black text-black">{filteredCount}</strong> /{" "}
      <strong className="font-black text-black">{totalCount}</strong> {unitLabel}
    </p>
  );
}
