"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  GitCompareArrows,
  ImageIcon,
  LayoutDashboard,
  Package,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import CharacterReviewModal from "./CharacterReviewModal";
import MonthlyRevenueChartCard from "./MonthlyRevenueChartCard";
import RevenueDrilldownDrawer, {
  type RevenueDrilldownQuery,
} from "./RevenueDrilldownDrawer";
import {
  fetchCharacterStoreDrafts,
  fetchManagerKpiOverview,
  type ManagerKpiOverview,
  type StoreDraftItem,
} from "@/lib/api/dashboard";
import { apiUpdateProductStatus, apiUpdateStoreProduct } from "@/lib/api/products";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ManagerKpiSummary, RevenueCategoryItem, TopProductItem } from "../types";

const EMPTY_KPI: ManagerKpiSummary = {
  totalRevenue: 0,
  revenueGrowthPercent: 0,
  revenuePeriod: "vs. tháng trước",
  pendingCharactersCount: 0,
  pendingCommissionsCount: 0,
  pendingWarrantyClaimsCount: 0,
  lowStockModelsCount: 0,
  activeBundlesCount: 0,
  activeSubscriptionsCount: 0,
  activePriceConfigsCount: 0,
};

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  valueClassName?: string;
  icon: LucideIcon;
  iconBoxClass: string;
  badge: {
    label: string;
    className: string;
  };
  growth?: {
    value: string;
    isPositive: boolean;
  };
  footerText: string;
  footerAction?: React.ReactNode;
  onValueClick?: () => void;
}

function MetricCard({
  title,
  subtitle,
  value,
  valueClassName = "text-black",
  icon: Icon,
  iconBoxClass,
  badge,
  growth,
  footerText,
  footerAction,
  onValueClick,
}: MetricCardProps) {
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
              <p className="text-xs font-black uppercase leading-snug tracking-wider text-black">
                {title}
              </p>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-text-muted">
                {subtitle}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-[1px_1px_0_0_#000] ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
          {onValueClick ? (
            <button
              type="button"
              onClick={onValueClick}
              title="Nhấn để truy xuất danh sách đơn hàng đóng góp"
              className={`cursor-pointer text-left text-xl font-black tracking-tight tabular-nums underline-offset-4 decoration-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:text-2xl ${valueClassName}`}
            >
              {value}
            </button>
          ) : (
            <span
              className={`text-xl font-black tracking-tight tabular-nums sm:text-2xl ${valueClassName}`}
            >
              {value}
            </span>
          )}

          {growth && (
            <span
              className={`inline-flex items-center gap-0.5 border border-black px-1.5 py-0.5 text-[11px] font-black tabular-nums shadow-[1px_1px_0_0_#000] ${
                growth.isPositive
                  ? "bg-primary/70 text-black"
                  : "bg-[#fecaca] text-black"
              }`}
            >
              {growth.isPositive ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={2.75} aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={2.75} aria-hidden="true" />
              )}
              {growth.value}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pt-3.5">
        <span className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-text-muted">
          {footerText}
        </span>
        {footerAction}
      </div>
    </div>
  );
}

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  HARDWARE: "Phần cứng",
  LED: "Phần cứng",
  PHYSICAL: "Phần cứng",
  COMMISSION: "Yêu cầu thiết kế",
  CHARACTER: "Nhân vật",
  DIGITAL: "Nhân vật",
  BUNDLE: "Gói sản phẩm",
  SUBSCRIPTION: "Gói hội viên",
};

/** Storefront-harmonized, soothing botanical pastel palette for Donut chart & legends. */
const CATEGORY_STORE_COLORS: Record<string, string> = {
  HARDWARE: "#74c69d",
  LED: "#74c69d",
  PHYSICAL: "#74c69d",
  SUBSCRIPTION: "#8ecae6",
  COMMISSION: "#f4a261",
  CHARACTER: "#b8b8ff",
  DIGITAL: "#b8b8ff",
  BUNDLE: "#f9dc7a",
};

function resolveCategoryColor(category: string, fallbackColor: string): string {
  return CATEGORY_STORE_COLORS[category] ?? fallbackColor;
}

function formatRevenuePeriodVi(period?: string): string {
  if (!period) return "So với tháng trước";
  return period
    .replace(/^vs\.\s*/i, "So với ")
    .replace(/^vs\s+/i, "So với ");
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STOCK_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  "In stock": { label: "Còn hàng", className: "bg-primary/60 text-black" },
  "Low stock": { label: "Sắp hết", className: "bg-[#fef08a] text-black" },
  "Out of stock": { label: "Hết hàng", className: "bg-[#fecaca] text-black" },
  IN_STOCK: { label: "Còn hàng", className: "bg-primary/60 text-black" },
  LOW_STOCK: { label: "Sắp hết", className: "bg-[#fef08a] text-black" },
  OUT_OF_STOCK: { label: "Hết hàng", className: "bg-[#fecaca] text-black" },
};

function formatMillionVnd(value: number): string {
  return `${(value / 1_000_000).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })} tr VNĐ`;
}

function formatThousandVnd(value: number): string {
  return `${(value / 1_000).toLocaleString("vi-VN")}k VNĐ`;
}

function formatRevenueCompact(value: number): string {
  if (value >= 1_000_000) return formatMillionVnd(value);
  if (value >= 1_000) return formatThousandVnd(value);
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function RevenueDonutChart({
  items,
  totalRevenue,
  onSelectCategory,
}: {
  items: RevenueCategoryItem[];
  totalRevenue: number;
  onSelectCategory: (category: string) => void;
}) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const radius = 72;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const sumRevenue = items.reduce((sum, item) => sum + Math.max(item.revenue, 0), 0);

  let accumulatedOffset = 0;
  const segments = items.map((item) => {
    const share = sumRevenue > 0 ? Math.max(item.revenue, 0) / sumRevenue : 0;
    const length = share * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += length;
    return {
      item,
      color: resolveCategoryColor(item.category, item.color),
      length,
      offset,
    };
  });

  const hoveredItem = items.find((item) => item.category === hoveredCategory) ?? null;

  return (
    <div className="my-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      {/* SVG Donut */}
      <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Biểu đồ tròn doanh thu theo danh mục"
        >
          {/* Outer & inner crisp black outlines for Neo-Brutalist precision */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {sumRevenue > 0 &&
            segments.map(({ item, color, length, offset }) => {
              if (length <= 0) return null;
              const isHovered = hoveredCategory === item.category;
              const isDimmed = hoveredCategory !== null && !isHovered;
              return (
                <circle
                  key={item.category}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${length} ${circumference}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-all duration-150"
                  style={{ opacity: isDimmed ? 0.3 : 1 }}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory(item.category)}
                />
              );
            })}
          <circle
            cx="100"
            cy="100"
            r={radius + strokeWidth / 2}
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            className="pointer-events-none"
          />
          <circle
            cx="100"
            cy="100"
            r={radius - strokeWidth / 2}
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            className="pointer-events-none"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="max-w-[104px] truncate text-[10px] font-black uppercase tracking-wider text-text-muted">
            {hoveredItem
              ? PRODUCT_CATEGORY_LABELS[hoveredItem.category] ?? hoveredItem.category
              : "Tổng thu"}
          </span>
          <span className="mt-0.5 text-sm font-black text-primary-ink tabular-nums">
            {formatRevenueCompact(hoveredItem ? hoveredItem.revenue : totalRevenue)}
          </span>
          {hoveredItem && (
            <span className="mt-0.5 border border-black bg-primary px-1.5 py-0.2 text-[10px] font-black text-black tabular-nums">
              {hoveredItem.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Category Breakdown Legend (mouse + keyboard synchronized) */}
      <div className="w-full flex-1 space-y-2">
        {items.map((item) => {
          const isHovered = hoveredCategory === item.category;
          const swatchColor = resolveCategoryColor(item.category, item.color);
          return (
            <button
              key={item.category}
              type="button"
              onMouseEnter={() => setHoveredCategory(item.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              onFocus={() => setHoveredCategory(item.category)}
              onBlur={() => setHoveredCategory(null)}
              onClick={() => onSelectCategory(item.category)}
              title={`Xem các đơn hàng đóng góp cho ${PRODUCT_CATEGORY_LABELS[item.category] ?? item.category}`}
              className={`group flex w-full cursor-pointer items-center justify-between gap-2 border-2 px-3 py-2 text-left text-xs transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                isHovered
                  ? "border-black bg-primary/25 shadow-[2px_2px_0_0_#000]"
                  : "border-black/15 bg-gray-50 hover:border-black hover:bg-primary/15 hover:shadow-[2px_2px_0_0_#000]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 border border-black shadow-[1px_1px_0_0_#000]"
                  style={{ backgroundColor: swatchColor }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-black uppercase tracking-wide text-black">
                    {PRODUCT_CATEGORY_LABELS[item.category] ?? item.category}
                  </p>
                  <p className="text-[11px] font-medium text-text-muted tabular-nums">
                    {item.unitCount.toLocaleString("vi-VN")} đơn vị
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="font-black text-primary-ink tabular-nums">
                    {formatRevenueCompact(item.revenue)}
                  </p>
                  <p className="text-[11px] font-bold text-text-muted tabular-nums">
                    {item.percentage}%
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-black"
                  aria-hidden="true"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthPillLabel(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  if (!yStr || !mStr) return ym;
  return `T${Number(mStr)}/${yStr}`;
}

function formatMonthTitle(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  if (!yStr || !mStr) return ym;
  return `Tháng ${Number(mStr)}/${yStr}`;
}

function CategoryRevenueCard({
  month,
  items,
  totalRevenue,
  accent = "primary",
  onDrilldownAll,
  onSelectCategory,
}: {
  month: string;
  items: RevenueCategoryItem[];
  totalRevenue: number;
  accent?: "primary" | "compare";
  onDrilldownAll: () => void;
  onSelectCategory: (category: string) => void;
}) {
  const topCat = [...items].sort((a, b) => b.revenue - a.revenue)[0];
  const isCompare = accent === "compare";
  const badgeClass = isCompare
    ? "bg-[#fef08a] text-black hover:bg-[#fde047]"
    : "bg-primary text-black hover:bg-primary-dark";
  const iconBoxClass = isCompare ? "bg-[#fef08a]" : "bg-primary";

  return (
    <section
      aria-label={`Doanh thu theo danh mục ${formatMonthTitle(month)}`}
      className="flex h-full flex-col justify-between border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
          <div className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${iconBoxClass}`}
            >
              <PieChart className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                Doanh thu theo danh mục · {formatMonthTitle(month)}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-text-muted">
                Nhấn vào từng danh mục để truy xuất đơn hàng đóng góp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDrilldownAll}
            className={`inline-flex shrink-0 cursor-pointer items-center border-2 border-black px-2.5 py-1 text-xs font-black uppercase tabular-nums shadow-[2px_2px_0_0_#000] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${badgeClass}`}
          >
            Tổng: {formatRevenueCompact(totalRevenue)}
          </button>
        </div>

        {items.length > 0 && totalRevenue > 0 ? (
          <RevenueDonutChart
            items={items}
            totalRevenue={totalRevenue}
            onSelectCategory={onSelectCategory}
          />
        ) : (
          <div className="my-8 flex flex-col items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 px-4 py-8 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-black">
              Chưa có dữ liệu doanh thu theo danh mục trong {formatMonthTitle(month)}
            </p>
            <p className="mt-1 text-xs font-medium text-text-muted">
              Dữ liệu sẽ tự động cập nhật khi có giao dịch mới.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-primary/15 px-3.5 py-2.5 text-xs">
        <span className="font-black uppercase tracking-wider text-black">Điểm nổi bật</span>
        <span className="font-bold text-primary-ink">
          {topCat && topCat.revenue > 0
            ? `${PRODUCT_CATEGORY_LABELS[topCat.category] ?? topCat.category} đóng góp ${topCat.percentage}% doanh thu`
            : "Chưa có dữ liệu"}
        </span>
      </div>
    </section>
  );
}

function TopProductsCard({
  month,
  products,
  accent = "primary",
  onSelectProduct,
}: {
  month: string;
  products: TopProductItem[];
  accent?: "primary" | "compare";
  onSelectProduct: (productId: number, name: string) => void;
}) {
  const maxUnitsSold = Math.max(...products.map((item) => item.unitsSold), 1);
  const isCompare = accent === "compare";
  const rankColors = isCompare
    ? ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fde68a"]
    : ["#1f432b", "#2d6a4f", "#52986d", "#89c89b", "#bce2c6"];
  const topBadgeBg = isCompare
    ? "bg-[#fef08a] text-black"
    : "bg-primary text-black";
  const iconBoxClass = isCompare ? "bg-[#fef08a]" : "bg-primary";

  return (
    <section
      aria-label={`Top sản phẩm bán chạy ${formatMonthTitle(month)}`}
      className="flex h-full flex-col justify-between border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
          <div className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${iconBoxClass}`}
            >
              <TrendingUp className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                Top sản phẩm bán chạy · {formatMonthTitle(month)}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-text-muted">
                Nhấn vào từng sản phẩm để xem danh sách đơn hàng cụ thể
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center border border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
            Top {products.length > 0 ? products.length : 5} sản phẩm
          </span>
        </div>

        {products.length > 0 ? (
          <div className="my-4 divide-y-2 divide-dashed divide-gray-200">
            {products.map((prod, idx) => {
              const statusBadge =
                (prod.stockStatus && STOCK_STATUS_MAP[prod.stockStatus]) || {
                  label: "Đang bán",
                  className: "bg-primary/40 text-black",
                };
              const barWidthPercent =
                prod.unitsSold > 0
                  ? Math.max((prod.unitsSold / maxUnitsSold) * 100, 6)
                  : 0;
              const barColor = rankColors[idx] ?? rankColors[rankColors.length - 1];
              const numericProductId = Number(prod.id);
              const canDrilldownProduct = Number.isFinite(numericProductId) && numericProductId > 0;

              return (
                <button
                  key={`${month}-${prod.id}`}
                  type="button"
                  disabled={!canDrilldownProduct}
                  onClick={() => canDrilldownProduct && onSelectProduct(numericProductId, prod.name)}
                  title={`Xem các đơn hàng đã mua ${prod.name} trong ${formatMonthTitle(month)}`}
                  className="group -mx-2 grid w-[calc(100%+1rem)] cursor-pointer grid-cols-1 gap-2.5 px-2 py-3 text-left transition-colors duration-150 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-default disabled:hover:bg-transparent sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-black text-[11px] font-black tabular-nums shadow-[1px_1px_0_0_#000] ${
                        idx === 0 ? topBadgeBg : "bg-white text-black"
                      }`}
                    >
                      #{prod.rank}
                    </span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-50">
                      {prod.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.thumbnail}
                          alt={prod.name}
                          className="h-full w-full object-contain [image-rendering:pixelated]"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase leading-snug text-black transition-colors group-hover:text-primary-ink sm:text-sm">
                        {prod.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase text-text-muted">
                          {PRODUCT_CATEGORY_LABELS[prod.category] ?? prod.category}
                        </span>
                        <span
                          className={`inline-block border border-black px-1.5 py-0.2 text-[10px] font-black uppercase ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-black text-black tabular-nums">
                        {prod.unitsSold.toLocaleString("vi-VN")} đơn vị
                      </span>
                      <span className="inline-flex items-center gap-1 font-black text-primary-ink tabular-nums">
                        {formatRevenueCompact(prod.revenue)}
                        <ChevronRight
                          className="h-3.5 w-3.5 text-text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-black"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="h-3.5 w-full border-2 border-black bg-gray-100 p-0.5">
                      <div
                        className="h-full transition-all duration-200"
                        style={{
                          width: `${barWidthPercent}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="my-8 flex flex-col items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 px-4 py-8 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-black">
              Chưa có sản phẩm bán chạy trong {formatMonthTitle(month)}
            </p>
            <p className="mt-1 text-xs font-medium text-text-muted">
              Bảng xếp hạng sẽ hiển thị khi có đơn hàng phát sinh.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-primary/15 px-3.5 py-2.5 text-xs">
        <span className="shrink-0 font-black uppercase tracking-wider text-black">
          Chủ lực doanh số
        </span>
        <span className="truncate font-black uppercase text-primary-ink">
          {products[0]?.name ?? "—"}
        </span>
      </div>
    </section>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [drafts, setDrafts] = useState<StoreDraftItem[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<StoreDraftItem | null>(null);
  const [drilldownQuery, setDrilldownQuery] = useState<RevenueDrilldownQuery | null>(null);
  const [month, setMonth] = useState("");
  const [initialMonth, setInitialMonth] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [overview, setOverview] = useState<ManagerKpiOverview | null>(null);
  const [compareOverview, setCompareOverview] = useState<ManagerKpiOverview | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const forceRefreshRef = useRef(false);

  const isComparing = Boolean(compareWith && compareWith !== month);
  const recentMonths = initialMonth
    ? [0, -1, -2, -3].map((offset) => shiftYearMonth(initialMonth, offset))
    : [];

  useEffect(() => {
    const monthAtVisit = currentMonth();
    setInitialMonth(monthAtVisit);
    setMonth(monthAtVisit);
  }, []);

  const triggerFreshReload = () => {
    forceRefreshRef.current = true;
    setReloadKey((value) => value + 1);
  };

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    const shouldRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setKpiLoading(true);
    setKpiError(null);
    const shouldFetchCompare = Boolean(compareWith && compareWith !== month);
    Promise.all([
      fetchManagerKpiOverview({
        month,
        compareWith: compareWith || undefined,
        refresh: shouldRefresh,
      }),
      shouldFetchCompare
        ? fetchManagerKpiOverview({
            month: compareWith,
            refresh: shouldRefresh,
          }).catch(() => null)
        : Promise.resolve(null),
      fetchCharacterStoreDrafts().catch(() => [] as StoreDraftItem[]),
    ])
      .then(([kpiRes, compareRes, draftList]) => {
        if (cancelled) return;
        setOverview(kpiRes);
        setCompareOverview(compareRes);
        setDrafts(draftList);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        setKpiError(
          status === 400
            ? "Định dạng tháng không hợp lệ (YYYY-MM)."
            : status === 403
              ? "Bạn không có quyền xem số liệu tổng quan."
              : status === 401
                ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                : "Không thể tải số liệu tổng quan. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, compareWith, reloadKey]);

  const kpi = overview?.kpiSummary ?? EMPTY_KPI;
  const revenueByCategory = overview?.revenueByCategory ?? [];
  const topProducts = overview?.topSellingProducts ?? [];
  const dailyRevenue = overview?.dailyRevenue ?? [];
  const lowStockLeds = overview?.lowStockLeds ?? [];
  const warrantyAlerts = overview?.warrantyAlerts ?? [];

  const compareKpi = compareOverview?.kpiSummary ?? EMPTY_KPI;
  const compareRevenueByCategory = compareOverview?.revenueByCategory ?? [];
  const compareTopProducts = compareOverview?.topSellingProducts ?? [];
  const compareDailyRevenue = compareOverview?.dailyRevenue ?? [];
  const sharedMaxDailyRevenue = isComparing
    ? Math.max(
        ...dailyRevenue.map((p) => Number(p.revenue) || 0),
        ...compareDailyRevenue.map((p) => Number(p.revenue) || 0),
        1,
      )
    : undefined;
  const compareDeltaVnd = kpi.totalRevenue - compareKpi.totalRevenue;
  const compareDeltaPct =
    compareKpi.totalRevenue > 0
      ? Number(((compareDeltaVnd / compareKpi.totalRevenue) * 100).toFixed(1))
      : kpi.totalRevenue > 0
        ? 100
        : 0;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApproveDraft = async (draft: StoreDraftItem, price: number) => {
    const safeThumb =
      draft.thumbnailUrl && /^https?:\/\/\S+$/i.test(draft.thumbnailUrl)
        ? draft.thumbnailUrl
        : undefined;
    const safeGallery = (draft.galleryUrls || []).filter((u) => /^https?:\/\/\S+$/i.test(u));

    await apiUpdateStoreProduct(draft.productId, {
      productName: draft.productName,
      basePrice: price,
      description: draft.description || undefined,
      thumbnailUrl: safeThumb,
      galleryUrls: safeGallery,
    });
    await apiUpdateProductStatus(draft.productId, "PUBLISHED");
    setDrafts((prev) => prev.filter((item) => item.productId !== draft.productId));
    triggerFreshReload();
    showToast(`Đã duyệt và mở bán thành công "${draft.productName}" trên cửa hàng.`);
  };

  const handleRejectDraft = async (draft: StoreDraftItem) => {
    await apiUpdateProductStatus(draft.productId, "ARCHIVED");
    setDrafts((prev) => prev.filter((item) => item.productId !== draft.productId));
    triggerFreshReload();
    showToast(`Đã lưu trữ / từ chối mở bán "${draft.productName}".`);
  };

  const pendingCount = overview ? kpi.pendingCharactersCount : drafts.length;
  const lowStockCount = kpi.lowStockModelsCount;
  const growthPositive = kpi.revenueGrowthPercent >= 0;

  return (
    <div className="manager-neo-dashboard mx-auto w-full max-w-[1440px] font-sans text-text-main">
      {/* Storefront-matched Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border-2 border-black bg-white px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center border border-black bg-primary">
            <CheckCircle2 className="h-3.5 w-3.5 text-black" aria-hidden="true" />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Top Row: Storefront-aligned Header Banner & Period Toolbar */}
        <header className="border-2 border-black border-l-8 border-l-primary bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  BẢNG ĐIỀU HÀNH
                </span>
                <nav
                  aria-label="Đường dẫn"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                >
                  <span>Quản lý</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span className="text-black">Tổng quan</span>
                </nav>
              </div>

              <div className="flex items-center gap-2.5">
                <LayoutDashboard
                  size={24}
                  className="shrink-0 text-primary-ink"
                  aria-hidden="true"
                />
                <h1 className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
                  TỔNG QUAN QUẢN LÝ
                </h1>
              </div>

              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Điều hành kinh doanh, xét duyệt nhân vật Pixel Art và theo dõi tồn kho thiết bị LED.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/staff/pricing"
                className={`${isAdmin ? "btn-secondary" : "btn-primary"} inline-flex items-center px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]`}
              >
                Danh sách sản phẩm
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="btn-primary inline-flex items-center px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  Trang quản trị
                </Link>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-gray-200 pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                Chọn nhanh:
              </span>
              {recentMonths.map((ym) => {
                const active = month === ym;
                return (
                  <button
                    key={ym}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setMonth(ym);
                      if (compareWith === ym) {
                        setCompareWith("");
                      }
                    }}
                    className={`cursor-pointer border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                      active
                        ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white text-black hover:bg-primary/20"
                    }`}
                  >
                    {formatMonthPillLabel(ym)}
                  </button>
                );
              })}
            </div>

            <div className="hidden h-6 w-0.5 bg-black/15 sm:block" aria-hidden="true" />

            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-text-muted">
              <span>Tháng</span>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  setMonth(next);
                  if (compareWith === next) {
                    setCompareWith("");
                  }
                }}
                className="border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-black tabular-nums focus:bg-white"
              />
            </label>

            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-text-muted">
              <span>So sánh với</span>
              <input
                type="month"
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
                className={`border-2 border-black px-2.5 py-1.5 text-xs font-bold text-black tabular-nums ${
                  isComparing ? "bg-[#fef9c3]" : "bg-gray-50 focus:bg-white"
                }`}
              />
            </label>

            {isComparing ? (
              <button
                type="button"
                onClick={() => setCompareWith("")}
                className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-[2px_2px_0_0_#89c89b] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Tắt so sánh
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCompareWith(shiftYearMonth(month, -1))}
                className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#fef08a] active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
                So sánh tháng trước
              </button>
            )}

            <button
              type="button"
              onClick={triggerFreshReload}
              disabled={kpiLoading}
              className="btn-secondary ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${kpiLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Làm mới
            </button>
          </div>
        </header>

        {kpiError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-3 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              {kpiError}
            </span>
            <button
              type="button"
              onClick={triggerFreshReload}
              className="btn-secondary px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Second Row: 4 Equal-Width Key Metric Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Tổng doanh thu"
            subtitle={`Tháng ${month || "—"} (VNĐ)`}
            value={kpiLoading && !overview ? "…" : `${kpi.totalRevenue.toLocaleString("vi-VN")} VNĐ`}
            valueClassName="text-primary-ink"
            icon={Wallet}
            iconBoxClass="bg-primary"
            badge={{
              label: growthPositive ? "Tăng trưởng" : "Giảm",
              className: growthPositive ? "bg-primary text-black" : "bg-[#fecaca] text-black",
            }}
            growth={{
              value: `${growthPositive ? "+" : ""}${kpi.revenueGrowthPercent}%`,
              isPositive: growthPositive,
            }}
            footerText={formatRevenuePeriodVi(kpi.revenuePeriod)}
            onValueClick={() =>
              setDrilldownQuery({
                month,
                category: "ALL",
                titleHint: "Tổng doanh thu",
              })
            }
            footerAction={
              <button
                type="button"
                onClick={() =>
                  setDrilldownQuery({
                    month,
                    category: "ALL",
                    titleHint: "Tổng doanh thu",
                  })
                }
                className="inline-flex shrink-0 cursor-pointer items-center border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Truy xuất đơn
              </button>
            }
          />

          <MetricCard
            title="Nhân vật chờ duyệt"
            subtitle="Chờ quản lý thẩm định"
            value={`${pendingCount} Sản phẩm`}
            icon={Sparkles}
            iconBoxClass={pendingCount > 0 ? "bg-[#fef08a]" : "bg-primary/50"}
            badge={
              pendingCount === 0
                ? {
                    label: "Đã xử lý hết",
                    className: "bg-primary text-black",
                  }
                : {
                    label: "Cần duyệt",
                    className: "bg-[#fef08a] text-black",
                  }
            }
            footerText={`${kpi.pendingCommissionsCount} yêu cầu thiết kế chờ duyệt`}
            footerAction={
              <Link
                href="/staff/pricing"
                className="inline-flex shrink-0 items-center border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Duyệt ngay
              </Link>
            }
          />

          <MetricCard
            title="Mẫu LED sắp hết"
            subtitle="Cần nhập thêm vào kho"
            value={`${lowStockCount} Mẫu thiết bị`}
            icon={Package}
            iconBoxClass={lowStockCount > 0 ? "bg-[#fecaca]" : "bg-primary/50"}
            badge={
              lowStockCount === 0
                ? {
                    label: "Ổn định",
                    className: "bg-primary text-black",
                  }
                : {
                    label: "Cần nhập thêm",
                    className: "bg-[#fecaca] text-black",
                  }
            }
            footerText={
              lowStockLeds[0]
                ? `${lowStockLeds[0].name} còn ${lowStockLeds[0].currentStock} chiếc`
                : "Tồn kho ổn định"
            }
            footerAction={
              <Link
                href="/manager/inventory"
                className="inline-flex shrink-0 items-center border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Xem chi tiết
              </Link>
            }
          />

          <MetricCard
            title="Bảo hành cần xử lý"
            subtitle="Phiếu bảo hành đang chờ duyệt"
            value={`${kpi.pendingWarrantyClaimsCount} Phiếu`}
            icon={ShieldAlert}
            iconBoxClass={kpi.pendingWarrantyClaimsCount > 0 ? "bg-[#fed7aa]" : "bg-primary/50"}
            badge={
              kpi.pendingWarrantyClaimsCount === 0
                ? {
                    label: "Đã xử lý hết",
                    className: "bg-primary text-black",
                  }
                : {
                    label: "Cần xử lý",
                    className: "bg-[#fed7aa] text-black",
                  }
            }
            footerText={
              warrantyAlerts.length > 0
                ? `${warrantyAlerts.length} phiếu đang mở theo dõi`
                : "Không có phiếu bảo hành tồn đọng"
            }
            footerAction={
              <Link
                href="/staff/warranty"
                className="inline-flex shrink-0 items-center border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Xử lý ngay
              </Link>
            }
          />
        </div>

        {/* Third Row: Monthly Daily Revenue Chart & Side-by-Side Comparison */}
        {isComparing ? (
          <div className="flex flex-col gap-6">
            {/* Comparison Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-black border-l-8 border-l-primary bg-white px-5 py-4 shadow-[4px_4px_0_0_#000]">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
                  <GitCompareArrows className="h-4 w-4 text-black" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-black sm:text-sm">
                    Đang so sánh {formatMonthTitle(month)} và {formatMonthTitle(compareWith)}
                  </p>
                  <p className="text-xs font-medium text-text-muted">
                    Hai biểu đồ đặt cạnh nhau và dùng chung trục giá trị để đối chiếu trực quan.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                <div className="flex items-center gap-2 border-2 border-black bg-primary/20 px-2.5 py-1">
                  <span className="h-2.5 w-2.5 border border-black bg-primary" aria-hidden="true" />
                  <span className="font-bold text-text-muted">{formatMonthTitle(month)}:</span>
                  <strong className="font-black text-primary-ink">
                    {kpi.totalRevenue.toLocaleString("vi-VN")} VNĐ
                  </strong>
                </div>
                <div className="flex items-center gap-2 border-2 border-black bg-[#fef9c3] px-2.5 py-1">
                  <span className="h-2.5 w-2.5 border border-black bg-[#f59e0b]" aria-hidden="true" />
                  <span className="font-bold text-text-muted">{formatMonthTitle(compareWith)}:</span>
                  <strong className="font-black text-black">
                    {compareKpi.totalRevenue.toLocaleString("vi-VN")} VNĐ
                  </strong>
                </div>
                <span
                  className={`inline-flex items-center gap-1 border-2 border-black px-2.5 py-1 font-black shadow-[2px_2px_0_0_#000] ${
                    compareDeltaVnd >= 0
                      ? "bg-primary text-black"
                      : "bg-[#fecaca] text-black"
                  }`}
                >
                  {compareDeltaVnd >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
                  )}
                  {compareDeltaVnd >= 0 ? "+" : ""}
                  {compareDeltaVnd.toLocaleString("vi-VN")} VNĐ ({compareDeltaPct >= 0 ? "+" : ""}
                  {compareDeltaPct}%)
                </span>
              </div>
            </div>

            {/* 2 Daily Revenue Charts Side-by-Side */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <MonthlyRevenueChartCard
                month={month}
                points={dailyRevenue}
                totalRevenue={kpi.totalRevenue}
                loading={kpiLoading && !overview}
                accent="primary"
                sharedMaxRevenue={sharedMaxDailyRevenue}
                onDrilldown={() =>
                  setDrilldownQuery({
                    month,
                    category: "ALL",
                    titleHint: `Tổng doanh thu ${formatMonthTitle(month)}`,
                  })
                }
              />
              <MonthlyRevenueChartCard
                month={compareWith}
                points={compareDailyRevenue}
                totalRevenue={compareKpi.totalRevenue}
                loading={kpiLoading && !compareOverview}
                accent="compare"
                sharedMaxRevenue={sharedMaxDailyRevenue}
                onDrilldown={() =>
                  setDrilldownQuery({
                    month: compareWith,
                    category: "ALL",
                    titleHint: `Tổng doanh thu ${formatMonthTitle(compareWith)}`,
                  })
                }
              />
            </div>

            {/* 2 Category Donut Charts Side-by-Side */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CategoryRevenueCard
                month={month}
                items={revenueByCategory}
                totalRevenue={kpi.totalRevenue}
                accent="primary"
                onDrilldownAll={() =>
                  setDrilldownQuery({
                    month,
                    category: "ALL",
                    titleHint: `Tổng doanh thu ${formatMonthTitle(month)}`,
                  })
                }
                onSelectCategory={(category) =>
                  setDrilldownQuery({
                    month,
                    category,
                    titleHint: `${PRODUCT_CATEGORY_LABELS[category] ?? category} (${formatMonthTitle(month)})`,
                  })
                }
              />
              <CategoryRevenueCard
                month={compareWith}
                items={compareRevenueByCategory}
                totalRevenue={compareKpi.totalRevenue}
                accent="compare"
                onDrilldownAll={() =>
                  setDrilldownQuery({
                    month: compareWith,
                    category: "ALL",
                    titleHint: `Tổng doanh thu ${formatMonthTitle(compareWith)}`,
                  })
                }
                onSelectCategory={(category) =>
                  setDrilldownQuery({
                    month: compareWith,
                    category,
                    titleHint: `${PRODUCT_CATEGORY_LABELS[category] ?? category} (${formatMonthTitle(compareWith)})`,
                  })
                }
              />
            </div>

            {/* 2 Top Selling Products Rankings Side-by-Side */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopProductsCard
                month={month}
                products={topProducts}
                accent="primary"
                onSelectProduct={(productId, name) =>
                  setDrilldownQuery({
                    month,
                    productId,
                    titleHint: `${name} (${formatMonthTitle(month)})`,
                  })
                }
              />
              <TopProductsCard
                month={compareWith}
                products={compareTopProducts}
                accent="compare"
                onSelectProduct={(productId, name) =>
                  setDrilldownQuery({
                    month: compareWith,
                    productId,
                    titleHint: `${name} (${formatMonthTitle(compareWith)})`,
                  })
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Single-Month Daily Revenue Bar Chart */}
            <MonthlyRevenueChartCard
              month={month}
              points={dailyRevenue}
              totalRevenue={kpi.totalRevenue}
              loading={kpiLoading && !overview}
              accent="primary"
              onDrilldown={() =>
                setDrilldownQuery({
                  month,
                  category: "ALL",
                  titleHint: `Tổng doanh thu ${formatMonthTitle(month)}`,
                })
              }
            />

            {/* Single-Month Category Donut + Top 5 Best-Selling Products */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CategoryRevenueCard
                month={month}
                items={revenueByCategory}
                totalRevenue={kpi.totalRevenue}
                accent="primary"
                onDrilldownAll={() =>
                  setDrilldownQuery({
                    month,
                    category: "ALL",
                    titleHint: `Tổng doanh thu ${formatMonthTitle(month)}`,
                  })
                }
                onSelectCategory={(category) =>
                  setDrilldownQuery({
                    month,
                    category,
                    titleHint: PRODUCT_CATEGORY_LABELS[category] ?? category,
                  })
                }
              />

              <TopProductsCard
                month={month}
                products={topProducts}
                accent="primary"
                onSelectProduct={(productId, name) =>
                  setDrilldownQuery({
                    month,
                    productId,
                    titleHint: name,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Bottom Row: Full-Width Actionable Review Queue Table */}
        <section
          aria-label="Danh sách nhân vật chờ duyệt"
          className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${
                  pendingCount > 0 ? "bg-[#fef08a]" : "bg-primary"
                }`}
              >
                <Sparkles className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                    DANH SÁCH NHÂN VẬT CHỜ DUYỆT
                  </h2>
                  <span
                    className={`inline-flex items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider tabular-nums shadow-[1px_1px_0_0_#000] ${
                      pendingCount > 0
                        ? "bg-[#fef08a] text-black"
                        : "bg-primary text-black"
                    }`}
                  >
                    {pendingCount} chờ duyệt
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-text-muted">
                  Kiểm tra hiển thị Pixel Art trực tiếp trước khi định giá và mở bán trên cửa hàng.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto border-2 border-black">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <th className="px-4 py-3 text-left">Sản phẩm nhân vật</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-left">Ngày gửi</th>
                  <th className="px-4 py-3 text-right">Giá bán</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 bg-white">
                {drafts.length > 0 ? (
                  drafts.map((row) => (
                    <tr
                      key={row.productId}
                      className="transition-colors duration-150 hover:bg-[#f3faf5]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-50">
                            {row.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.thumbnailUrl}
                                alt={row.productName}
                                className="h-full w-full object-contain [image-rendering:pixelated]"
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-black sm:text-sm">
                              {row.productName}
                            </p>
                            <span className="mt-0.5 inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-black">
                              #{row.productId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="line-clamp-2 text-xs font-medium text-text-muted">
                          {row.description || "Chưa có mô tả chi tiết."}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-text-muted tabular-nums">
                        {new Date(row.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-black text-primary-ink tabular-nums">
                        {Number(row.basePrice ?? 0) === 0
                          ? "Chưa định giá (0 VNĐ)"
                          : `${Number(row.basePrice).toLocaleString("vi-VN")} VNĐ`}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center border border-black bg-[#fef08a] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                          Chờ duyệt
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDraft(row)}
                          className="btn-primary inline-flex items-center px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                        >
                          Xét duyệt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <p className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                          Tuyệt vời! Hiện không còn nhân vật nào đang chờ duyệt.
                        </p>
                        <p className="mt-1 text-xs font-medium text-text-muted">
                          Các mẫu thiết kế Pixel Art mới gửi từ nhà thiết kế sẽ hiển thị tại đây.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pt-3 text-xs font-medium text-text-muted">
            <span>
              Hiển thị <strong className="font-black text-black">{drafts.length}</strong> bản thiết kế nhân vật đang chờ duyệt trên hệ thống.
            </span>
            <Link
              href="/staff/pricing"
              className="font-black uppercase tracking-wide text-primary-ink hover:underline"
            >
              Mở trang Quản lý cửa hàng sản phẩm →
            </Link>
          </div>
        </section>

        {/* Warranty Alerts Queue */}
        <section
          aria-label="Danh sách phiếu bảo hành cần xử lý"
          className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${
                  kpi.pendingWarrantyClaimsCount > 0 ? "bg-[#fed7aa]" : "bg-primary"
                }`}
              >
                <ShieldAlert className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                    PHIẾU BẢO HÀNH CẦN XỬ LÝ
                  </h2>
                  <span
                    className={`inline-flex items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider tabular-nums shadow-[1px_1px_0_0_#000] ${
                      kpi.pendingWarrantyClaimsCount > 0
                        ? "bg-[#fecaca] text-black"
                        : "bg-primary text-black"
                    }`}
                  >
                    {kpi.pendingWarrantyClaimsCount} chờ tiếp nhận
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-text-muted">
                  Tối đa 5 yêu cầu bảo hành đang mở gần nhất (ưu tiên phiếu chờ duyệt trước).
                </p>
              </div>
            </div>

            <Link
              href="/staff/warranty"
              className="btn-secondary inline-flex items-center px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              Xử lý bảo hành
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto border-2 border-black">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <th className="px-4 py-3 text-left">Mã phiếu</th>
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Thiết bị</th>
                  <th className="px-4 py-3 text-left">Mô tả sự cố</th>
                  <th className="px-4 py-3 text-left">Ngày gửi</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 bg-white">
                {warrantyAlerts.length > 0 ? (
                  warrantyAlerts.map((ticket) => (
                    <tr
                      key={ticket.ticketId}
                      className="transition-colors duration-150 hover:bg-[#f3faf5]"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-black text-black tabular-nums">
                        #{ticket.ticketId}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-black text-black sm:text-sm">
                          {ticket.customerName || "Khách hàng"}
                        </p>
                        <p className="text-xs font-medium text-text-muted">
                          {ticket.customerEmail || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-black uppercase text-black">
                          {ticket.deviceModel || "Thiết bị LED"}
                        </p>
                        <span className="mt-0.5 inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.2 font-mono text-[11px] font-bold text-black">
                          {ticket.deviceSerial}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="line-clamp-2 text-xs font-medium text-text-muted">
                          {ticket.issueDescription}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-text-muted tabular-nums">
                        {ticket.reportedDate
                          ? new Date(ticket.reportedDate).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] ${
                            ticket.status === "PENDING"
                              ? "bg-[#fef08a]"
                              : ticket.status === "APPROVED"
                                ? "bg-primary/60"
                                : "bg-gray-100"
                          }`}
                        >
                          {ticket.status === "PENDING"
                            ? "Chờ tiếp nhận"
                            : ticket.status === "APPROVED"
                              ? "Đã tiếp nhận"
                              : "Đang xử lý"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Link
                          href={`/staff/warranty?ticketId=${encodeURIComponent(ticket.ticketId)}`}
                          className="btn-secondary inline-flex items-center px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                        >
                          Xử lý
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <p className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                          Hiện không có phiếu bảo hành nào đang mở.
                        </p>
                        <p className="mt-1 text-xs font-medium text-text-muted">
                          Các yêu cầu bảo hành phần cứng LED mới từ khách hàng sẽ hiển thị tại đây.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-gray-200 pt-3 text-xs font-medium text-text-muted">
            <span>
              Hiển thị <strong className="font-black text-black">{warrantyAlerts.length}</strong> phiếu bảo hành đang mở ({kpi.pendingWarrantyClaimsCount} phiếu chờ tiếp nhận).
            </span>
            <Link
              href="/staff/warranty"
              className="font-black uppercase tracking-wide text-primary-ink hover:underline"
            >
              Mở trang quản lý Bảo hành →
            </Link>
          </div>
        </section>
      </div>

      {/* Review Modal */}
      <CharacterReviewModal
        draft={selectedDraft}
        isOpen={Boolean(selectedDraft)}
        onClose={() => setSelectedDraft(null)}
        onApprove={handleApproveDraft}
        onReject={handleRejectDraft}
      />

      {/* Revenue Traceability Drill-down Drawer */}
      <RevenueDrilldownDrawer
        query={drilldownQuery}
        onClose={() => setDrilldownQuery(null)}
        onChangeQuery={setDrilldownQuery}
      />
    </div>
  );
}
