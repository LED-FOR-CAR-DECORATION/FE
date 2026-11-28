"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { LineChart } from "lucide-react";

export interface LineSeries {
  name: string;
  /** Stroke colour (any CSS colour). */
  color: string;
  /**
   * One value per x position. null means "no value" (e.g. no requests in that period): the line
   * runs straight from the previous value to the next one instead of breaking.
   */
  values: (number | null)[];
  dashed?: boolean;
  /** Fill the area under this line. */
  area?: boolean;
}

/**
 * A thin bar strip under the plot with its own scale, for a small count that would sit flat on the
 * main axis (e.g. 5xx errors next to thousands of requests).
 */
export interface ChartLane {
  label: string;
  color: string;
  values: number[];
}

export interface ChartTooltip {
  title: string;
  rows: { label: string; value: string; color?: string; valueClassName?: string }[];
}

const VIEW_W = 1000;
const VIEW_H = 200;
const TOOLTIP_GAP = 14;

/**
 * Line chart in the monitoring page's neo-brutalist style. Scales to any number of points, shows the
 * hovered point's figures in a tooltip next to the cursor (or the focused point, with ← →), bridges
 * periods without a value, and can show a separate `lane` under the plot. `summary` fills the strip above.
 */
export default function MetricLineChart({
  label,
  axisLabels,
  series,
  lane,
  formatValue,
  tooltip,
  summary,
  emptyTitle,
  emptyHint,
  loading = false,
  maxTicks = 7,
}: {
  label: string;
  /** One label per x position; only about `maxTicks` of them are shown. */
  axisLabels: string[];
  series: LineSeries[];
  lane?: ChartLane;
  formatValue: (value: number) => string;
  tooltip: (index: number) => ChartTooltip;
  /** Always-visible strip above the chart. */
  summary: ReactNode;
  emptyTitle: string;
  emptyHint: string;
  loading?: boolean;
  maxTicks?: number;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ index: number; x: number; y: number; width: number; height: number } | null>(null);
  const count = axisLabels.length;

  const max = useMemo(() => Math.max(0, ...series.flatMap((s) => s.values.map((v) => v ?? 0))), [series]);
  const yMax = niceCeiling(max);
  // Integer scale for the lane (never 0.5 errors), rounded up to 1, 2, 5 × 10^n.
  const laneTop = lane ? niceIntegerCeiling(Math.max(0, ...lane.values)) : 1;

  const xAt = (idx: number) => (count <= 1 ? VIEW_W / 2 : (idx / (count - 1)) * VIEW_W);
  const yAt = (value: number) => VIEW_H - (value / yMax) * VIEW_H;
  const xPct = (idx: number) => (xAt(idx) / VIEW_W) * 100;

  const paths = useMemo(
    () =>
      series.map((s) => {
        // Null values are skipped, so the line bridges straight across periods without a value.
        const defined = s.values.flatMap((value, idx) => (value == null ? [] : [{ idx, value }]));
        if (defined.length === 0) return { line: "", area: "" };
        const line = defined.map(({ idx, value }, i) => `${i === 0 ? "M" : "L"}${xAt(idx)},${yAt(value)}`).join(" ");
        const area = s.area
          ? `${line} L${xAt(defined[defined.length - 1].idx)},${VIEW_H} L${xAt(defined[0].idx)},${VIEW_H} Z`
          : "";
        return { line, area };
      }),
    // xAt/yAt depend only on count and yMax.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, count, yMax],
  );

  // Evenly spaced ticks that always include the first and last point.
  const tickCount = Math.min(count, maxTicks);
  const tickIndexes =
    tickCount <= 1
      ? [0]
      : Array.from(new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (count - 1)) / (tickCount - 1)))));
  const ticks = count === 0 ? [] : tickIndexes.map((idx) => ({ text: axisLabels[idx], idx }));

  const indexAtRatio = (ratio: number) => (count <= 1 ? 0 : Math.round(Math.min(1, Math.max(0, ratio)) * (count - 1)));

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setActive({ index: indexAtRatio(x / rect.width), x, y: event.clientY - rect.top, width: rect.width, height: rect.height });
  };

  /** Keyboard focus has no cursor, so the tooltip sits next to the focused point. */
  const focusIndex = (index: number) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const firstValue = series.map((s) => s.values[index]).find((v) => v != null);
    setActive({
      index,
      x: (xAt(index) / VIEW_W) * rect.width,
      y: firstValue != null ? (yAt(firstValue) / VIEW_H) * rect.height : rect.height / 2,
      width: rect.width,
      height: rect.height,
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const current = active?.index ?? -1;
    const next =
      event.key === "ArrowRight" ? Math.min(count - 1, current + 1)
      : event.key === "ArrowLeft" ? Math.max(0, current < 0 ? count - 1 : current - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? count - 1
      : null;
    if (next != null) {
      event.preventDefault();
      focusIndex(next);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse border-2 border-dashed border-black/15 bg-gray-50" />;
  }

  if (max <= 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center border-2 border-dashed border-black/25 bg-gray-50 px-4 text-center">
        <LineChart className="mb-2 h-6 w-6 text-black" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-wide text-black">{emptyTitle}</p>
        <p className="mt-1 text-xs font-medium text-text-muted">{emptyHint}</p>
      </div>
    );
  }

  const activeLeftPct = active ? xPct(active.index) : null;
  const tip = active ? tooltip(active.index) : null;
  // Open the tooltip on the side of the cursor with more room.
  const tipOnLeft = active ? active.x > active.width / 2 : false;
  const tipTop = active ? Math.min(Math.max(active.y, 24), active.height - 24) : 0;
  // Lane bars get the width of one period (at least 2px), centred on the point.
  const laneBarPct = count <= 1 ? 4 : 100 / (count - 1);
  const crosshair =
    activeLeftPct != null ? (
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-black/70" style={{ left: `${activeLeftPct}%` }} />
    ) : null;

  return (
    <div>
      <div className="flex min-h-[38px] flex-wrap items-center gap-x-4 gap-y-1 border-2 border-black bg-gray-50 px-3 py-1.5 text-xs">
        {summary}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-black">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed ? "5 3" : undefined} />
            </svg>
            {s.name}
          </span>
        ))}
        {lane && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-black">
            <svg width="22" height="10" aria-hidden="true">
              <rect x="2" y="4" width="4" height="6" fill={lane.color} />
              <rect x="9" y="1" width="4" height="9" fill={lane.color} />
              <rect x="16" y="6" width="4" height="4" fill={lane.color} />
            </svg>
            {lane.label}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[56px_minmax(0,1fr)] gap-2">
        <div className="flex flex-col text-right text-[10px] font-black text-text-muted tabular-nums">
          <div className="flex h-48 flex-col justify-between">
            <span className="-translate-y-1/2">{formatValue(yMax)}</span>
            <span>{formatValue(yMax / 2)}</span>
            <span className="translate-y-1/2">0</span>
          </div>
          {lane && (
            <div className="mt-5 flex h-12 flex-col justify-between">
              <span className="-translate-y-1/2">{laneTop.toLocaleString("vi-VN")}</span>
              <span className="translate-y-1/2">0</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div
            role="img"
            tabIndex={0}
            aria-label={`${label}. Dùng phím mũi tên trái phải để xem từng mốc.`}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="relative cursor-crosshair focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <div ref={plotRef} className="relative h-48">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                <div className="border-t border-dashed border-black/20" />
                <div className="border-t border-dashed border-black/15" />
                <div className="border-t-2 border-black" />
              </div>

              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                {series.map((s, idx) =>
                  s.area && paths[idx].area ? (
                    <path key={`${s.name}-area`} d={paths[idx].area} fill={s.color} fillOpacity={0.15} stroke="none" />
                  ) : null,
                )}
                {series.map((s, idx) => (
                  <path
                    key={s.name}
                    d={paths[idx].line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.dashed ? 2 : 2.5}
                    strokeDasharray={s.dashed ? "6 4" : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              {/* Single isolated points have no line segment, so mark every non-null point when there are few. */}
              {count <= 2 &&
                series.map((s) =>
                  s.values.map((v, idx) =>
                    v == null ? null : (
                      <span
                        key={`${s.name}-${idx}`}
                        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-black"
                        style={{ left: `${xPct(idx)}%`, top: `${(yAt(v) / VIEW_H) * 100}%`, background: s.color }}
                      />
                    ),
                  ),
                )}

              {active && (
                <>
                  {crosshair}
                  {series.map((s) => {
                    const v = s.values[active.index];
                    return v == null ? null : (
                      <span
                        key={`active-${s.name}`}
                        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-black"
                        style={{ left: `${activeLeftPct}%`, top: `${(yAt(v) / VIEW_H) * 100}%`, background: s.color }}
                      />
                    );
                  })}
                </>
              )}
            </div>

            {lane && (
              <div className="relative mt-5 h-12 border-b-2 border-black">
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-black/20" />
                <span className="pointer-events-none absolute left-1 top-0.5 text-[11px] font-bold text-text-muted">{lane.label}</span>
                {lane.values.map((v, idx) =>
                  v > 0 ? (
                    <span
                      key={idx}
                      className="pointer-events-none absolute bottom-0 -translate-x-1/2"
                      style={{
                        left: `${xPct(idx)}%`,
                        width: `max(3px, ${laneBarPct}%)`,
                        // Any bucket with at least one error stays visibly above 0.
                        height: `max(4px, ${(v / laneTop) * 100}%)`,
                        background: lane.color,
                      }}
                    />
                  ) : null,
                )}
                {active && crosshair}
              </div>
            )}

            {active && tip && (
              <div
                role="tooltip"
                className={`pointer-events-none absolute z-20 min-w-[180px] -translate-y-1/2 border-2 border-black bg-white px-3 py-2 text-xs shadow-[3px_3px_0_0_#000] ${
                  tipOnLeft ? "-translate-x-full" : ""
                }`}
                style={{ left: active.x + (tipOnLeft ? -TOOLTIP_GAP : TOOLTIP_GAP), top: tipTop }}
              >
                <p className="mb-1.5 whitespace-nowrap border-b-2 border-dashed border-gray-200 pb-1 font-black uppercase text-black">
                  {tip.title}
                </p>
                <dl className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1">
                  {tip.rows.map((row) => (
                    <div key={row.label} className="contents">
                      <dt className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold text-text-muted">
                        {row.color && <span className="h-2.5 w-2.5 border border-black" style={{ background: row.color }} />}
                        {row.label}
                      </dt>
                      <dd className={`whitespace-nowrap text-right font-black tabular-nums ${row.valueClassName ?? "text-black"}`}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          <div className="relative mt-1.5 h-4 text-[10px] font-bold text-text-muted tabular-nums">
            {ticks.map(({ text, idx }) => {
              const shift = idx === 0 ? "translate-x-0" : idx === count - 1 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span key={idx} className={`absolute whitespace-nowrap ${shift}`} style={{ left: `${xPct(idx)}%` }}>
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Rounds a count up to 1, 2 or 5 × 10^n, never below 1, so the lane's top tick is a whole number. */
function niceIntegerCeiling(value: number): number {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

/** Rounds the axis maximum up to 1, 2, 2.5 or 5 × 10^n so the gridline labels are tidy. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}
