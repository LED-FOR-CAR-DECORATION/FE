"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  fetchFirmwareModels,
  fetchFirmwareReleases,
  firmwareErrorMessage,
  type DeprecateFirmwareResult,
  type FirmwareModel,
  type FirmwareRelease,
  type UploadFirmwareResult,
} from "@/lib/api/firmware";
import { formatBytes, formatDateTime } from "../binary";
import FirmwareStatusBadge from "./FirmwareStatusBadge";
import UploadFirmwareModal from "./UploadFirmwareModal";
import DeprecateFirmwareModal from "./DeprecateFirmwareModal";
import ModalPortal from "./ModalPortal";

const RELEASES_PAGE_SIZE = 20;

type ModelStatusFilter = "ALL" | FirmwareModel["status"];
const MODEL_STATUS_FILTERS: Array<{ value: ModelStatusFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "OUT_OF_STOCK", label: "Hết hàng" },
  { value: "DEPRECATED", label: "Ngừng bán" },
];
const MODEL_STATUS_LABELS: Record<FirmwareModel["status"], string> = {
  ACTIVE: "Đang bán",
  OUT_OF_STOCK: "Hết hàng",
  DEPRECATED: "Ngừng bán",
};

type Notice = { kind: "success" | "error"; text: string } | null;

/**
 * Firmware administration (DEV-11..13): pick an LED model on the left, manage that
 * model's release history on the right. The chosen model lives in `?modelId=`.
 */
export default function FirmwareReleasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("modelId")) || null;

  const [models, setModels] = useState<FirmwareModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");
  // null = unknown (the summary request failed), otherwise modelId -> active release.
  const [activeByModel, setActiveByModel] = useState<Map<number, FirmwareRelease> | null>(new Map());

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError("");
    const [modelResult, activeResult] = await Promise.allSettled([
      fetchFirmwareModels(),
      fetchFirmwareReleases({ status: "ACTIVE", size: 100 }),
    ]);
    if (modelResult.status === "fulfilled") {
      setModels(modelResult.value);
    } else {
      setModels([]);
      setModelsError(firmwareErrorMessage(modelResult.reason, "Không thể tải danh sách mẫu LED."));
    }
    setActiveByModel(
      activeResult.status === "fulfilled"
        ? new Map(activeResult.value.items.map((release) => [release.modelId, release]))
        : null,
    );
    setModelsLoading(false);
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const selectModel = (modelId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (modelId) params.set("modelId", String(modelId));
    else params.delete("modelId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const selectedModel = models.find((model) => model.modelId === selectedId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#0F5B38]">
          <Cpu size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Quản lý firmware</h1>
          <p className="text-xs text-gray-500">Chọn một mẫu LED để phát hành, theo dõi và thu hồi firmware OTA của mẫu đó</p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className={selectedModel ? "hidden lg:block" : ""}>
          <ModelList
            models={models}
            loading={modelsLoading}
            error={modelsError}
            activeByModel={activeByModel}
            selectedId={selectedId}
            onSelect={selectModel}
            onRetry={() => void loadModels()}
          />
        </div>
        <div className={selectedModel ? "" : "hidden lg:block"}>
          {selectedModel ? (
            <ModelReleases
              key={selectedModel.modelId}
              model={selectedModel}
              onBack={() => selectModel(null)}
              onReleasesChanged={() => void loadModels()}
            />
          ) : (
            <SelectModelPrompt missing={selectedId !== null && !modelsLoading && !modelsError} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left column: searchable model list
// ---------------------------------------------------------------------------

function ModelList({
  models,
  loading,
  error,
  activeByModel,
  selectedId,
  onSelect,
  onRetry,
}: {
  models: FirmwareModel[];
  loading: boolean;
  error: string;
  activeByModel: Map<number, FirmwareRelease> | null;
  selectedId: number | null;
  onSelect: (modelId: number) => void;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models
      .filter((model) => statusFilter === "ALL" || model.status === statusFilter)
      .filter((model) => !q || model.modelName.toLowerCase().includes(q) || String(model.modelId) === q)
      .sort((a, b) => a.modelName.localeCompare(b.modelName, "vi"));
  }, [models, query, statusFilter]);

  return (
    <section aria-label="Mẫu LED" className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:max-h-[calc(100dvh-11rem)]">
      <div className="flex flex-col gap-2.5 border-b border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-500">Mẫu LED</h2>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            aria-label="Làm mới danh sách mẫu"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mẫu LED…"
            aria-label="Tìm mẫu LED"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#0F5B38]"
          />
        </div>
        <div role="group" aria-label="Lọc theo trạng thái bán" className="flex flex-wrap gap-1">
          {MODEL_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              aria-pressed={statusFilter === filter.value}
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                statusFilter === filter.value ? "bg-[#0F5B38] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && models.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-gray-500">
            <Loader2 size={14} className="animate-spin text-[#0F5B38]" /> Đang tải mẫu LED…
          </p>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <AlertCircle size={22} className="text-red-400" />
            <p className="text-xs font-semibold text-red-700">{error}</p>
            <button type="button" onClick={onRetry} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-500">
            {models.length === 0 ? "Chưa có mẫu LED nào." : "Không có mẫu LED khớp bộ lọc."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((model) => {
              const active = activeByModel?.get(model.modelId);
              const selected = model.modelId === selectedId;
              return (
                <li key={model.modelId}>
                  <button
                    type="button"
                    onClick={() => onSelect(model.modelId)}
                    aria-current={selected ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      selected ? "bg-emerald-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`h-8 w-1 shrink-0 rounded-full ${selected ? "bg-[#0F5B38]" : "bg-transparent"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-gray-900">{model.modelName}</span>
                      <span className="text-[11px] text-gray-400">{MODEL_STATUS_LABELS[model.status]}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {activeByModel === null ? (
                        <span className="text-[11px] text-gray-400">—</span>
                      ) : active ? (
                        <span className="font-mono text-xs font-black text-[#0F5B38]">v{active.version}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600" title="Chưa có bản đang phát hành">
                          <AlertTriangle size={11} /> Chưa có
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!error && models.length > 0 && (
        <p className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
          {visible.length}/{models.length} mẫu
          {activeByModel === null && " · chưa tải được phiên bản đang phát hành"}
        </p>
      )}
    </section>
  );
}

function SelectModelPrompt({ missing }: { missing: boolean }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white/60 p-10 text-center">
      <MousePointerClick size={30} className="text-gray-300" />
      <p className="text-sm font-bold text-gray-700">
        {missing ? "Không tìm thấy mẫu LED này" : "Chọn một mẫu LED để xem và quản lý firmware"}
      </p>
      <p className="max-w-sm text-xs text-gray-500">
        Mỗi mẫu LED có lịch sử phát hành riêng và đúng một bản đang phát hành mà ứng dụng sẽ đề nghị khách cài.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right column: one model's release history
// ---------------------------------------------------------------------------

function ModelReleases({
  model,
  onBack,
  onReleasesChanged,
}: {
  model: FirmwareModel;
  onBack: () => void;
  onReleasesChanged: () => void;
}) {
  const [releases, setReleases] = useState<FirmwareRelease[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deprecating, setDeprecating] = useState<FirmwareRelease | null>(null);
  // Kept separately so the header is right even when the active release is on another page.
  const [active, setActive] = useState<FirmwareRelease | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [list, activeList] = await Promise.all([
        fetchFirmwareReleases({ modelId: model.modelId, page, size: RELEASES_PAGE_SIZE }),
        fetchFirmwareReleases({ modelId: model.modelId, status: "ACTIVE", size: 1 }),
      ]);
      setReleases(list.items);
      setTotalPages(list.totalPages);
      setTotalElements(list.totalElements);
      setActive(activeList.items[0] ?? null);
    } catch (error) {
      setLoadError(firmwareErrorMessage(error, "Không thể tải lịch sử firmware."));
      setReleases([]);
      setActive(undefined);
    } finally {
      setLoading(false);
    }
  }, [model.modelId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyHash = async (release: FirmwareRelease) => {
    try {
      await navigator.clipboard.writeText(release.sha256);
      setCopiedId(release.firmwareId);
      setTimeout(() => setCopiedId((current) => (current === release.firmwareId ? null : current)), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const handleUploaded = (result: UploadFirmwareResult) => {
    setUploadOpen(false);
    setNotice({
      kind: "success",
      text: `Đã phát hành v${result.version}.${result.supersededFirmwareId ? " Bản phát hành trước chuyển thành bản cũ." : ""}`,
    });
    setPage(0);
    void load();
    onReleasesChanged();
  };

  const handleDeprecated = (result: DeprecateFirmwareResult) => {
    const wasActive = active?.firmwareId === result.deprecated.firmwareId;
    setDeprecating(null);
    const rollback = result.newActiveFirmware
      ? ` Mẫu quay về v${result.newActiveFirmware.version}.`
      : wasActive
        ? " Mẫu hiện không còn bản đang phát hành."
        : "";
    setNotice({ kind: "success", text: `Đã thu hồi v${result.deprecated.version}.${rollback}` });
    void load();
    onReleasesChanged();
  };

  return (
    <section aria-label={`Firmware của ${model.modelName}`} className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 lg:hidden">
          <ArrowLeft size={14} /> Danh sách mẫu LED
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black text-gray-900">{model.modelName}</h2>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{MODEL_STATUS_LABELS[model.status]}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-gray-600">
              <span>
                Bản đang phát hành:{" "}
                {active === undefined ? (
                  <span className="text-gray-400">{loading ? "…" : "không rõ"}</span>
                ) : active ? (
                  <strong className="font-mono text-sm text-[#0F5B38]">v{active.version}</strong>
                ) : (
                  <strong className="text-amber-600">chưa có — ứng dụng sẽ báo không có cập nhật</strong>
                )}
              </span>
              {active && <span>{active.installedDeviceCount} thiết bị đang chạy</span>}
              {active && <span>Phát hành {formatDateTime(active.uploadedAt)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0F5B38] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0c4a2d]"
            >
              <Upload size={15} />
              Tải lên firmware
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-semibold ${
            notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.kind === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Ẩn thông báo" className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Lịch sử phát hành</h3>
          {!loadError && <span className="text-[11px] font-semibold text-gray-400">{totalElements} bản</span>}
        </div>

        {loading && releases.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-xs font-semibold text-gray-500">
            <Loader2 size={18} className="mr-2 animate-spin text-[#0F5B38]" />
            Đang tải lịch sử firmware…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <AlertCircle size={30} className="text-red-300" />
            <p className="text-xs font-semibold text-red-700">{loadError}</p>
            <button type="button" onClick={() => void load()} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
              Thử lại
            </button>
          </div>
        ) : releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Cpu size={34} className="text-gray-300" />
            <p className="text-sm font-bold text-gray-700">Mẫu này chưa có bản firmware nào</p>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#0F5B38] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0c4a2d]"
            >
              <Upload size={13} /> Tải lên bản đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 pl-4 pr-3">Phiên bản</th>
                  <th className="px-3 py-3">Dung lượng</th>
                  <th className="px-3 py-3">SHA-256</th>
                  <th className="px-3 py-3 text-right">Thiết bị</th>
                  <th className="px-3 py-3">Tải lên</th>
                  <th className="py-3 pl-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {releases.map((release) => {
                  const expanded = expandedId === release.firmwareId;
                  return (
                    <Fragment key={release.firmwareId}>
                      <tr className={release.status === "ACTIVE" ? "bg-emerald-50/40" : "transition-colors hover:bg-gray-50/70"}>
                        <td className="py-3.5 pl-4 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-gray-900">v{release.version}</span>
                            <FirmwareStatusBadge status={release.status} />
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-mono text-gray-600">{formatBytes(release.fileSizeBytes)}</td>
                        <td className="px-3 py-3.5">
                          <button
                            type="button"
                            onClick={() => void copyHash(release)}
                            title={release.sha256}
                            aria-label={`Sao chép SHA-256 của v${release.version}`}
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-gray-600 hover:bg-gray-100"
                          >
                            {release.sha256.slice(0, 12)}…
                            {copiedId === release.firmwareId ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-bold text-gray-700">{release.installedDeviceCount}</td>
                        <td className="px-3 py-3.5 text-gray-600">{formatDateTime(release.uploadedAt)}</td>
                        <td className="py-3.5 pl-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : release.firmwareId)}
                              aria-expanded={expanded}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              Chi tiết <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            {release.status !== "DEPRECATED" && (
                              <button
                                type="button"
                                onClick={() => setDeprecating(release)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1 font-bold text-red-600 transition hover:bg-red-100"
                              >
                                <Ban size={12} /> Thu hồi
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={6} className="px-4 pb-4 pt-1">
                            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Ghi chú thay đổi</p>
                                <p className="mt-1 whitespace-pre-line text-gray-700">{release.changelog}</p>
                                <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-gray-500">SHA-256</p>
                                <p className="mt-1 break-all font-mono text-gray-600">{release.sha256}</p>
                              </div>
                              <dl className="grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-gray-600">
                                <dt className="font-semibold">Mã</dt>
                                <dd className="font-mono">#{release.firmwareId}</dd>
                                <dt className="font-semibold">Người tải lên</dt>
                                <dd>{release.uploadedBy ?? "—"}</dd>
                                {release.status === "DEPRECATED" && (
                                  <>
                                    <dt className="font-semibold text-red-700">Thu hồi lúc</dt>
                                    <dd>{formatDateTime(release.deprecatedAt)}</dd>
                                    <dt className="font-semibold text-red-700">Bởi</dt>
                                    <dd>{release.deprecatedBy ?? "—"}</dd>
                                    <dt className="font-semibold text-red-700">Lý do</dt>
                                    <dd>{release.deprecationReason ?? "—"}</dd>
                                  </>
                                )}
                              </dl>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loadError && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-xs text-gray-600">
            <span>
              Trang {page + 1}/{totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || loading}
                aria-label="Trang trước"
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page + 1 >= totalPages || loading}
                aria-label="Trang sau"
                className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {uploadOpen && (
        <ModalPortal>
          <UploadFirmwareModal
            model={model}
            activeVersion={active?.version}
            onClose={() => setUploadOpen(false)}
            onUploaded={handleUploaded}
          />
        </ModalPortal>
      )}
      {deprecating && (
        <ModalPortal>
          <DeprecateFirmwareModal release={deprecating} onClose={() => setDeprecating(null)} onDeprecated={handleDeprecated} />
        </ModalPortal>
      )}
    </section>
  );
}
