"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import { AlertTriangle, RotateCcw } from "lucide-react";

export const STORE_FORBIDDEN_HINT =
  "Chỉ Quản lý mới có quyền thay đổi trạng thái hiển thị trên cửa hàng.";

export const STORE_TABLE_CLASS = "w-full min-w-[960px] text-sm";
export const STORE_THEAD_CLASS = "border-b border-[#e3efe6]";
export const STORE_TH_CLASS =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide";

export function storeRowClass(isDeleted: boolean): string {
  return `border-b border-[#eef5f0] last:border-0 transition-colors duration-150 ${
    isDeleted
      ? "bg-neutral-100/60 opacity-45 grayscale"
      : "hover:bg-[#f9fdfa]"
  }`;
}

const ACTION_VARIANT: Record<"primary" | "secondary" | "danger", string> = {
  primary:
    "border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] text-[#10351f] shadow-[2px_2px_0_#c6e8cd] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]",
  secondary:
    "border-[#cfe0d4] bg-white text-[#173b28] hover:border-[#a3d7b2] hover:bg-[#eef8f0]",
  danger: "border-red-200 bg-white text-red-700 hover:bg-red-50",
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-150 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${ACTION_VARIANT[variant]} ${className}`}
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
      <Image
        src={src}
        alt={alt}
        width={44}
        height={44}
        onError={() => setFailed(true)}
        className={`h-11 w-11 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] object-contain ${
          pixelated ? "[image-rendering:pixelated]" : ""
        }`}
      />
    );
  }

  return (
    <div className="grid h-11 w-11 place-items-center rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] text-[#3f9660]">
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
        <tr key={rowIndex} className="border-b border-[#eef5f0]" aria-hidden="true">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <div
                className={`animate-pulse rounded-lg bg-[#e7f3ea] ${
                  colIndex === thumbnailColumnIndex
                    ? "h-11 w-11"
                    : colIndex === 0
                      ? "h-4 w-10"
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
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div role="alert" className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <AlertTriangle size={24} className="text-red-600" />
          <p className="text-sm font-semibold text-red-700">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50"
            >
              <RotateCcw size={13} /> Thử lại
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
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm font-semibold text-text-muted">
        <div className="flex flex-col items-center gap-2.5">
          <p>{message}</p>
          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3 py-1.5 text-xs font-bold text-[#173b28] transition-colors hover:border-[#a3d7b2] hover:bg-[#eef8f0]"
            >
              <RotateCcw size={13} /> Đặt lại bộ lọc
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
      className="border-t border-[#e3efe6] px-4 py-3 text-xs font-medium text-text-muted"
      aria-live="polite"
    >
      Hiển thị {filteredCount} / {totalCount} {unitLabel}
    </p>
  );
}
