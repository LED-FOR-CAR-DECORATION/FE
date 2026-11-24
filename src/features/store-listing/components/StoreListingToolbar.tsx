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
  activeClass: string;
  badgeActiveClass: string;
}[] = [
  {
    id: "ALL",
    label: "Tất cả",
    activeClass: "border-[#3f9660] bg-white text-[#165d3a] shadow-sm",
    badgeActiveClass: "bg-[#dff5e5] text-[#165d3a]",
  },
  {
    id: "PUBLISHED",
    label: STATUS_LABEL.PUBLISHED,
    activeClass: "border-emerald-400 bg-white text-emerald-900 shadow-sm",
    badgeActiveClass: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "UNPUBLISHED",
    label: STATUS_LABEL.UNPUBLISHED,
    activeClass: "border-amber-400 bg-white text-amber-900 shadow-sm",
    badgeActiveClass: "bg-amber-100 text-amber-800",
  },
  {
    id: "ARCHIVED",
    label: STATUS_LABEL.ARCHIVED,
    activeClass: "border-blue-400 bg-white text-blue-900 shadow-sm",
    badgeActiveClass: "bg-blue-100 text-blue-800",
  },
  {
    id: "DELETED",
    label: STATUS_LABEL.DELETED,
    activeClass: "border-neutral-400 bg-white text-neutral-800 shadow-sm",
    badgeActiveClass: "bg-neutral-200 text-neutral-700",
  },
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
 * - Hàng 1: Bộ lọc theo 4 ProductStatus (+ Tất cả) kèm số lượng
 * - Hàng 2: Thanh tìm kiếm + nút làm mới / đặt lại / tạo mới
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
    <div>
      {/* Hàng 1: Thanh tìm kiếm & thao tác nhanh */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#e3efe6] p-4">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm transition-shadow focus-within:border-[#48a56a] focus-within:shadow-[0_0_0_3px_rgba(72,165,106,.15)]">
          <Search size={15} className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent outline-none"
          />
        </label>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={14} /> Đặt lại
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3 py-2 text-xs font-bold text-[#173b28] transition-colors hover:bg-[#eef8f0] disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Làm mới
          </button>
        )}

        {rightAction}
      </div>

      {/* Hàng 2: Thanh lọc theo ProductStatus */}
      <div
        role="tablist"
        aria-label="Lọc theo trạng thái sản phẩm"
        className="flex flex-wrap items-center gap-2 border-b border-[#e3efe6] bg-[#f8fcf9] px-4 py-2.5"
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
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                selected
                  ? tab.activeClass
                  : "border-transparent text-text-muted hover:bg-white/70 hover:text-[#173b28]"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                  selected
                    ? tab.badgeActiveClass
                    : tab.id === "UNPUBLISHED" && count > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-200/70 text-gray-600"
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
