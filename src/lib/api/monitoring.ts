import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

/* ------------------------------------------------------------------ */
/* Types mirror the backend monitoring module (MON-02 / MON-03).       */
/* Latency fields and errorRate are null when there were no requests.  */
/* errorRate and cpuUsage are ratios from 0 to 1.                      */
/* ------------------------------------------------------------------ */

export type LiveWindow = "5m" | "15m" | "60m";
export type LiveSort = "count" | "avgMs" | "p95Ms" | "errorRate";
export type HistoryInterval = "1m" | "5m" | "15m" | "1h" | "1d";
export type ComponentStatus = "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN" | string;

export interface LiveEndpointItem {
  method: string;
  uri: string;
  count: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  maxLatencyMs: number | null;
  clientErrors: number;
  serverErrors: number;
  errorRate: number | null;
}

export interface LiveSystemMetrics {
  generatedAt: string;
  window: { from: string; to: string };
  instance: { instanceId: string; startedAt: string; uptimeSeconds: number };
  overview: {
    totalRequests: number;
    requestsPerMinute: number;
    avgLatencyMs: number | null;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
    p99LatencyMs: number | null;
    maxLatencyMs: number | null;
    clientErrorCount: number;
    serverErrorCount: number;
    errorRate: number | null;
  };
  endpoints: LiveEndpointItem[];
  components: {
    db: {
      status: ComponentStatus;
      activeConnections: number | null;
      idleConnections: number | null;
      pendingConnections: number | null;
    };
    redis: { status: ComponentStatus };
    jvm: {
      heapUsedMb: number | null;
      heapMaxMb: number | null;
      threadsLive: number | null;
      cpuUsage: number | null;
    };
  };
}

export interface HistoryStats {
  requestCount: number;
  requestsPerMinute: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  maxLatencyMs: number | null;
  clientErrors: number;
  serverErrors: number;
  errorRate: number | null;
}

export interface HistoryPoint extends HistoryStats {
  periodStart: string;
}

export type HistoryEndpointItem = LiveEndpointItem;

export interface MetricsHistory {
  from: string;
  to: string;
  interval: HistoryInterval;
  filter: { method: string | null; uri: string | null };
  summary: HistoryStats;
  points: HistoryPoint[];
  topEndpoints: HistoryEndpointItem[];
}

async function authorizedGet<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const token = await getSessionToken();
  const { data } = await axios.get<{ data: T }>(path, {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    params,
  });
  return data.data;
}

/** GET /api/management/admin/system/metrics (ADMIN). Live figures of the instance that serves the call. */
export function fetchLiveSystemMetrics(params: {
  window: LiveWindow;
  sort: LiveSort;
  limit: number;
}): Promise<LiveSystemMetrics> {
  return authorizedGet<LiveSystemMetrics>("/api/management/admin/system/metrics", params);
}

/**
 * GET /api/management/admin/system/metrics/history (ADMIN).
 * `from`/`to` are sent as UTC ISO strings so no "+07:00" needs URL encoding.
 */
export function fetchMetricsHistory(params: {
  from: Date;
  to: Date;
  interval: HistoryInterval;
  method?: string | null;
  uri?: string | null;
}): Promise<MetricsHistory> {
  return authorizedGet<MetricsHistory>("/api/management/admin/system/metrics/history", {
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    interval: params.interval,
    method: params.method || undefined,
    uri: params.uri || undefined,
  });
}

/** Turns a backend error into a Vietnamese message for the alert banner. */
export function describeMonitoringError(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { code?: string; message?: string } } })?.response;
  if (response?.status === 403) return "Chỉ tài khoản Quản trị viên mới xem được số liệu giám sát.";
  if (response?.data?.code === "INVALID_METRICS_RANGE") {
    return `Khoảng thời gian không hợp lệ: ${response.data.message ?? ""}`.trim();
  }
  if (response?.data?.message) return response.data.message;
  return (error as Error)?.message || fallback;
}
