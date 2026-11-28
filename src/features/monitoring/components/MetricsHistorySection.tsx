"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, History, LineChart, ListOrdered, Timer, X } from "lucide-react";
import {
  describeMonitoringError,
  fetchMetricsHistory,
  type HistoryInterval,
  type MetricsHistory,
} from "@/lib/api/monitoring";
import {
  TONE_TEXT,
  errorRateTone,
  formatClock,
  formatCount,
  formatDateTime,
  formatDay,
  formatLatency,
  formatPerMinute,
  formatRate,
  latencyTone,
} from "../format";
import MetricLineChart, { type LineSeries } from "./MetricLineChart";
import { EndpointTable, ErrorBanner, MethodBadge, Panel, PillGroup } from "./MonitoringUi";

type RangePreset = "1h" | "6h" | "24h" | "7d" | "30d";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const COLORS = {
  requests: "#1f432b",
  errors: "#dc2626",
  p95: "#0369a1",
  avg: "#6b7280",
};

/** Point size per range: about 60–170 points each, well under the backend's 1,500-point limit. */
const PRESETS: Record<RangePreset, { label: string; interval: HistoryInterval }> = {
  "1h": { label: "1 giờ", interval: "1m" },
  "6h": { label: "6 giờ", interval: "5m" },
  "24h": { label: "24 giờ", interval: "15m" },
  "7d": { label: "7 ngày", interval: "1h" },
  "30d": { label: "30 ngày", interval: "1d" },
};

const PRESET_OPTIONS = (Object.keys(PRESETS) as RangePreset[]).map((value) => ({ value, label: PRESETS[value].label }));

function rangeFor(preset: RangePreset, now: Date): { from: Date; to: Date } {
  const to = now;
  switch (preset) {
    case "1h":
      return { from: new Date(now.getTime() - HOUR_MS), to };
    case "6h":
      return { from: new Date(now.getTime() - 6 * HOUR_MS), to };
    case "24h":
      return { from: new Date(now.getTime() - DAY_MS), to };
    case "7d":
      return { from: new Date(now.getTime() - 7 * DAY_MS), to };
    case "30d": {
      // Start at Vietnam midnight 29 days ago: 30 daily points, and safely inside the 30-day retention
      // even if this browser's clock is a little behind the server.
      const vnMidnightToday = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
      return { from: new Date(vnMidnightToday - 29 * DAY_MS), to };
    }
  }
}

/** Ranges longer than a day need the date on the axis, not just the time. */
function axisLabel(iso: string, preset: RangePreset): string {
  if (preset === "30d") return formatDay(iso);
  if (preset === "7d") return `${formatDay(iso)} ${formatClock(iso)}`;
  return formatClock(iso);
}

function fullLabel(iso: string, preset: RangePreset): string {
  return preset === "30d" ? `Ngày ${formatDay(iso)}` : formatDateTime(iso);
}

export default function MetricsHistorySection({ refreshSignal }: { refreshSignal: number }) {
  const [preset, setPreset] = useState<RangePreset>("24h");
  const [endpointFilter, setEndpointFilter] = useState<{ method: string; uri: string } | null>(null);
  const [data, setData] = useState<MetricsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const { from, to } = rangeFor(preset, new Date());
      const result = await fetchMetricsHistory({
        from,
        to,
        interval: PRESETS[preset].interval,
        method: endpointFilter?.method,
        uri: endpointFilter?.uri,
      });
      if (id !== requestId.current) return;
      setData(result);
      setError("");
    } catch (err) {
      if (id !== requestId.current) return;
      setError(describeMonitoringError(err, "Không thể tải lịch sử số liệu."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [preset, endpointFilter]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const points = useMemo(() => data?.points ?? [], [data]);
  const axisLabels = useMemo(() => points.map((p) => axisLabel(p.periodStart, preset)), [points, preset]);

  const trafficSeries: LineSeries[] = useMemo(
    () => [
      { name: "Lượt gọi", color: COLORS.requests, values: points.map((p) => p.requestCount), area: true },
    ],
    [points],
  );

  const latencySeries: LineSeries[] = useMemo(
    () => [
      { name: "p95", color: COLORS.p95, values: points.map((p) => p.p95LatencyMs), area: true },
      { name: "Trung bình", color: COLORS.avg, values: points.map((p) => p.avgLatencyMs), dashed: true },
    ],
    [points],
  );

  const summary = data?.summary;
  const chartLoading = loading && !data;
  const maxTicks = preset === "7d" ? 5 : 7;

  return (
    <div className="flex flex-col gap-5">
      {/* History toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000] sm:px-5">
        <span className="inline-flex items-center gap-1.5 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
          <History className="h-3 w-3" aria-hidden="true" />
          Lịch sử
        </span>
        <PillGroup label="Khoảng" options={PRESET_OPTIONS} value={preset} onChange={setPreset} />

        <div className="hidden h-6 w-0.5 bg-black/15 sm:block" aria-hidden="true" />

        {endpointFilter ? (
          <span className="inline-flex max-w-full items-center gap-2 border-2 border-black bg-[#fef9c3] py-1 pl-2 pr-1 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
            <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <MethodBadge method={endpointFilter.method} />
            <span className="truncate font-mono" title={endpointFilter.uri}>
              {endpointFilter.uri}
            </span>
            <button
              type="button"
              onClick={() => setEndpointFilter(null)}
              aria-label="Bỏ lọc endpoint"
              className="shrink-0 cursor-pointer border border-black bg-white p-0.5 text-black transition-colors hover:bg-primary"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ) : (
          <span className="text-[11px] font-bold text-text-muted">
            Chọn “Xem xu hướng” ở bảng bên dưới để lọc theo một endpoint.
          </span>
        )}

        {data && (
          <span className="ml-auto text-[11px] font-bold tabular-nums text-text-muted">
            {formatDateTime(data.from)} → {formatDateTime(data.to)}
          </span>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          label="Biểu đồ lưu lượng"
          icon={LineChart}
          title="Lưu lượng"
        >
          <div className="p-4 sm:p-5">
            <MetricLineChart
              label="Biểu đồ số lượt gọi theo thời gian"
              axisLabels={axisLabels}
              series={trafficSeries}
              // 5xx counts are tiny next to request counts, so they get their own lane and scale under the plot.
              lane={{ label: "Lỗi 5xx", color: COLORS.errors, values: points.map((p) => p.serverErrors) }}
              maxTicks={maxTicks}
              loading={chartLoading}
              formatValue={(v) => Math.round(v).toLocaleString("vi-VN")}
              emptyTitle="Chưa có lượt gọi nào"
              emptyHint="Không có số liệu được lưu trong khoảng thời gian này."
              summary={
                <>
                  <SummaryItem label="Tổng" value={`${formatCount(summary?.requestCount)} lượt`} />
                  <SummaryItem label="TB" value={formatPerMinute(summary?.requestsPerMinute)} />
                  <SummaryItem color={COLORS.errors} label="Lỗi 5xx" value={formatCount(summary?.serverErrors)} />
                  <SummaryItem label="4xx" value={formatCount(summary?.clientErrors)} />
                  <SummaryItem
                    label="Tỉ lệ lỗi 5xx"
                    value={formatRate(summary?.errorRate)}
                    valueClassName={TONE_TEXT[errorRateTone(summary?.errorRate)]}
                  />
                </>
              }
              tooltip={(idx) => {
                const p = points[idx];
                return {
                  title: fullLabel(p.periodStart, preset),
                  rows: [
                    { label: "Lượt gọi", value: formatCount(p.requestCount), color: COLORS.requests },
                    {
                      label: "Lỗi 5xx",
                      value: formatCount(p.serverErrors),
                      color: COLORS.errors,
                      valueClassName: p.serverErrors > 0 ? "text-red-700" : undefined,
                    },
                    {
                      label: "Tỉ lệ lỗi 5xx",
                      value: formatRate(p.errorRate),
                      valueClassName: TONE_TEXT[errorRateTone(p.errorRate)],
                    },
                    { label: "4xx", value: formatCount(p.clientErrors) },
                    { label: "Lưu lượng", value: formatPerMinute(p.requestsPerMinute) },
                  ],
                };
              }}
            />
          </div>
        </Panel>

        <Panel
          label="Biểu đồ độ trễ"
          icon={Timer}
          iconBoxClass="bg-[#bae6fd]"
          title="Độ trễ (latency)"
        >
          <div className="p-4 sm:p-5">
            <MetricLineChart
              label="Biểu đồ độ trễ theo thời gian"
              axisLabels={axisLabels}
              series={latencySeries}
              maxTicks={maxTicks}
              loading={chartLoading}
              formatValue={(v) => formatLatency(v)}
              emptyTitle="Chưa có số liệu độ trễ"
              emptyHint="Không có yêu cầu nào trong khoảng thời gian này."
              summary={
                <>
                  <SummaryItem
                    color={COLORS.p95}
                    label="p95"
                    value={formatLatency(summary?.p95LatencyMs)}
                    valueClassName={TONE_TEXT[latencyTone(summary?.p95LatencyMs)]}
                  />
                  <SummaryItem color={COLORS.avg} label="Trung bình" value={formatLatency(summary?.avgLatencyMs)} />
                  <SummaryItem label="p99" value={formatLatency(summary?.p99LatencyMs)} />
                  <SummaryItem label="Tối đa" value={formatLatency(summary?.maxLatencyMs)} />
                </>
              }
              tooltip={(idx) => {
                const p = points[idx];
                if (p.requestCount === 0) {
                  return { title: fullLabel(p.periodStart, preset), rows: [{ label: "Không có yêu cầu", value: "—" }] };
                }
                return {
                  title: fullLabel(p.periodStart, preset),
                  rows: [
                    {
                      label: "p95",
                      value: formatLatency(p.p95LatencyMs),
                      color: COLORS.p95,
                      valueClassName: TONE_TEXT[latencyTone(p.p95LatencyMs)],
                    },
                    { label: "Trung bình", value: formatLatency(p.avgLatencyMs), color: COLORS.avg },
                    { label: "p99", value: formatLatency(p.p99LatencyMs) },
                    { label: "Tối đa", value: formatLatency(p.maxLatencyMs) },
                    { label: "Lượt gọi", value: formatCount(p.requestCount) },
                  ],
                };
              }}
            />
          </div>
        </Panel>
      </div>

      {/* Top endpoints (only when not filtered by one endpoint) */}
      {!endpointFilter && (
        <Panel
          label="Endpoint chậm nhất"
          icon={ListOrdered}
          iconBoxClass="bg-[#fed7aa]"
          title="Endpoint chậm nhất"
        >
          <EndpointTable
            items={data?.topEndpoints ?? []}
            loading={chartLoading}
            emptyTitle="Chưa có endpoint nào"
            emptyHint="Không có số liệu được lưu trong khoảng thời gian này."
            selectLabel="Xem xu hướng"
            onSelect={(item) => setEndpointFilter({ method: item.method, uri: item.uri })}
          />
        </Panel>
      )}
    </div>
  );
}

/** One "label value" pair in a chart's range-total strip. */
function SummaryItem({
  label,
  value,
  color,
  valueClassName,
}: {
  label: string;
  value: string;
  color?: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {color && <span className="h-2.5 w-2.5 border border-black" style={{ background: color }} aria-hidden="true" />}
      <span className="font-bold text-text-muted">{label}</span>
      <span className={`font-black tabular-nums ${valueClassName ?? "text-black"}`}>{value}</span>
    </span>
  );
}
