"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  RefreshCw,
} from "lucide-react";
import CharacterReviewModal from "./CharacterReviewModal";
import {
  fetchCharacterStoreDrafts,
  fetchManagerKpiOverview,
  type ManagerKpiOverview,
  type StoreDraftItem,
} from "@/lib/api/dashboard";
import { apiUpdateProductStatus, apiUpdateStoreProduct } from "@/lib/api/products";
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
}

function MetricCard({
  title,
  subtitle,
  value,
  badge,
  growth,
  footerText,
  footerAction,
}: MetricCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-slate-900">
              {title}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{subtitle}</p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
            {value}
          </span>

          {growth && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                growth.isPositive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {growth.value}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
        <span className="min-w-0 flex-1 text-xs leading-relaxed text-slate-500">
          {footerText}
        </span>
        {footerAction}
      </div>
    </div>
  );
}

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  HARDWARE: "Phần cứng",
  COMMISSION: "Yêu cầu thiết kế",
  CHARACTER: "Nhân vật",
  BUNDLE: "Gói sản phẩm",
  SUBSCRIPTION: "Gói hội viên",
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STOCK_STATUS_MAP: Record<
  NonNullable<TopProductItem["stockStatus"]>,
  { label: string; className: string }
> = {
  "In stock": { label: "Còn hàng", className: "bg-green-50 text-green-700" },
  "Low stock": { label: "Sắp hết", className: "bg-amber-50 text-amber-700" },
  "Out of stock": { label: "Hết hàng", className: "bg-red-50 text-red-700" },
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
}: {
  items: RevenueCategoryItem[];
  totalRevenue: number;
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
    return { item, length, offset };
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
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {sumRevenue > 0 &&
            segments.map(({ item, length, offset }) => {
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
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${length} ${circumference}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-all duration-200"
                  style={{ opacity: isDimmed ? 0.35 : 1 }}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                />
              );
            })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span className="max-w-[100px] truncate text-[11px] font-medium text-slate-500">
            {hoveredItem
              ? PRODUCT_CATEGORY_LABELS[hoveredItem.category] ?? hoveredItem.category
              : "Tổng doanh thu"}
          </span>
          <span className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">
            {formatRevenueCompact(hoveredItem ? hoveredItem.revenue : totalRevenue)}
          </span>
          {hoveredItem && (
            <span className="text-[11px] font-semibold text-blue-600 tabular-nums">
              {hoveredItem.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Category Breakdown Legend */}
      <div className="w-full flex-1 space-y-2">
        {items.map((item) => {
          const isHovered = hoveredCategory === item.category;
          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredCategory(item.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                isHovered
                  ? "border-slate-300 bg-slate-50"
                  : "border-transparent bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {PRODUCT_CATEGORY_LABELS[item.category] ?? item.category}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    {item.unitCount.toLocaleString("vi-VN")} đơn vị
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-900 tabular-nums">
                  {formatRevenueCompact(item.revenue)}
                </p>
                <p className="text-[11px] font-medium text-slate-500 tabular-nums">
                  {item.percentage}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [drafts, setDrafts] = useState<StoreDraftItem[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<StoreDraftItem | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [compareWith, setCompareWith] = useState("");
  const [overview, setOverview] = useState<ManagerKpiOverview | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);
    setKpiError(null);
    Promise.all([
      fetchManagerKpiOverview({ month, compareWith: compareWith || undefined }),
      fetchCharacterStoreDrafts().catch(() => [] as StoreDraftItem[]),
    ])
      .then(([kpiRes, draftList]) => {
        if (cancelled) return;
        setOverview(kpiRes);
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
  const lowStockLeds = overview?.lowStockLeds ?? [];
  const warrantyAlerts = overview?.warrantyAlerts ?? [];
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
    setReloadKey((value) => value + 1);
    showToast(`Đã duyệt và mở bán thành công "${draft.productName}" trên cửa hàng.`);
  };

  const handleRejectDraft = async (draft: StoreDraftItem) => {
    await apiUpdateProductStatus(draft.productId, "ARCHIVED");
    setDrafts((prev) => prev.filter((item) => item.productId !== draft.productId));
    setReloadKey((value) => value + 1);
    showToast(`Đã lưu trữ / từ chối mở bán "${draft.productName}".`);
  };

  const pendingCount = overview ? kpi.pendingCharactersCount : drafts.length;
  const lowStockCount = kpi.lowStockModelsCount;
  const growthPositive = kpi.revenueGrowthPercent >= 0;
  const topCategory = [...revenueByCategory].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="mx-auto w-full max-w-[1440px] font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Top Row: Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <nav
                aria-label="Đường dẫn"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
              >
                <span>Quản lý</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-900">Tổng quan</span>
              </nav>
              <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                TỔNG QUAN QUẢN LÝ
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Điều hành kinh doanh, xét duyệt nhân vật Pixel Art và theo dõi
                tồn kho thiết bị LED.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/staff/pricing"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Danh sách sản phẩm
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                Trang quản trị
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Tháng</span>
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>So với</span>
              <input
                type="month"
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
              />
            </label>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={kpiLoading}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${kpiLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </header>

        {kpiError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            <span>{kpiError}</span>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-bold"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Second Row: 4 Equal-Width Key Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Tổng doanh thu"
            subtitle={`Tháng ${month} (VNĐ)`}
            value={kpiLoading && !overview ? "…" : `${kpi.totalRevenue.toLocaleString("vi-VN")} VNĐ`}
            badge={{
              label: growthPositive ? "Tăng trưởng" : "Giảm",
              className: growthPositive ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700",
            }}
            growth={{
              value: `${growthPositive ? "+" : ""}${kpi.revenueGrowthPercent}%`,
              isPositive: growthPositive,
            }}
            footerText={kpi.revenuePeriod}
          />

          <MetricCard
            title="Nhân vật chờ duyệt"
            subtitle="Chờ quản lý thẩm định"
            value={`${pendingCount} Sản phẩm`}
            badge={
              pendingCount === 0
                ? {
                    label: "Đã xử lý hết",
                    className: "bg-green-50 text-green-700",
                  }
                : {
                    label: "Cần duyệt",
                    className: "bg-amber-50 text-amber-700",
                  }
            }
            footerText={`${kpi.pendingCommissionsCount} yêu cầu thiết kế chờ duyệt`}
            footerAction={
              <Link
                href="/staff/pricing"
                className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Duyệt ngay
              </Link>
            }
          />

          <MetricCard
            title="Mẫu LED sắp hết"
            subtitle="Cần nhập thêm vào kho"
            value={`${lowStockCount} Mẫu thiết bị`}
            badge={{
              label: "Cần nhập thêm",
              className: "bg-red-50 text-red-700",
            }}
            footerText={
              lowStockLeds[0]
                ? `${lowStockLeds[0].name} còn ${lowStockLeds[0].currentStock} chiếc`
                : "Tồn kho ổn định"
            }
            footerAction={
              <Link
                href="/staff/inventory"
                className="inline-flex shrink-0 items-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                Xem chi tiết
              </Link>
            }
          />

          <MetricCard
            title="Gói sản phẩm & Hội viên"
            subtitle="Đang mở bán trên cửa hàng"
            value={`${kpi.activeBundlesCount} Gói sản phẩm`}
            badge={{
              label: `${kpi.activeSubscriptionsCount} Gói hội viên`,
              className: "bg-slate-100 text-slate-700",
            }}
            footerText={`${kpi.activePriceConfigsCount} quy tắc giá yêu cầu thiết kế`}
          />
        </div>

        {/* Third Row: 2 Equal-Width Analytics Cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section
            aria-label="Doanh thu theo danh mục"
            className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Doanh thu theo danh mục
                </h2>
                <p className="text-xs text-slate-500">
                  Tỷ trọng 5 nhóm sản phẩm &amp; dịch vụ
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 tabular-nums">
                Tổng: {formatRevenueCompact(kpi.totalRevenue)}
              </span>
            </div>

            {revenueByCategory.length > 0 ? (
              <RevenueDonutChart
                items={revenueByCategory}
                totalRevenue={kpi.totalRevenue}
              />
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Chưa có dữ liệu doanh thu theo danh mục
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Dữ liệu sẽ tự động cập nhật khi có giao dịch mới.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <span className="font-medium text-slate-600">Điểm nổi bật</span>
            <span className="font-semibold text-slate-800">
              {topCategory
                ? `${PRODUCT_CATEGORY_LABELS[topCategory.category] ?? topCategory.category} đóng góp ${topCategory.percentage}% doanh thu`
                : "Chưa có dữ liệu"}
            </span>
          </div>
        </section>

        <section
          aria-label="Top sản phẩm bán chạy"
          className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Top sản phẩm bán chạy
                </h2>
                <p className="text-xs text-slate-500">
                  Biểu đồ cột ngang xếp hạng theo số lượng bán
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Top 5
              </span>
            </div>

            {topProducts.length > 0 ? (
              (() => {
                const maxUnitsSold = Math.max(
                  ...topProducts.map((item) => item.unitsSold),
                  1,
                );
                const rankColors = [
                  "#2563eb",
                  "#3b82f6",
                  "#60a5fa",
                  "#93c5fd",
                  "#bfdbfe",
                ];

                return (
                  <div className="my-4 divide-y divide-slate-100">
                    {topProducts.map((prod, idx) => {
                      const statusBadge =
                        (prod.stockStatus && STOCK_STATUS_MAP[prod.stockStatus]) || {
                          label: "Đang bán",
                          className: "bg-blue-50 text-blue-700",
                        };
                      const barWidthPercent =
                        prod.unitsSold > 0
                          ? Math.max((prod.unitsSold / maxUnitsSold) * 100, 5)
                          : 0;
                      const barColor = rankColors[idx] ?? "#93c5fd";

                      return (
                        <div
                          key={prod.id}
                          className="grid grid-cols-1 gap-2.5 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
                        >
                          {/* Left: Full Product Label */}
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${
                                idx === 0
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              #{prod.rank}
                            </span>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {prod.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prod.thumbnail}
                                  alt={prod.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-slate-900">
                                {prod.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  {PRODUCT_CATEGORY_LABELS[prod.category] ?? prod.category}
                                </span>
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                                >
                                  {statusBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Horizontal Bar + Units Sold + Revenue */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-900 tabular-nums">
                                {prod.unitsSold.toLocaleString("vi-VN")} đơn
                              </span>
                              <span className="font-medium text-slate-500 tabular-nums">
                                {formatRevenueCompact(prod.revenue)}
                              </span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${barWidthPercent}%`,
                                  backgroundColor: barColor,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Chưa có dữ liệu sản phẩm bán chạy
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Bảng xếp hạng sẽ hiển thị khi có đơn hàng phát sinh.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <span className="shrink-0 font-medium text-slate-600">Chủ lực doanh số</span>
            <span className="truncate font-semibold text-slate-800">
              {topProducts[0]?.name ?? "—"}
            </span>
          </div>
        </section>
        </div>

        {/* Bottom Row: Full-Width Actionable Review Queue Table */}
        <section
          aria-label="Danh sách nhân vật chờ duyệt"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900">
                  DANH SÁCH NHÂN VẬT CHỜ DUYỆT
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                    pendingCount > 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {pendingCount} chờ duyệt
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Kiểm tra hiển thị Pixel Art trực tiếp trên thiết bị LED mô
                phỏng trước khi mở bán.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 text-left">Sản phẩm nhân vật</th>
                  <th className="px-4 py-3.5 text-left">Mô tả</th>
                  <th className="px-4 py-3.5 text-left">Ngày gửi</th>
                  <th className="px-4 py-3.5 text-right">Giá bán</th>
                  <th className="px-4 py-3.5 text-left">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {drafts.length > 0 ? (
                  drafts.map((row) => (
                    <tr
                      key={row.productId}
                      className="transition-colors hover:!bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {row.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.thumbnailUrl}
                                alt={row.productName}
                                className="h-full w-full object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {row.productName}
                            </p>
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                              #{row.productId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {row.description || "Chưa có mô tả chi tiết."}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {new Date(row.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                        {Number(row.basePrice ?? 0) === 0
                          ? "Chưa định giá (0 VNĐ)"
                          : `${Number(row.basePrice).toLocaleString("vi-VN")} VNĐ`}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Chờ duyệt
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDraft(row)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
                        <p className="text-sm font-medium text-slate-900">
                          Tuyệt vời! Hiện không còn nhân vật nào đang chờ duyệt.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Các mẫu thiết kế Pixel Art mới gửi từ nhà thiết kế sẽ hiển
                          thị tại đây.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Hiển thị {drafts.length} bản thiết kế nhân vật đang chờ duyệt trên hệ thống.
            </span>
            <Link href="/staff/pricing" className="font-medium text-blue-600 hover:underline">
              Mở trang Quản lý cửa hàng sản phẩm →
            </Link>
          </div>
        </section>

        {/* Warranty Alerts Queue */}
        <section
          aria-label="Danh sách phiếu bảo hành cần xử lý"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900">
                  PHIẾU BẢO HÀNH CẦN XỬ LÝ
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                    kpi.pendingWarrantyClaimsCount > 0
                      ? "bg-rose-50 text-rose-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {kpi.pendingWarrantyClaimsCount} chờ tiếp nhận
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Tối đa 5 yêu cầu bảo hành đang mở gần nhất (ưu tiên phiếu chờ duyệt trước).
              </p>
            </div>

            <Link
              href="/staff/warranty"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Xử lý bảo hành
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 text-left">Mã phiếu</th>
                  <th className="px-4 py-3.5 text-left">Khách hàng</th>
                  <th className="px-4 py-3.5 text-left">Thiết bị</th>
                  <th className="px-4 py-3.5 text-left">Mô tả sự cố</th>
                  <th className="px-4 py-3.5 text-left">Ngày gửi</th>
                  <th className="px-4 py-3.5 text-left">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {warrantyAlerts.length > 0 ? (
                  warrantyAlerts.map((ticket) => (
                    <tr
                      key={ticket.ticketId}
                      className="transition-colors hover:!bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900 tabular-nums">
                        #{ticket.ticketId}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {ticket.customerName || "Khách hàng"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ticket.customerEmail || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {ticket.deviceModel || "Thiết bị LED"}
                        </p>
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                          {ticket.deviceSerial}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3.5">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {ticket.issueDescription}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {ticket.reportedDate
                          ? new Date(ticket.reportedDate).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ticket.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {ticket.status === "PENDING" ? "Chờ tiếp nhận" : "Đang xử lý"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Link
                          href={`/staff/warranty?ticketId=${encodeURIComponent(ticket.ticketId)}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
                        <p className="text-sm font-medium text-slate-900">
                          Hiện không có phiếu bảo hành nào đang mở.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Các yêu cầu bảo hành phần cứng LED mới từ khách hàng sẽ hiển thị tại đây.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Hiển thị {warrantyAlerts.length} phiếu bảo hành đang mở ({kpi.pendingWarrantyClaimsCount} phiếu chờ tiếp nhận).
            </span>
            <Link href="/staff/warranty" className="font-medium text-blue-600 hover:underline">
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
    </div>
  );
}
