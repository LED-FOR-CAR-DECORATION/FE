"use client";

import type { ReactNode } from "react";
import { RefreshCw, RotateCcw, Search } from "lucide-react";
import type { StoreProductStatus } from "../types";
import { STATUS_LABEL } from "./StatusBadge";

export type StoreStatusFilter = "ALL" | StoreProductStatus;

export interface StatusCounts {
  ALL: number;
  PUBLISHED: number;
  UNPUBLISHED: number;
  ARCHIVED: number;
  DELETED: number;
}

export function computeStatusCounts<T>(
  items: T[],
  getStatus: (item: T) => StoreProductStatus | string | undefined,
): StatusCounts {
  const counts: StatusCounts = {
    ALL: items.length,
    PUBLISHED: 0,
    UNPUBLISHED: 0,
    ARCHIVED: 0,
    DELETED: 0,
  };
  for (const item of items) {
    const status = getStatus(item) ?? "UNPUBLISHED";
    if (status === "PUBLISHED") counts.PUBLISHED += 1;
    else if (status === "UNPUBLISHED") counts.UNPUBLISHED += 1;
    else if (status === "ARCHIVED") counts.ARCHIVED += 1;
    else if (status === "DELETED") counts.DELETED += 1;
  }
  return counts;
}

const STATUS_TABS: {
  id: StoreStatusFilter;
  label: string;
}[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "PUBLISHED", label: STATUS_LABEL.PUBLISHED },
  { id: "UNPUBLISHED", label: STATUS_LABEL.UNPUBLISHED },
  { id: "ARCHIVED", label: STATUS_LABEL.ARCHIVED },
  { id: "DELETED", label: STATUS_LABEL.DELETED },
];

interface StoreListingToolbarProps {
  statusFilter: StoreStatusFilter;
  onStatusFilterChange: (status: StoreStatusFilter) => void;
  counts: StatusCounts;
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  onRefresh?: () => void;
  onReset?: () => void;
  canReset?: boolean;
  rightAction?: ReactNode;
}

/**
 * Thanh điều khiển 2 hàng thống nhất cho cả 4 tab quản lý (Nhân vật, Mẫu LED, Gói sản phẩm, Gói hội viên):
 * - Hàng 1: Thanh tìm kiếm + nút làm mới / đặt lại / thao tác mở rộng
 * - Hàng 2: Bộ lọc theo 4 ProductStatus (+ Tất cả) kèm số lượng
 */
export default function StoreListingToolbar({
  statusFilter,
  onStatusFilterChange,
  counts,
  isLoading = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onRefresh,
  onReset,
  canReset,
  rightAction,
}: StoreListingToolbarProps) {
  return (
    <div className="shrink-0">
      {/* Hàng 1: Thanh tìm kiếm & thao tác nhanh */}
      <div className="flex flex-wrap items-center gap-2.5 border-b-2 border-dashed border-gray-200 bg-white px-4 py-2.5">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full border-2 border-black bg-gray-50 py-1.5 pl-9 pr-3 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white"
          />
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
          >
            <RotateCcw size={14} aria-hidden="true" /> Đặt lại
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách"
            className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
            Làm mới
          </button>
        )}

        {rightAction}
      </div>

      {/* Hàng 2: Thanh lọc theo ProductStatus */}
      <div
        role="tablist"
        aria-label="Lọc theo trạng thái sản phẩm"
        className="flex flex-wrap items-center gap-2 border-b-2 border-black bg-[#f3faf5] px-4 py-2"
      >
        {STATUS_TABS.map((tab) => {
          const selected = statusFilter === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`inline-flex cursor-pointer items-center gap-2 border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                selected
                  ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                  : "bg-white text-black hover:bg-primary/20"
              }`}
            >
              {tab.label}
              <span
                className={`border border-black px-1.5 py-0.2 text-[10px] font-black tabular-nums ${
                  selected
                    ? "bg-white text-black"
                    : tab.id === "UNPUBLISHED" && count > 0
                      ? "bg-[#fef08a] text-black"
                      : "bg-gray-100 text-black"
                }`}
              >
                {isLoading ? "…" : count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
