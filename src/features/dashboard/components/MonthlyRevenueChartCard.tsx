"use client";

import { useMemo, useState } from "react";
import { BarChart3, Calendar } from "lucide-react";
import type { DailyRevenuePoint } from "../types";

interface MonthlyRevenueChartCardProps {
  month: string;
  titlePrefix?: string;
  points: DailyRevenuePoint[];
  totalRevenue: number;
  loading?: boolean;
  accent?: "blue" | "emerald";
  /** Shared Y-axis ceiling so two side-by-side comparison charts share identical bar scale. */
  sharedMaxRevenue?: number;
  onDrilldown?: () => void;
}

function formatMonthDisplay(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `Tháng ${Number(m)}/${y}`;
}

function formatCompactVnd(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return value.toLocaleString("vi-VN");
}

function formatDateShort(isoDate: string, fallbackDay: number): string {
  const parts = isoDate?.split("-");
  if (parts && parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return `Ngày ${fallbackDay}`;
}

export default function MonthlyRevenueChartCard({
  month,
  titlePrefix = "Biểu đồ doanh thu",
  points,
  totalRevenue,
  loading = false,
  accent = "blue",
  sharedMaxRevenue,
  onDrilldown,
}: MonthlyRevenueChartCardProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const normalizedPoints = useMemo(() => {
    if (points && points.length > 0) return points;
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const m = Number(monthStr);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(m) || m < 1 || m > 12) {
      return [];
    }
    const days = new Date(year, m, 0).getDate();
    return Array.from({ length: days }, (_, idx) => {
      const d = idx + 1;
      return {
        day: d,
        date: `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        revenue: 0,
        orderCount: 0,
      };
    });
  }, [points, month]);

  const localMax = useMemo(
    () => Math.max(...normalizedPoints.map((p) => Number(p.revenue) || 0), 0),
    [normalizedPoints],
  );
  const chartMax = Math.max(sharedMaxRevenue ?? localMax, localMax, 1);

  const totalOrders = useMemo(
    () => normalizedPoints.reduce((sum, p) => sum + (Number(p.orderCount) || 0), 0),
    [normalizedPoints],
  );

  const peakPoint = useMemo(() => {
    let best: DailyRevenuePoint | null = null;
    for (const p of normalizedPoints) {
      if ((Number(p.revenue) || 0) > (best ? Number(best.revenue) : 0)) {
        best = p;
      }
    }
    return best;
  }, [normalizedPoints]);

  const activeDaysCount = useMemo(
    () => normalizedPoints.filter((p) => (Number(p.revenue) || 0) > 0).length,
    [normalizedPoints],
  );

  const activePoint =
    hoveredDay != null
      ? normalizedPoints.find((p) => p.day === hoveredDay) ?? null
      : null;

  const isEmerald = accent === "emerald";
  const barBgClass = isEmerald
    ? "bg-emerald-500 group-hover:bg-emerald-600"
    : "bg-blue-500 group-hover:bg-blue-600";
  const peakBarBgClass = isEmerald ? "bg-emerald-600" : "bg-blue-600";
  const badgeClass = isEmerald
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  const iconBgClass = isEmerald
    ? "bg-emerald-50 text-emerald-600"
    : "bg-blue-50 text-blue-600";

  const axisTickDays = useMemo(() => {
    const lastDay = normalizedPoints.length;
    return new Set([1, 5, 10, 15, 20, 25, lastDay]);
  }, [normalizedPoints.length]);

  return (
    <section
      aria-label={`${titlePrefix} ${formatMonthDisplay(month)}`}
      className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-2.5">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}>
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {titlePrefix} · {formatMonthDisplay(month)}
              </h2>
              <p className="text-xs text-slate-500">
                Doanh thu từng ngày trong tháng ({totalOrders.toLocaleString("vi-VN")} đơn/giao dịch)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums ${badgeClass}`}
            >
              {loading ? "…" : `${totalRevenue.toLocaleString("vi-VN")} VNĐ`}
            </span>
            {onDrilldown && (
              <button
                type="button"
                onClick={onDrilldown}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Truy xuất đơn
              </button>
            )}
          </div>
        </div>

        {/* Hover / Active Day Inspector Strip */}
        <div className="mt-3 flex min-h-[34px] flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
          {activePoint ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDateShort(activePoint.date, activePoint.day)}
              </span>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="font-bold text-slate-900">
                  {Number(activePoint.revenue).toLocaleString("vi-VN")} VNĐ
                </span>
                <span className="text-slate-500">
                  ({activePoint.orderCount} giao dịch)
                </span>
              </div>
            </>
          ) : (
            <span className="text-slate-500">
              Di chuột vào từng cột ngày để xem doanh thu &amp; số giao dịch chi tiết.
            </span>
          )}
        </div>

        {/* Daily Bar Chart */}
        {localMax > 0 ? (
          <div className="mt-4">
            <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
              {/* Y-Axis Labels */}
              <div className="flex h-48 flex-col justify-between pb-6 text-right text-[10px] font-medium text-slate-400 tabular-nums">
                <span>{formatCompactVnd(chartMax)}</span>
                <span>{formatCompactVnd(chartMax / 2)}</span>
                <span>0</span>
              </div>

              {/* Bars + Horizontal Gridlines */}
              <div className="relative h-48 pb-6">
                {/* Dashed Gridlines */}
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                  <div className="border-t border-dashed border-slate-200" />
                  <div className="border-t border-dashed border-slate-100" />
                  <div className="border-t border-slate-200" />
                </div>

                {/* Columns */}
                <div className="relative z-10 flex h-full items-end gap-[2px] sm:gap-1">
                  {normalizedPoints.map((pt) => {
                    const rev = Number(pt.revenue) || 0;
                    const heightPct = rev > 0 ? Math.max((rev / chartMax) * 100, 3) : 0;
                    const isPeak = peakPoint?.day === pt.day && rev > 0;
                    const isHovered = hoveredDay === pt.day;

                    return (
                      <div
                        key={pt.day}
                        onMouseEnter={() => setHoveredDay(pt.day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className="group relative flex h-full flex-1 flex-col items-center justify-end"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[16px] rounded-t-sm transition-all duration-200 ${
                              rev === 0
                                ? "h-[2px] bg-slate-100"
                                : isPeak
                                  ? `${peakBarBgClass} ring-2 ring-offset-1 ${isEmerald ? "ring-emerald-200" : "ring-blue-200"}`
                                  : barBgClass
                            } ${isHovered && rev > 0 ? "opacity-100 scale-x-110" : "opacity-90"}`}
                            title={`${formatDateShort(pt.date, pt.day)}: ${rev.toLocaleString("vi-VN")} VNĐ (${pt.orderCount} giao dịch)`}
                          />
                        </div>
                        <span
                          className={`absolute -bottom-5 text-[10px] tabular-nums ${
                            isHovered
                              ? "font-bold text-slate-900"
                              : axisTickDays.has(pt.day)
                                ? "font-medium text-slate-400"
                                : "hidden"
                          }`}
                        >
                          {pt.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-6 flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center">
            <p className="text-sm font-medium text-slate-600">
              Không có doanh thu phát sinh trong {formatMonthDisplay(month)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Chọn tháng khác để xem lịch sử doanh thu và sản phẩm bán chạy.
            </p>
          </div>
        )}
      </div>

      {/* Footer Highlights */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
        <span className="text-slate-600">
          Ngày cao nhất:{" "}
          <strong className="text-slate-900">
            {peakPoint && Number(peakPoint.revenue) > 0
              ? `Ngày ${peakPoint.day}/${month.split("-")[1]} (${Number(peakPoint.revenue).toLocaleString("vi-VN")} VNĐ)`
              : "—"}
          </strong>
        </span>
        <span className="text-slate-600">
          TB ngày có đơn:{" "}
          <strong className="text-slate-900">
            {activeDaysCount > 0
              ? `${Math.round(totalRevenue / activeDaysCount).toLocaleString("vi-VN")} VNĐ`
              : "0 VNĐ"}
          </strong>
        </span>
      </div>
    </section>
  );
}
