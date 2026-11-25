"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import { AlertTriangle, RotateCcw } from "lucide-react";

export const STORE_FORBIDDEN_HINT =
  "Chỉ Quản lý mới có quyền thay đổi trạng thái hiển thị trên cửa hàng.";

export const STORE_TABLE_CLASS = "w-full min-w-[960px] border-collapse text-left text-sm";
export const STORE_THEAD_CLASS = "border-b-2 border-black bg-[#e9f5ed]";
export const STORE_TH_CLASS =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black";

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
            <td key={colIndex} className="px-4 py-3.5">
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
