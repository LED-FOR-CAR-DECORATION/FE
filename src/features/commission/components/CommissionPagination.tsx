"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CommissionPaginationProps {
  /** 0-based current page matching backend PaginationMeta */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export default function CommissionPagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  disabled = false,
  ariaLabel = "Phân trang",
  className = "",
}: CommissionPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(0, page), safeTotalPages - 1);
  const startItem = totalElements === 0 ? 0 : safePage * size + 1;
  const endItem = Math.min(totalElements, (safePage + 1) * size);

  return (
    <div
      className={`neo-box-no-hover flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2 text-xs ${className}`}
    >
      <span className="font-bold text-black">
        {totalElements > 0 && (
          <>
            <strong className="font-mono">
              {startItem}–{endItem}
            </strong>{" "}
            / {totalElements} ·{" "}
          </>
        )}
        Trang <strong className="font-mono">{safePage + 1}</strong> / {safeTotalPages}
      </span>

      <nav aria-label={ariaLabel} className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || safePage <= 0}
          onClick={() => onPageChange(safePage - 1)}
          className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Trước
        </button>

        <button
          type="button"
          disabled={disabled || safePage >= safeTotalPages - 1}
          onClick={() => onPageChange(safePage + 1)}
          className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
        >
          Sau
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
}
