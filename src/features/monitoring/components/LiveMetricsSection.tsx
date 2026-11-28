"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertOctagon, Cpu, Database, Gauge, ListOrdered, Server, Timer, Zap } from "lucide-react";
import {
  describeMonitoringError,
  fetchLiveSystemMetrics,
  type LiveSort,
  type LiveSystemMetrics,
  type LiveWindow,
} from "@/lib/api/monitoring";
import {
  TONE_BADGE,
  TONE_TEXT,
  errorRateTone,
  formatClock,
  formatCount,
  formatDateTime,
  formatMb,
  formatPerMinute,
  formatRate,
  formatUptime,
} from "../format";
import {
  EndpointTable,
  ErrorBanner,
  InfoTip,
  LATENCY_EXPLANATION,
  LatencyStrip,
  MetricCard,
  Panel,
  PillGroup,
  StatusBadge,
} from "./MonitoringUi";

const POLL_INTERVAL_MS = 15_000;

const WINDOW_OPTIONS: { value: LiveWindow; label: string }[] = [
  { value: "5m", label: "5 phút" },
  { value: "15m", label: "15 phút" },
  { value: "60m", label: "60 phút" },
];

const SORT_OPTIONS: { value: LiveSort; label: string }[] = [
  { value: "p95Ms", label: "p95" },
  { value: "avgMs", label: "Trung bình" },
  { value: "count", label: "Lượt gọi" },
  { value: "errorRate", label: "Tỉ lệ lỗi" },
];

const TONE_LABEL = { ok: "Ổn định", warn: "Cần chú ý", bad: "Cảnh báo", none: "Chưa có dữ liệu" } as const;

export default function LiveMetricsSection({ refreshSignal }: { refreshSignal: number }) {
  const [liveWindow, setLiveWindow] = useState<LiveWindow>("15m");
  const [sort, setSort] = useState<LiveSort>("p95Ms");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [data, setData] = useState<LiveSystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchLiveSystemMetrics({ window: liveWindow, sort, limit: 10 });
      if (id !== requestId.current) return;
      setData(result);
      setError("");
    } catch (err) {
      if (id !== requestId.current) return;
      setError(describeMonitoringError(err, "Không thể tải số liệu trực tiếp."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [liveWindow, sort]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = globalThis.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, [autoRefresh, load]);

  const overview = data?.overview;
  const initialLoading = loading && !data;
  const rateTone = errorRateTone(overview?.errorRate);
  const hasWindowData = !!data && data.window.from !== data.window.to;
  const windowLabel = WINDOW_OPTIONS.find((o) => o.value === liveWindow)?.label;
  const db = data?.components.db;
  const jvm = data?.components.jvm;
  const heapPct = jvm?.heapUsedMb != null && jvm.heapMaxMb ? Math.min(100, (jvm.heapUsedMb / jvm.heapMaxMb) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Live toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000] sm:px-5">
        <span className="inline-flex items-center gap-1.5 border border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          <span className={`h-2 w-2 ${autoRefresh ? "animate-pulse bg-primary" : "bg-gray-400"}`} aria-hidden="true" />
          Trực tiếp
        </span>
        <PillGroup label="Khoảng" options={WINDOW_OPTIONS} value={liveWindow} onChange={setLiveWindow} />

        <div className="hidden h-6 w-0.5 bg-black/15 sm:block" aria-hidden="true" />

        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-black uppercase tracking-wider text-text-muted">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-[#1f432b]"
          />
          Tự động cập nhật (15 giây)
        </label>

        {data && (
          <span className="ml-auto inline-flex flex-wrap items-center gap-2 text-[11px] font-bold text-text-muted">
            <span className="tabular-nums">
              Dữ liệu {formatClock(data.window.from)}–{formatClock(data.window.to)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Cập nhật lúc {formatClock(data.generatedAt, true)}</span>
          </span>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {data && !hasWindowData && (
        <div className="border-2 border-black bg-[#fef9c3] px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]">
          Máy chủ vừa khởi động nên chưa có số liệu theo phút. Số liệu được ghi lại vào đầu mỗi phút.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <MetricCard
          title="Lưu lượng"
          subtitle={`Trong ${windowLabel} gần nhất`}
          value={formatPerMinute(overview?.requestsPerMinute)}
          icon={Activity}
          iconBoxClass="bg-primary"
          loading={initialLoading}
          footer={
            <>
              Tổng <strong className="font-black text-black tabular-nums">{formatCount(overview?.totalRequests)}</strong> lượt gọi API
            </>
          }
        />
        <MetricCard
          title="Tỉ lệ lỗi máy chủ (5xx)"
          subtitle="Phản hồi 5xx trên tổng lượt gọi"
          value={formatRate(overview?.errorRate)}
          valueClassName={TONE_TEXT[rateTone]}
          icon={AlertOctagon}
          iconBoxClass="bg-[#fecaca]"
          badge={{ label: TONE_LABEL[rateTone], className: TONE_BADGE[rateTone] }}
          loading={initialLoading}
          footer={
            <p className="tabular-nums">
              5xx (lỗi máy chủ): <strong className="font-black text-black">{formatCount(overview?.serverErrorCount)}</strong>
              {" · "}
              4xx (yêu cầu bị từ chối): <strong className="font-black text-black">{formatCount(overview?.clientErrorCount)}</strong>
            </p>
          }
        />
        <MetricCard
          title="Thời gian hoạt động"
          subtitle="Máy chủ đang phục vụ trang này"
          value={data ? formatUptime(data.instance.uptimeSeconds) : "—"}
          icon={Server}
          iconBoxClass="bg-[#e9d5ff]"
          loading={initialLoading}
          footer={
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
              <dt>Máy chủ:</dt>
              <dd className="break-all font-mono font-bold text-black">{data?.instance.instanceId ?? "—"}</dd>
              <dt>Khởi động:</dt>
              <dd className="font-bold text-black tabular-nums">{data ? formatDateTime(data.instance.startedAt) : "—"}</dd>
            </dl>
          }
        />
      </div>

      {/* Latency */}
      <Panel
        label="Độ trễ"
        icon={Timer}
        iconBoxClass="bg-[#bae6fd]"
        title="Độ trễ (latency)"
        titleAddon={<InfoTip label="Giải thích các chỉ số độ trễ">{LATENCY_EXPLANATION}</InfoTip>}
        description={`Thời gian máy chủ xử lý một yêu cầu, trong ${windowLabel} gần nhất.`}
      >
        <LatencyStrip
          loading={initialLoading}
          avg={overview?.avgLatencyMs}
          p50={overview?.p50LatencyMs}
          p95={overview?.p95LatencyMs}
          p99={overview?.p99LatencyMs}
          max={overview?.maxLatencyMs}
        />
      </Panel>

      {/* Component health */}
      <Panel
        label="Tình trạng thành phần hệ thống"
        icon={Gauge}
        iconBoxClass="bg-[#fef08a]"
        title="Tình trạng thành phần"
        description="Database, Redis và JVM của máy chủ hiện tại."
      >
        <div className="grid grid-cols-1 divide-y-2 divide-black md:grid-cols-3 md:divide-x-2 md:divide-y-0">
          <ComponentTile icon={Database} title="Database" status={db?.status} loading={initialLoading}>
            <p className="col-span-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
              Connection pool
              <InfoTip label="Giải thích Active, Idle, Pending">
                <strong>Active:</strong> đang chạy truy vấn. <strong>Idle:</strong> đã mở, sẵn sàng dùng.{" "}
                <strong>Pending:</strong> yêu cầu đang phải chờ vì mọi kết nối đều bận.
              </InfoTip>
            </p>
            <Stat label="Active" value={formatCount(db?.activeConnections)} />
            <Stat label="Idle" value={formatCount(db?.idleConnections)} />
            <Stat label="Pending" value={formatCount(db?.pendingConnections)} warn={(db?.pendingConnections ?? 0) > 0} />
          </ComponentTile>

          <ComponentTile icon={Zap} title="Redis" status={data?.components.redis.status} loading={initialLoading}>
            <p className="col-span-3 text-xs font-medium text-text-muted">
              Dùng cho cache cửa hàng, mã OTP, phiên thanh toán và danh sách token đã thu hồi. Khi mất kết nối, các tính năng này có
              thể chậm hoặc lỗi.
            </p>
          </ComponentTile>

          <ComponentTile icon={Cpu} title="JVM" loading={initialLoading}>
            <div className="col-span-3">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-text-muted">
                <span>Heap memory</span>
                <span className="tabular-nums text-black">
                  {formatMb(jvm?.heapUsedMb)} / {formatMb(jvm?.heapMaxMb)}
                </span>
              </div>
              <div className="mt-1.5 h-3 border-2 border-black bg-gray-100" role="presentation">
                <div
                  className={`h-full ${heapPct != null && heapPct >= 85 ? "bg-red-500" : heapPct != null && heapPct >= 70 ? "bg-[#facc15]" : "bg-primary"}`}
                  style={{ width: `${heapPct ?? 0}%` }}
                />
              </div>
            </div>
            <Stat label="Threads" value={formatCount(jvm?.threadsLive)} />
            <Stat label="CPU" value={formatRate(jvm?.cpuUsage)} warn={(jvm?.cpuUsage ?? 0) >= 0.8} />
            <Stat label="Heap" value={heapPct == null ? "—" : `${Math.round(heapPct)}%`} warn={(heapPct ?? 0) >= 85} />
          </ComponentTile>
        </div>
      </Panel>

      {/* Endpoint table */}
      <Panel
        label="Endpoint nổi bật"
        icon={ListOrdered}
        title="Endpoint nổi bật"
        actions={<PillGroup label="Sắp xếp" options={SORT_OPTIONS} value={sort} onChange={setSort} />}
      >
        <EndpointTable
          items={data?.endpoints ?? []}
          loading={initialLoading}
          emptyTitle="Chưa có lượt gọi API"
          emptyHint="Không có yêu cầu nào được ghi nhận trong khoảng thời gian này."
        />
      </Panel>
    </div>
  );
}

function ComponentTile({
  icon: Icon,
  title,
  status,
  loading,
  children,
}: {
  icon: typeof Database;
  title: string;
  status?: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          {title}
        </span>
        {loading ? <span className="h-5 w-20 animate-pulse bg-gray-200" /> : status && <StatusBadge status={status} />}
      </div>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="border-2 border-black bg-gray-50 px-2 py-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`text-sm font-black tabular-nums ${warn ? "text-red-700" : "text-black"}`}>{value}</p>
    </div>
  );
}
