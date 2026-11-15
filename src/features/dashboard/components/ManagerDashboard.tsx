"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import CharacterReviewModal from "./CharacterReviewModal";
import {
  LOW_STOCK_LEDS_MOCK,
  MANAGER_KPI_MOCK,
  PENDING_CHARACTERS_QUEUE_MOCK,
  REVENUE_BY_CATEGORY_MOCK,
  TOP_SELLING_PRODUCTS_MOCK,
} from "../mockData";
import type { PendingCharacterItem, TopProductItem } from "../types";

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  iconBgClass?: string;
  iconColorClass?: string;
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
  icon: Icon,
  iconBgClass = "bg-blue-50",
  iconColorClass = "text-blue-600",
  badge,
  growth,
  footerText,
  footerAction,
}: MetricCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}
            >
              <Icon className={`h-5 w-5 ${iconColorClass}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {title}
              </p>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-2.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
            {value}
          </span>

          {growth && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                growth.isPositive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {growth.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {growth.value}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">{footerText}</span>
        {footerAction}
      </div>
    </div>
  );
}

const PRODUCT_CATEGORY_LABELS: Record<TopProductItem["category"], string> = {
  HARDWARE: "Phần cứng",
  CHARACTER: "Character",
  BUNDLE: "Gói sản phẩm",
};

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
  })} tr đ`;
}

function formatThousandVnd(value: number): string {
  return `${(value / 1_000).toLocaleString("vi-VN")}k đ`;
}

export default function ManagerDashboard() {
  const [pendingQueue, setPendingQueue] = useState<PendingCharacterItem[]>(
    PENDING_CHARACTERS_QUEUE_MOCK
  );
  const [selectedReviewItem, setSelectedReviewItem] =
    useState<PendingCharacterItem | null>(null);
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

  const handleApproveCharacter = (item: PendingCharacterItem) => {
    setPendingQueue((prev) => prev.filter((c) => c.id !== item.id));
    showToast(`Đã duyệt và mở bán thành công "${item.name}" trên cửa hàng.`);
  };

  const handleRejectCharacter = (item: PendingCharacterItem) => {
    setPendingQueue((prev) => prev.filter((c) => c.id !== item.id));
    showToast(
      `Đã gửi yêu cầu chỉnh sửa tới nhà thiết kế của "${item.name}".`
    );
  };

  const pendingCount = pendingQueue.length;
  const lowStockCount = LOW_STOCK_LEDS_MOCK.length;

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Top Row: Header */}
        <header className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <nav
                aria-label="Đường dẫn"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
              >
                <span>Quản lý</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-900">Tổng quan</span>
              </nav>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                TỔNG QUAN QUẢN LÝ
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Điều hành kinh doanh, xét duyệt Character pixel art và theo dõi
                tồn kho thiết bị LED.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Đã đồng bộ số liệu mới nhất từ kho và cổng thanh toán."
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </button>

              <Link
                href="/staff/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Store className="h-4 w-4 text-slate-500" />
                Danh sách sản phẩm
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                Trang quản trị
              </Link>
            </div>
          </div>
        </header>

        {/* Second Row: 4 Equal-Width Key Metric Cards */}
        <MetricCard
          title="Tổng doanh thu"
          subtitle="Tháng hiện tại (VNĐ)"
          value={`${(MANAGER_KPI_MOCK.totalRevenue / 1_000_000_000).toFixed(3)} Tỷ`}
          icon={DollarSign}
          badge={{
            label: "Tăng trưởng",
            className: "bg-blue-50 text-blue-700",
          }}
          growth={{
            value: `+${MANAGER_KPI_MOCK.revenueGrowthPercent}%`,
            isPositive: true,
          }}
          footerText="So với tháng trước (+287 tr)"
        />

        <MetricCard
          title="Character chờ duyệt"
          subtitle="Chờ quản lý thẩm định"
          value={`${pendingCount} Sản phẩm`}
          icon={Clock3}
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
          footerText="Yêu cầu duyệt trong vòng 24 giờ"
          footerAction={
            <button
              type="button"
              disabled={pendingCount === 0}
              onClick={() => {
                if (pendingQueue.length > 0) {
                  setSelectedReviewItem(pendingQueue[0]);
                }
              }}
              className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Duyệt ngay
            </button>
          }
        />

        <MetricCard
          title="Mẫu LED sắp hết"
          subtitle="Cần nhập thêm vào kho"
          value={`${lowStockCount} Mẫu thiết bị`}
          icon={AlertTriangle}
          iconBgClass="bg-red-50"
          iconColorClass="text-red-600"
          badge={{
            label: "Cần nhập thêm",
            className: "bg-red-50 text-red-700",
          }}
          footerText="64×64 Matrix Pro còn 15 chiếc"
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
          title="Gói sản phẩm & Giá bán"
          subtitle="Cấu hình đang kích hoạt"
          value={`${MANAGER_KPI_MOCK.activeBundlesCount} Gói sản phẩm`}
          icon={PackageCheck}
          badge={{
            label: `${MANAGER_KPI_MOCK.activePriceConfigsCount} Quy tắc`,
            className: "bg-slate-100 text-slate-700",
          }}
          footerText="Cấu hình phụ thu & chiết khấu gói"
        />

        {/* Third Row: 2 Equal-Width Analytics Cards */}
        <section
          aria-label="Doanh thu theo danh mục"
          className="col-span-1 flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2"
        >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Doanh thu theo danh mục
                  </h2>
                  <p className="text-xs text-slate-500">
                    Phần cứng LED &amp; Nội dung Pixel Art
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 tabular-nums">
                Tổng: {formatMillionVnd(MANAGER_KPI_MOCK.totalRevenue)}
              </span>
            </div>

            {REVENUE_BY_CATEGORY_MOCK.length > 0 ? (
              <div className="my-6 space-y-5">
                {REVENUE_BY_CATEGORY_MOCK.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.category}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatMillionVnd(item.revenue)} ({item.percentage}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(item.percentage, 4)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Đã bán: {item.unitCount.toLocaleString("vi-VN")} đơn vị
                      </span>
                      <span>Tỷ trọng: {item.percentage}% tổng doanh số</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <BarChart3 className="mb-2 h-6 w-6 text-slate-400" />
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
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Điểm nổi bật
            </span>
            <span className="font-semibold text-slate-800">
              Phần cứng LED đóng góp 62% doanh thu
            </span>
          </div>
        </section>

        <section
          aria-label="Top sản phẩm bán chạy"
          className="col-span-1 flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2"
        >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Top sản phẩm bán chạy
                  </h2>
                  <p className="text-xs text-slate-500">
                    Xếp hạng theo sản lượng &amp; doanh thu
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Top 5
              </span>
            </div>

            {TOP_SELLING_PRODUCTS_MOCK.length > 0 ? (
              <div className="my-4 divide-y divide-slate-100">
                {TOP_SELLING_PRODUCTS_MOCK.map((prod) => {
                  const statusBadge = prod.stockStatus
                    ? STOCK_STATUS_MAP[prod.stockStatus]
                    : { label: "Đang bán", className: "bg-blue-50 text-blue-700" };

                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 tabular-nums">
                          #{prod.rank}
                        </span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-base">
                          {prod.thumbnail}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {prod.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {PRODUCT_CATEGORY_LABELS[prod.category]} •{" "}
                            <span className="tabular-nums">
                              {prod.unitsSold.toLocaleString("vi-VN")}
                            </span>{" "}
                            đơn đã bán
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          {formatThousandVnd(prod.revenue)}
                        </p>
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <TrendingUp className="mb-2 h-6 w-6 text-slate-400" />
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
            <span className="font-medium text-slate-600">Chủ lực doanh số</span>
            <span className="font-semibold text-slate-800">
              64×64 Matrix Pro
            </span>
          </div>
        </section>

        {/* Bottom Row: Full-Width Actionable Review Queue Table */}
        <section
          aria-label="Danh sách Character chờ duyệt"
          className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-semibold text-slate-900">
                    DANH SÁCH CHARACTER CHỜ DUYỆT
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
                  Kiểm tra hiển thị pixel art trực tiếp trên thiết bị LED mô
                  phỏng trước khi mở bán.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 text-left">Sản phẩm Character</th>
                  <th className="px-4 py-3.5 text-left">Nhà thiết kế</th>
                  <th className="px-4 py-3.5 text-left">Định dạng</th>
                  <th className="px-4 py-3.5 text-right">Số khung hình</th>
                  <th className="px-4 py-3.5 text-right">Giá bán</th>
                  <th className="px-4 py-3.5 text-left">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {pendingQueue.length > 0 ? (
                  pendingQueue.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:!bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg">
                            {row.thumbnailUrl}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                              {row.resolution}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {row.designer.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.designer.handle}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {row.format}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                        {row.frames.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                        {row.isFree
                          ? "Miễn phí"
                          : `${row.price.toLocaleString("vi-VN")} đ`}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Chờ duyệt
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReviewItem(row)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          Xét duyệt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          Tuyệt vời! Hiện không còn Character nào đang chờ duyệt.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Các mẫu thiết kế pixel art mới gửi từ đối tác sẽ hiển
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
              Hiển thị {pendingCount} bản thiết kế pixel art mới nhất từ nhà
              thiết kế đối tác.
            </span>
            <span>Cập nhật tự động theo thời gian thực</span>
          </div>
        </section>
      </div>

      {/* Review Modal */}
      <CharacterReviewModal
        character={selectedReviewItem}
        isOpen={Boolean(selectedReviewItem)}
        onClose={() => setSelectedReviewItem(null)}
        onApprove={handleApproveCharacter}
        onReject={handleRejectCharacter}
      />
    </div>
  );
}
