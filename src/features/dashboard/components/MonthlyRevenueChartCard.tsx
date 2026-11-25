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
  accent?: "primary" | "compare" | "blue" | "emerald";
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
  accent = "primary",
  sharedMaxRevenue,
  onDrilldown,
}: MonthlyRevenueChartCardProps) {
  const [activeDay, setActiveDay] = useState<number | null>(null);

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
    activeDay != null
      ? normalizedPoints.find((p) => p.day === activeDay) ?? null
      : null;

  const isCompare = accent === "compare" || accent === "emerald";
  const barBgClass = isCompare
    ? "bg-[#fcd34d] group-hover:bg-[#f59e0b] group-focus-visible:bg-[#f59e0b]"
    : "bg-primary group-hover:bg-primary-dark group-focus-visible:bg-primary-dark";
  const peakBarBgClass = isCompare ? "bg-[#b45309]" : "bg-primary-ink";
  const badgeClass = isCompare
    ? "bg-[#fef08a] text-black"
    : "bg-primary text-black";
  const iconBgClass = isCompare ? "bg-[#fef08a]" : "bg-primary";
  const footerStripClass = isCompare
    ? "bg-[#fef9c3]/70"
    : "bg-primary/15";

  const axisTickDays = useMemo(() => {
    const lastDay = normalizedPoints.length;
    return new Set([1, 5, 10, 15, 20, 25, lastDay]);
  }, [normalizedPoints.length]);

  return (
    <section
      aria-label={`${titlePrefix} ${formatMonthDisplay(month)}`}
      className="flex h-full flex-col justify-between border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black pb-4">
          <div className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${iconBgClass}`}
            >
              <BarChart3 className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-black sm:text-base">
                {titlePrefix} · {formatMonthDisplay(month)}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-text-muted">
                Doanh thu từng ngày trong tháng ({totalOrders.toLocaleString("vi-VN")} đơn/giao dịch)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center border-2 border-black px-2.5 py-1 text-xs font-black tabular-nums shadow-[2px_2px_0_0_#000] ${badgeClass}`}
            >
              {loading ? "…" : `${totalRevenue.toLocaleString("vi-VN")} VNĐ`}
            </span>
            {onDrilldown && (
              <button
                type="button"
                onClick={onDrilldown}
                className="btn-secondary px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
              >
                Truy xuất đơn
              </button>
            )}
          </div>
        </div>

        {/* Hover / Keyboard Focus Day Inspector Strip */}
        <div
          aria-live="polite"
          className="mt-3.5 flex min-h-[38px] flex-wrap items-center justify-between gap-2 border-2 border-black bg-gray-50 px-3 py-1.5 text-xs"
        >
          {activePoint ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-black uppercase text-black">
                <Calendar className="h-3.5 w-3.5 text-primary-ink" aria-hidden="true" />
                {formatDateShort(activePoint.date, activePoint.day)}
                {peakPoint?.day === activePoint.day && Number(activePoint.revenue) > 0 && (
                  <span className="border border-black bg-primary px-1.5 py-0.2 text-[10px] font-black uppercase text-black">
                    Đỉnh tháng
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="font-black text-primary-ink">
                  {Number(activePoint.revenue).toLocaleString("vi-VN")} VNĐ
                </span>
                <span className="font-bold text-text-muted">
                  ({activePoint.orderCount} giao dịch)
                </span>
              </div>
            </>
          ) : (
            <span className="font-medium text-text-muted">
              Di chuột hoặc dùng phím Tab qua từng cột ngày để xem doanh thu &amp; số giao dịch chi tiết.
            </span>
          )}
        </div>

        {/* Daily Bar Chart */}
        {localMax > 0 ? (
          <div className="mt-5">
            <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-2">
              {/* Y-Axis Labels */}
              <div className="flex h-48 flex-col justify-between pb-6 text-right text-[10px] font-black text-text-muted tabular-nums">
                <span>{formatCompactVnd(chartMax)}</span>
                <span>{formatCompactVnd(chartMax / 2)}</span>
                <span>0</span>
              </div>

              {/* Bars + Horizontal Gridlines */}
              <div className="relative h-48 pb-6">
                {/* Dashed Gridlines & Crisp Baseline */}
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                  <div className="border-t border-dashed border-black/20" />
                  <div className="border-t border-dashed border-black/15" />
                  <div className="border-t-2 border-black" />
                </div>

                {/* Columns */}
                <div className="relative z-10 flex h-full items-end gap-[2px] sm:gap-1">
                  {normalizedPoints.map((pt) => {
                    const rev = Number(pt.revenue) || 0;
                    const heightPct = rev > 0 ? Math.max((rev / chartMax) * 100, 4) : 0;
                    const isPeak = peakPoint?.day === pt.day && rev > 0;
                    const isActive = activeDay === pt.day;
                    const dateLabel = formatDateShort(pt.date, pt.day);

                    return (
                      <button
                        key={pt.day}
                        type="button"
                        onMouseEnter={() => setActiveDay(pt.day)}
                        onMouseLeave={() => setActiveDay(null)}
                        onFocus={() => setActiveDay(pt.day)}
                        onBlur={() => setActiveDay(null)}
                        onClick={() => onDrilldown?.()}
                        aria-label={`${dateLabel}: ${rev.toLocaleString("vi-VN")} VNĐ, ${pt.orderCount} giao dịch`}
                        title={`${dateLabel}: ${rev.toLocaleString("vi-VN")} VNĐ (${pt.orderCount} giao dịch)`}
                        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            style={{ height: rev > 0 ? `${heightPct}%` : "2px" }}
                            className={`w-full max-w-[18px] transition-all duration-150 ${
                              rev === 0
                                ? "bg-black/15"
                                : isPeak
                                  ? `${peakBarBgClass} border-2 border-black shadow-[1px_0_0_0_#000]`
                                  : `${barBgClass} border border-black`
                            } ${isActive && rev > 0 ? "-translate-y-0.5 shadow-[2px_2px_0_0_#000]" : ""}`}
                          />
                        </div>
                        <span
                          className={`absolute -bottom-5 text-[10px] tabular-nums ${
                            isActive
                              ? "font-black text-black"
                              : axisTickDays.has(pt.day)
                                ? "font-bold text-text-muted"
                                : "hidden"
                          }`}
                        >
                          {pt.day}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-6 flex h-44 flex-col items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 px-4 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-black">
              Không có doanh thu phát sinh trong {formatMonthDisplay(month)}
            </p>
            <p className="mt-1 text-xs font-medium text-text-muted">
              Chọn tháng khác để xem lịch sử doanh thu và sản phẩm bán chạy.
            </p>
          </div>
        )}
      </div>

      {/* Footer Highlights */}
      <div
        className={`mt-4 flex flex-wrap items-center justify-between gap-2 border-2 border-black px-3.5 py-2.5 text-xs ${footerStripClass}`}
      >
        <span className="font-bold text-black">
          Ngày cao nhất:{" "}
          <strong className="font-black text-primary-ink tabular-nums">
            {peakPoint && Number(peakPoint.revenue) > 0
              ? `Ngày ${peakPoint.day}/${month.split("-")[1]} (${Number(peakPoint.revenue).toLocaleString("vi-VN")} VNĐ)`
              : "—"}
          </strong>
        </span>
        <span className="font-bold text-black">
          TB ngày có đơn:{" "}
          <strong className="font-black text-primary-ink tabular-nums">
            {activeDaysCount > 0
              ? `${Math.round(totalRevenue / activeDaysCount).toLocaleString("vi-VN")} VNĐ`
              : "0 VNĐ"}
          </strong>
        </span>
      </div>
    </section>
  );
}
