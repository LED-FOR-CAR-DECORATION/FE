"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Variant = "neo" | "soft";

interface PaginationProps {
  /** Trang hiện tại, đánh số từ 1. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Tổng số mục, để hiện "Hiển thị 11–20 trong 47 …". Bỏ qua thì không hiện dòng này. */
  totalItems?: number;
  pageSize?: number;
  /** Danh từ cho dòng tóm tắt, ví dụ "đơn", "nhân vật". */
  itemLabel?: string;
  ariaLabel?: string;
  variant?: Variant;
  /** Luôn hiển thị thanh phân trang kể cả khi chỉ có 1 trang để giữ cố định bố cục dưới đáy. */
  alwaysShow?: boolean;
  className?: string;
}

type PageToken = number | "gap-left" | "gap-right";

/** Luôn giữ trang đầu, trang cuối và các trang kề trang hiện tại; phần còn lại gộp thành "…". */
export function getPageTokens(page: number, totalPages: number): PageToken[] {
  const wanted = [1, totalPages, page - 1, page, page + 1];
  if (page <= 3) wanted.push(2, 3, 4);
  if (page >= totalPages - 2) wanted.push(totalPages - 1, totalPages - 2, totalPages - 3);
  const pages = Array.from(new Set(wanted))
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous > 1) {
      tokens.push(value < page ? "gap-left" : "gap-right");
    }
    tokens.push(value);
  });
  return tokens;
}

const STYLES: Record<Variant, { bar: string; button: string; active: string; info: string }> = {
  neo: {
    bar: "neo-box-no-hover bg-white px-3 py-2.5 sm:px-4",
    button:
      "inline-flex h-10 min-w-10 items-center justify-center border-2 border-black bg-white px-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none",
    active: "bg-primary text-primary-ink hover:translate-y-0 hover:shadow-none",
    info: "text-sm text-text-muted",
  },
  soft: {
    bar: "rounded-xs bg-white px-3 py-2.5 shadow-xs sm:px-4",
    button:
      "inline-flex h-9 min-w-9 items-center justify-center rounded-xs border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#155e59] hover:text-[#155e59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155e59] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700",
    active: "border-[#155e59] bg-[#155e59] text-white hover:text-white",
    info: "text-xs text-gray-500",
  },
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = "mục",
  ariaLabel = "Phân trang",
  variant = "neo",
  alwaysShow = false,
  className = "",
}: PaginationProps) {
  if (!alwaysShow && totalPages <= 1) return null;
  const style = STYLES[variant];
  const go = (target: number) => {
    const next = Math.min(Math.max(target, 1), totalPages);
    if (next !== page) onPageChange(next);
  };
  const summary =
    totalItems !== undefined && totalItems > 0 && pageSize
      ? `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} trong ${totalItems} ${itemLabel}`
      : null;

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex flex-wrap items-center justify-center gap-3 sm:justify-between ${style.bar} ${className}`}
    >
      {summary && <p className={`hidden sm:block ${style.info}`}>{summary}</p>}
      <div className="flex items-center gap-1.5">
        <button type="button" className={style.button} onClick={() => go(page - 1)} disabled={page === 1} aria-label="Trang trước">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        {/* Mobile: chỉ hiện "Trang x/y" */}
        <span className={`px-2 text-sm font-bold sm:hidden ${variant === "soft" ? "text-gray-700" : ""}`} aria-live="polite">
          Trang {page}/{totalPages}
        </span>

        <div className="hidden items-center gap-1.5 sm:flex">
          {getPageTokens(page, totalPages).map((token) =>
            typeof token === "number" ? (
              <button
                key={token}
                type="button"
                className={`${style.button} ${token === page ? style.active : ""}`}
                onClick={() => go(token)}
                aria-current={token === page ? "page" : undefined}
                aria-label={`Trang ${token}`}
              >
                {token}
              </button>
            ) : (
              <span key={token} className={`px-1 ${style.info}`} aria-hidden="true">
                …
              </span>
            ),
          )}
        </div>

        <button type="button" className={style.button} onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="Trang sau">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
