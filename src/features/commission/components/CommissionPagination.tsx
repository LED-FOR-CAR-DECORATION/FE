"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PageToken = number | "ellipsis";

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const visible = new Set<number>([0, totalPages - 1]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const candidate = currentPage + offset;
    if (candidate >= 0 && candidate < totalPages) {
      visible.add(candidate);
    }
  }

  const sorted = [...visible].sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const value = sorted[i];
    if (i > 0 && value - sorted[i - 1] > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(value);
  }
  return tokens;
}

export interface CommissionPaginationProps {
  /** 0-based current page matching backend PaginationMeta */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onSizeChange?: (nextSize: number) => void;
  disabled?: boolean;
  pageSizeOptions?: number[];
}

export default function CommissionPagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  disabled = false,
  pageSizeOptions = [10, 20, 50],
}: CommissionPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(0, page), safeTotalPages - 1);
  const startItem = totalElements === 0 ? 0 : safePage * size + 1;
  const endItem = Math.min(totalElements, (safePage + 1) * size);
  const tokens = getPageTokens(safePage, safeTotalPages);

  return (
    <div className="neo-box-no-hover flex flex-col gap-3 bg-white p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-black/75">
        <span>
          Hiển thị{" "}
          <strong className="font-mono text-black">
            {startItem}–{endItem}
          </strong>{" "}
          / <strong className="font-mono text-black">{totalElements}</strong> yêu cầu
        </span>

        {onSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>Số dòng:</span>
            <select
              aria-label="Số yêu cầu mỗi trang"
              disabled={disabled}
              value={size}
              onChange={(event) => onSizeChange(Number(event.target.value))}
              className="border-2 border-black bg-white px-2 py-1 font-mono text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}/trang
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Phân trang danh sách commission" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || safePage <= 0}
            onClick={() => onPageChange(safePage - 1)}
            className="inline-flex min-h-9 items-center gap-1 border-2 border-black bg-white px-2.5 text-xs font-bold text-black transition-transform hover:-translate-y-0.5 hover:bg-neutral-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Trước
          </button>

          {tokens.map((token, idx) =>
            token === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 font-mono text-xs font-bold text-black/50"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={token}
                type="button"
                disabled={disabled}
                aria-current={token === safePage ? "page" : undefined}
                onClick={() => onPageChange(token)}
                className={
                  token === safePage
                    ? "min-h-9 min-w-9 border-2 border-black bg-primary px-2.5 font-mono text-xs font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "min-h-9 min-w-9 border-2 border-black bg-white px-2.5 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-100 disabled:opacity-40"
                }
              >
                {token + 1}
              </button>
            ),
          )}

          <button
            type="button"
            disabled={disabled || safePage >= safeTotalPages - 1}
            onClick={() => onPageChange(safePage + 1)}
            className="inline-flex min-h-9 items-center gap-1 border-2 border-black bg-white px-2.5 text-xs font-bold text-black transition-transform hover:-translate-y-0.5 hover:bg-neutral-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
}
