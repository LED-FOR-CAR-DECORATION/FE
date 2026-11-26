"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  Cpu,
  Edit3,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldOff,
  Store,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  fetchManagedStoreProducts,
  type ManagedStoreProductItem,
} from "@/lib/api/products";
import StatusBadge from "@/features/store-listing/components/StatusBadge";
import {
  fetchLedInstanceDetail,
  fetchLedInstances,
  formatLedInventoryError,
  LedInstanceDetailResponse,
  LedInstanceFilterRequest,
  LedInstanceItem,
  LedModelItem,
  ModelInfo,
  type PaginationMeta,
} from "@/lib/api/ledInstances";
import {
  fetchLedModelsPage,
  formatLedModelError,
  type ManagedLedModelItem,
} from "@/lib/api/ledModels";
import LedModelFormModal from "@/features/product/components/LedModelFormModal";
import DeprecateLedModelModal from "@/features/product/components/DeprecateLedModelModal";
import StockInLedInstancesModal from "@/features/product/components/StockInLedInstancesModal";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";
import CommissionPagination from "@/features/commission/components/CommissionPagination";

type InstanceStatusValue =
  | LedInstanceItem.status
  | LedInstanceDetailResponse.status
  | LedInstanceFilterRequest.status;

const BADGE_BASE_CLASS =
  "inline-flex items-center whitespace-nowrap border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]";

const INSTANCE_STATUS_CONFIG: Record<
  InstanceStatusValue,
  { label: string; className: string }
> = {
  IN_STOCK: {
    label: "Trong kho",
    className: "bg-primary text-black",
  },
  IN_TRANSIT: {
    label: "Đang vận chuyển",
    className: "bg-[#e0f2fe] text-black",
  },
  BOUND: {
    label: "Đã kích hoạt",
    className: "bg-[#ede9fe] text-black",
  },
  RETURNED: {
    label: "Đã hoàn trả",
    className: "bg-[#fef08a] text-black",
  },
  DECOMMISSIONED: {
    label: "Ngừng lưu hành",
    className: "bg-[#fecaca] text-black",
  },
};

const WARRANTY_STATUS_CONFIG: Record<
  LedInstanceDetailResponse.warrantyStatus,
  { label: string; className: string }
> = {
  NOT_ACTIVATED: {
    label: "Chưa kích hoạt",
    className: "bg-gray-200 text-black",
  },
  ACTIVE: {
    label: "Đang trong hạn bảo hành",
    className: "bg-primary text-black",
  },
  EXPIRED: {
    label: "Đã hết hạn bảo hành",
    className: "bg-[#fecaca] text-black",
  },
};

const MODEL_STATUS_LABEL: Record<ModelInfo.status, string> = {
  ACTIVE: "Đang kinh doanh",
  OUT_OF_STOCK: "Hết hàng",
  DEPRECATED: "Ngừng kinh doanh",
};

const LED_MODEL_STATUS_STYLE: Record<LedModelItem.status, string> = {
  ACTIVE: "bg-primary text-black",
  OUT_OF_STOCK: "bg-[#fef08a] text-black",
  DEPRECATED: "bg-gray-200 text-black",
};

function formatDateTime(value?: string | null, includeTime = true): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(
    "vi-VN",
    includeTime
      ? {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
  );
}

function formatQrPayload(qrPayload: unknown): string | null {
  if (qrPayload === null || qrPayload === undefined || qrPayload === "") {
    return null;
  }
  if (typeof qrPayload === "string") {
    try {
      return JSON.stringify(JSON.parse(qrPayload), null, 2);
    } catch {
      return qrPayload;
    }
  }
  try {
    return JSON.stringify(qrPayload, null, 2);
  } catch {
    return String(qrPayload);
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function InventoryPage() {
  const { user } = useAuth();
  const canManageCatalog = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { rows: pageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 56,
    rowGap: 0,
    chromeHeight: 438,
    minRows: 2,
    maxRows: 10,
    defaultRows: 6,
  });

  // Unified Master -> Detail state: null = LED models list, non-null = instances of that LED model
  const [selectedModel, setSelectedModel] = useState<ManagedLedModelItem | null>(null);
  const [instanceReloadKey, setInstanceReloadKey] = useState(0);

  // DEV-01 Paginated LED Models state
  const [models, setModels] = useState<ManagedLedModelItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: 6,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<LedModelItem.status | "ALL">("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals (DEV-02, DEV-03, DEV-04 & Stock-in instances)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ManagedLedModelItem | null>(null);
  const [deprecatingModel, setDeprecatingModel] = useState<ManagedLedModelItem | null>(null);
  const [stockInModel, setStockInModel] = useState<ManagedLedModelItem | null>(null);
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchInput.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load paginated models (DEV-01)
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoadingModels(true);
    setModelsError(null);

    fetchLedModelsPage({
      page,
      size: pageSize,
      keyword: debouncedKeyword || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      lowStockOnly: lowStockOnly ? true : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        const nextTotalPages = Math.max(1, res.meta.totalPages || 1);
        if (page > 0 && page >= nextTotalPages) {
          setPage(Math.max(0, nextTotalPages - 1));
          return;
        }
        setModels(res.items);
        setMeta(res.meta);
        setSelectedModel((prev) => {
          if (!prev) return null;
          return res.items.find((m) => m.modelId === prev.modelId) ?? prev;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setModelsError(
          formatLedModelError(err, "Không thể tải danh sách mẫu LED từ máy chủ."),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, page, pageSize, debouncedKeyword, statusFilter, lowStockOnly, reloadKey]);

  const triggerReload = useCallback(() => {
    setReloadKey((k) => k + 1);
    setInstanceReloadKey((k) => k + 1);
  }, []);

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedKeyword("");
    setStatusFilter("ALL");
    setLowStockOnly(false);
    setPage(0);
  };

  return (
    <div className="manager-neo-dashboard mx-auto w-full max-w-[1440px] font-sans text-text-main">
      <div className="flex min-h-[calc(100dvh-114px)] flex-col gap-3 xl:h-[calc(100dvh-114px)]">
        {/* Top Row: Compact Header Banner */}
        <header className="shrink-0 border-2 border-black border-l-8 border-l-primary bg-white px-4 py-2.5 shadow-[4px_4px_0_0_#000] sm:px-5 sm:py-3">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                  KHO THIẾT BỊ LED
                </span>
                <nav
                  aria-label="Đường dẫn"
                  className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                >
                  <span>Quản lý</span>
                  <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                  <span className="text-black">Quản lý kho LED</span>
                </nav>
              </div>

              <div className="flex items-center gap-2.5">
                <Boxes
                  size={20}
                  className="shrink-0 text-primary-ink"
                  aria-hidden="true"
                />
                <h1 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
                  QUẢN LÝ KHO LED
                </h1>
              </div>

              <p className="text-xs font-medium text-text-muted">
                Quản lý danh mục mẫu LED phần cứng, tồn kho, thông số kỹ thuật và theo dõi từng thiết bị trong kho.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={triggerReload}
                className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <RefreshCw
                  size={14}
                  className={isLoadingModels ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Làm mới
              </button>

              {canManageCatalog && (
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  <Plus size={15} aria-hidden="true" />
                  Thêm mẫu LED
                </button>
              )}
            </div>
          </div>
        </header>

        {!canManageCatalog && (
          <div
            role="status"
            className="flex shrink-0 items-center gap-2.5 border-2 border-black bg-[#fef08a] px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <Lock size={15} className="shrink-0 text-black" aria-hidden="true" />
            <span>
              Chế độ chỉ xem: Chỉ Quản lý hoặc Quản trị viên mới có quyền thêm, cập nhật hoặc ngừng kinh doanh mẫu LED.
            </span>
          </div>
        )}

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={`flex shrink-0 items-center justify-between gap-3 border-2 border-black px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000] ${
              notice.type === "error" ? "bg-[#fee2e2]" : "bg-primary/30"
            }`}
          >
            <span className="flex items-center gap-2">
              {notice.type === "error" ? (
                <AlertTriangle size={16} className="shrink-0 text-red-700" aria-hidden="true" />
              ) : (
                <CheckCircle size={16} className="shrink-0 text-primary-ink" aria-hidden="true" />
              )}
              {notice.message}
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Đóng thông báo"
              className="btn-secondary p-1! shadow-[2px_2px_0_0_#000]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Main Workspace Card */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {selectedModel ? (
            <LedInstancesSection
              model={selectedModel}
              pageSize={pageSize}
              ready={ready}
              externalReloadKey={instanceReloadKey}
              canManageCatalog={canManageCatalog}
              onBack={() => setSelectedModel(null)}
              onEditModel={() => setEditingModel(selectedModel)}
              onOpenStockIn={() => setStockInModel(selectedModel)}
            />
          ) : (
            <>
              <section className="flex min-h-0 flex-1 flex-col gap-2.5 border-2 border-black bg-white p-3.5 shadow-[4px_4px_0_0_#000] sm:p-4">
                {/* Models Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-black pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center border-2 border-black bg-primary shadow-[2px_2px_0_0_#000]">
                      <Cpu className="h-4 w-4 text-black" strokeWidth={2.25} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-black">
                        DANH SÁCH MẪU LED TRONG KHO
                      </h2>
                      <p className="text-[11px] font-medium text-text-muted">
                        Bấm vào một mẫu LED để xem danh sách thiết bị (Serial/MAC) và nhập kho thiết bị mới.
                      </p>
                    </div>
                  </div>

                  <span className={`${BADGE_BASE_CLASS} bg-white`}>
                    Tổng {meta.totalElements} mẫu
                  </span>
                </div>

                {/* Filter Toolbar */}
                <div className="grid shrink-0 gap-2.5 md:grid-cols-[1fr_210px_auto_auto]">
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
                      aria-hidden="true"
                    />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      aria-label="Tìm theo tên mẫu LED"
                      className="w-full border-2 border-black bg-gray-50 py-1.5 pl-9 pr-3 text-xs font-bold text-black focus:bg-white"
                      placeholder="Tìm theo tên mẫu LED..."
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as LedModelItem.status | "ALL");
                      setPage(0);
                    }}
                    aria-label="Lọc theo trạng thái mẫu LED"
                    className="border-2 border-black bg-gray-50 px-3 py-1.5 text-xs font-bold text-black focus:bg-white"
                  >
                    <option value="ALL">Trạng thái: Tất cả</option>
                    <option value={LedModelItem.status.ACTIVE}>Đang kinh doanh</option>
                    <option value={LedModelItem.status.OUT_OF_STOCK}>Hết hàng</option>
                    <option value={LedModelItem.status.DEPRECATED}>Ngừng kinh doanh</option>
                  </select>

                  <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-black bg-gray-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black transition-colors hover:bg-primary/20">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => {
                        setLowStockOnly(e.target.checked);
                        setPage(0);
                      }}
                      className="h-3.5 w-3.5 cursor-pointer accent-black"
                    />
                    Chỉ mẫu sắp hết (&lt; 5)
                  </label>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                  >
                    <RotateCcw size={13} aria-hidden="true" /> Đặt lại
                  </button>
                </div>

                {modelsError && (
                  <div
                    role="alert"
                    className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-red-700" aria-hidden="true" />
                      {modelsError}
                    </span>
                    <button
                      type="button"
                      onClick={triggerReload}
                      className="btn-secondary px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Models Table */}
                <div className="min-h-0 flex-1 overflow-auto border-2 border-black bg-white">
                  <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
                    <colgroup>
                      <col className="w-[31%]" />
                      <col className="w-[11%]" />
                      <col className="w-[10%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[24%]" />
                    </colgroup>
                    <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                      <tr>
                        <th className="px-4 py-2.5 text-left">
                          Mẫu LED &amp; Thông số
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          Kích thước
                        </th>
                        <th className="px-2 py-2.5 text-center">
                          Tồn kho
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          Sản phẩm liên kết
                        </th>
                        <th className="px-2 py-2.5 text-center">
                          Trạng thái
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 bg-white">
                      {isLoadingModels ? (
                        Array.from({ length: pageSize }).map((_, idx) => (
                          <tr key={`skeleton-model-${idx}`} className="animate-pulse">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 bg-gray-200" />
                                <div className="space-y-1.5">
                                  <div className="h-3.5 w-36 bg-gray-200" />
                                  <div className="h-3 w-48 bg-gray-100" />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="mx-auto h-5 w-16 bg-gray-200" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="mx-auto h-4 w-8 bg-gray-200" />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="mx-auto h-8 w-8 bg-gray-200" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="mx-auto h-5 w-24 bg-gray-200" />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="ml-auto flex justify-end gap-1.5">
                                <div className="h-8 w-8 bg-gray-200" />
                                <div className="h-8 w-8 bg-gray-200" />
                                <div className="h-8 w-8 bg-gray-200" />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : models.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-12 text-center text-xs font-black uppercase tracking-wide text-text-muted"
                          >
                            Không tìm thấy mẫu LED phù hợp.
                          </td>
                        </tr>
                      ) : (
                        models.map((item) => {
                          const width = item.spec?.widthPx;
                          const height = item.spec?.heightPx;
                          const isDeprecated = item.status === LedModelItem.status.DEPRECATED;
                          const specPreview =
                            item.spec?.attributes
                              ?.slice(0, 2)
                              .map((a) => `${a.label}: ${a.value}`)
                              .join(" • ") ?? "";

                          return (
                            <tr
                              key={item.modelId}
                              onClick={() => setSelectedModel(item)}
                              title="Bấm để xem thiết bị (Serial/MAC)"
                              className={`cursor-pointer transition-colors duration-150 hover:bg-[#f3faf5] ${
                                isDeprecated ? "bg-gray-50 opacity-80" : ""
                              }`}
                            >
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-primary/30 text-black shadow-[2px_2px_0_0_#000]">
                                    <Cpu size={16} aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate text-xs font-black uppercase leading-snug text-black sm:text-sm">
                                        {item.modelName}
                                      </p>
                                      <span className="shrink-0 border border-black bg-gray-100 px-1.5 py-0.2 font-mono text-[10px] font-black text-black">
                                        #{item.modelId}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">
                                      {specPreview || "Chưa khai báo thông số phụ"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-2 text-center">
                                <span className="inline-block whitespace-nowrap border border-black bg-gray-100 px-2 py-0.5 font-mono text-xs font-black text-black tabular-nums">
                                  {width && height ? `${width}×${height} px` : "—"}
                                </span>
                              </td>

                              <td className="px-2 py-2 text-center">
                                <div className="inline-flex items-center justify-center gap-1.5">
                                  <span
                                    className={`text-sm font-black tabular-nums ${
                                      item.stockQuantity === 0
                                        ? "text-red-700"
                                        : item.isLowStock
                                          ? "text-amber-800"
                                          : "text-black"
                                    }`}
                                  >
                                    {item.stockQuantity}
                                  </span>
                                  {item.isLowStock && !isDeprecated && (
                                    <span className={`${BADGE_BASE_CLASS} bg-[#fef08a]`}>
                                      Sắp hết
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td
                                className="px-3 py-2 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.productId != null ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingProductId(item.productId!)}
                                    title={`Xem chi tiết sản phẩm #${item.productId}`}
                                    aria-label={`Xem chi tiết sản phẩm #${item.productId}`}
                                    className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-primary/40 px-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                  >
                                    <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[84px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[84px] group-focus-visible/btn:opacity-100">
                                      Sản phẩm
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-xs font-bold text-text-muted">—</span>
                                )}
                              </td>

                              <td className="px-2 py-2 text-center">
                                <span
                                  className={`${BADGE_BASE_CLASS} ${
                                    LED_MODEL_STATUS_STYLE[item.status]
                                  }`}
                                >
                                  {MODEL_STATUS_LABEL[item.status] ?? item.status}
                                </span>
                              </td>

                              <td
                                className="px-4 py-2 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                                  {canManageCatalog && !isDeprecated && (
                                    <button
                                      type="button"
                                      onClick={() => setStockInModel(item)}
                                      aria-label={`Nhập kho thiết bị cho ${item.modelName}`}
                                      title="Nhập kho thiết bị kèm Serial/MAC"
                                      className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                      <PackagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[84px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[84px] group-focus-visible/btn:opacity-100">
                                        Nhập kho
                                      </span>
                                    </button>
                                  )}
                                  {canManageCatalog && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingModel(item)}
                                      aria-label={`Cập nhật mẫu ${item.modelName}`}
                                      title="Cập nhật tên & thông số kỹ thuật"
                                      className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                      <Edit3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[84px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[84px] group-focus-visible/btn:opacity-100">
                                        Cập nhật
                                      </span>
                                    </button>
                                  )}
                                  {canManageCatalog && !isDeprecated && (
                                    <button
                                      type="button"
                                      onClick={() => setDeprecatingModel(item)}
                                      aria-label={`Ngừng kinh doanh ${item.modelName}`}
                                      title="Ngừng kinh doanh mẫu LED này"
                                      className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-[#fecaca] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                      <ShieldOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[88px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[88px] group-focus-visible/btn:opacity-100">
                                        Ngừng KD
                                      </span>
                                    </button>
                                  )}
                                  {!canManageCatalog && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedModel(item)}
                                      aria-label={`Xem thiết bị của ${item.modelName}`}
                                      title="Xem danh sách thiết bị (Serial/MAC)"
                                      className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                      <Boxes className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[84px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[84px] group-focus-visible/btn:opacity-100">
                                        Thiết bị
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <CommissionPagination
                page={meta.page}
                size={meta.size || pageSize}
                totalElements={meta.totalElements}
                totalPages={meta.totalPages}
                onPageChange={(nextPage) => setPage(nextPage)}
                ariaLabel="Phân trang danh sách mẫu LED"
                disabled={isLoadingModels}
                className="mt-auto shrink-0"
              />
            </>
          )}
        </div>
      </div>

      {/* DEV-02: Tạo mới Mẫu LED */}
      {createModalOpen && (
        <LedModelFormModal
          mode="create"
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(created, extra) => {
            if (extra?.productError) {
              setNotice({
                type: "error",
                message: `Đã tạo mẫu LED "${created.modelName}" (#${created.modelId}), nhưng ${extra.productError}`,
              });
            } else if (extra?.linkedProductId) {
              setNotice({
                type: "success",
                message: `Đã tạo mẫu LED "${created.modelName}" (#${created.modelId}) và liên kết sản phẩm Cửa hàng #${extra.linkedProductId} thành công.`,
              });
            } else {
              setNotice({
                type: "success",
                message: `Đã đăng ký mẫu LED mới "${created.modelName}" (#${created.modelId}) với tồn kho ${created.stockQuantity}.`,
              });
            }
            setPage(0);
            triggerReload();
          }}
        />
      )}

      {/* DEV-03: Cập nhật Mẫu LED & đồng bộ Sản phẩm */}
      {editingModel && (
        <LedModelFormModal
          mode="edit"
          initialModel={editingModel}
          onClose={() => setEditingModel(null)}
          onSuccess={(updated, extra) => {
            if (extra?.productError) {
              setNotice({
                type: "error",
                message: `Đã cập nhật mẫu LED "${updated.modelName}" (#${updated.modelId}), nhưng đồng bộ sản phẩm Cửa hàng gặp lỗi: ${extra.productError}`,
              });
            } else if (extra?.linkedProductId) {
              setNotice({
                type: "success",
                message: `Đã cập nhật đồng thời mẫu LED "${updated.modelName}" (#${updated.modelId}) và sản phẩm Cửa hàng #${extra.linkedProductId} — tồn kho: ${updated.stockQuantity}.`,
              });
            } else {
              setNotice({
                type: "success",
                message: `Đã cập nhật mẫu LED "${updated.modelName}" (#${updated.modelId}) — tồn kho hiện tại: ${updated.stockQuantity}.`,
              });
            }
            triggerReload();
          }}
        />
      )}

      {/* DEV-04: Ngừng kinh doanh Mẫu LED */}
      {deprecatingModel && (
        <DeprecateLedModelModal
          model={deprecatingModel}
          onClose={() => setDeprecatingModel(null)}
          onSuccess={(deprecated) => {
            setNotice({
              type: "success",
              message: `Đã ngừng kinh doanh mẫu LED "${deprecated.modelName}" (#${deprecated.modelId})${
                deprecated.productId != null
                  ? ` và đồng bộ lưu trữ sản phẩm Cửa hàng #${deprecated.productId}`
                  : ""
              }.`,
            });
            triggerReload();
          }}
        />
      )}

      {/* Nhập kho thiết bị (Serial & MAC) */}
      {stockInModel && (
        <StockInLedInstancesModal
          model={stockInModel}
          onClose={() => setStockInModel(null)}
          onSuccess={(result) => {
            setNotice({
              type: "success",
              message: `Đã nhập kho thành công ${result.importedCount} thiết bị (Serial/MAC) cho mẫu "${result.modelName}" — tồn kho mới: ${result.stockQuantity}.`,
            });
            setSelectedModel((prev) =>
              prev && prev.modelId === result.modelId
                ? {
                    ...prev,
                    stockQuantity: result.stockQuantity,
                    status: result.modelStatus,
                    isLowStock: result.stockQuantity < 5,
                  }
                : prev,
            );
            triggerReload();
          }}
        />
      )}

      {viewingProductId != null && (
        <LinkedProductDetailModal
          productId={viewingProductId}
          onClose={() => setViewingProductId(null)}
        />
      )}
    </div>
  );
}

function LedInstancesSection({
  model,
  pageSize,
  ready,
  externalReloadKey,
  canManageCatalog,
  onBack,
  onEditModel,
  onOpenStockIn,
}: {
  model: ManagedLedModelItem;
  pageSize: number;
  ready: boolean;
  externalReloadKey: number;
  canManageCatalog: boolean;
  onBack: () => void;
  onEditModel: () => void;
  onOpenStockIn: () => void;
}) {
  const [instances, setInstances] = useState<LedInstanceItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: 4,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    LedInstanceFilterRequest.status | ""
  >("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setPage(0);
    setStatusFilter("");
    setSearchInput("");
    setDebouncedSearch("");
  }, [model.modelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== debouncedSearch) {
        setDebouncedSearch(normalized);
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    fetchLedInstances({
      page,
      size: pageSize,
      modelId: model.modelId,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        const nextTotalPages = Math.max(1, result.meta.totalPages || 1);
        if (page > 0 && page >= nextTotalPages) {
          setPage(Math.max(0, nextTotalPages - 1));
          return;
        }
        setInstances(result.items);
        setMeta(result.meta);
      })
      .catch((error) => {
        if (cancelled) return;
        setInstances([]);
        setErrorMessage(
          formatLedInventoryError(
            error,
            "Không thể tải danh sách thiết bị LED vật lý.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready, page, pageSize, model.modelId, statusFilter, debouncedSearch, reloadKey, externalReloadKey]);

  const handleReset = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPage(0);
  };

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col gap-2.5 border-2 border-black bg-white p-3.5 shadow-[4px_4px_0_0_#000] sm:p-4">
        {/* Selected Model Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Danh sách mẫu LED
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-tight text-black sm:text-base">
                  {model.modelName}
                </h2>
                <span className="border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                  #{model.modelId}
                </span>
                {model.spec?.widthPx && model.spec?.heightPx && (
                  <span className="border border-black bg-white px-2 py-0.5 font-mono text-[10px] font-black text-black">
                    {model.spec.widthPx}×{model.spec.heightPx} px
                  </span>
                )}
                <span
                  className={`${BADGE_BASE_CLASS} ${
                    LED_MODEL_STATUS_STYLE[model.status]
                  }`}
                >
                  {MODEL_STATUS_LABEL[model.status] ?? model.status}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                Tồn kho khả dụng:{" "}
                <strong className="font-black text-black tabular-nums">
                  {model.stockQuantity} thiết bị
                </strong>{" "}
                · Thiết bị (Serial/MAC) thuộc mẫu LED này.
              </p>
            </div>
          </div>

          {canManageCatalog && (
            <div className="flex flex-wrap items-center gap-2">
              {model.status !== LedModelItem.status.DEPRECATED && (
                <button
                  type="button"
                  onClick={onOpenStockIn}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                >
                  <PackagePlus size={14} aria-hidden="true" />
                  Nhập kho thiết bị
                </button>
              )}
              <button
                type="button"
                onClick={onEditModel}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Edit3 size={13} aria-hidden="true" />
                Cập nhật mẫu
              </button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="grid shrink-0 gap-2.5 md:grid-cols-[1fr_210px_auto_auto]">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              aria-hidden="true"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Tìm Serial Number hoặc địa chỉ MAC"
              className="w-full border-2 border-black bg-gray-50 py-1.5 pl-9 pr-3 text-xs font-bold text-black focus:bg-white"
              placeholder="Tìm Serial Number hoặc địa chỉ MAC..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value as LedInstanceFilterRequest.status | "",
              );
              setPage(0);
            }}
            aria-label="Lọc theo trạng thái thiết bị"
            className="border-2 border-black bg-gray-50 px-3 py-1.5 text-xs font-bold text-black focus:bg-white"
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value={LedInstanceFilterRequest.status.IN_STOCK}>
              Trong kho
            </option>
            <option value={LedInstanceFilterRequest.status.IN_TRANSIT}>
              Đang vận chuyển
            </option>
            <option value={LedInstanceFilterRequest.status.BOUND}>
              Đã kích hoạt
            </option>
            <option value={LedInstanceFilterRequest.status.RETURNED}>
              Đã hoàn trả
            </option>
            <option value={LedInstanceFilterRequest.status.DECOMMISSIONED}>
              Ngừng lưu hành
            </option>
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            <RotateCcw size={13} aria-hidden="true" /> Đặt lại
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            <RefreshCw
              size={13}
              className={isLoading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Làm mới
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#fee2e2] px-4 py-2.5 text-xs font-bold text-black shadow-[4px_4px_0_0_#000]"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={17} className="shrink-0 text-red-700" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-secondary px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto border-2 border-black bg-white">
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
              <tr>
                <th className="px-4 py-2.5 text-left">Serial &amp; ID</th>
                <th className="px-4 py-2.5 text-left">Model LED</th>
                <th className="px-3 py-2.5 text-left">Địa chỉ MAC</th>
                <th className="px-3 py-2.5 text-center">Trạng thái</th>
                <th className="px-4 py-2.5 text-left">Đơn hàng / Chủ sở hữu</th>
                <th className="px-3 py-2.5 text-left">Bảo hành / Ngày SX</th>
                <th className="px-2 py-2.5 text-center">QR Nhà máy</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 bg-white">
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={`skeleton-instance-${idx}`} className="animate-pulse">
                    <td className="px-4 py-2">
                      <div className="h-3.5 w-28 bg-gray-200" />
                      <div className="mt-1 h-3 w-12 bg-gray-100" />
                    </td>
                    <td className="px-4 py-2"><div className="h-3.5 w-28 bg-gray-200" /></td>
                    <td className="px-3 py-2"><div className="h-3.5 w-24 bg-gray-200" /></td>
                    <td className="px-3 py-2 text-center"><div className="mx-auto h-5 w-20 bg-gray-200" /></td>
                    <td className="px-4 py-2"><div className="h-3.5 w-24 bg-gray-200" /></td>
                    <td className="px-3 py-2"><div className="h-3.5 w-20 bg-gray-100" /></td>
                    <td className="px-2 py-2 text-center"><div className="mx-auto h-5 w-14 bg-gray-200" /></td>
                    <td className="px-4 py-2 text-right"><div className="ml-auto h-8 w-8 bg-gray-200" /></td>
                  </tr>
                ))
              ) : instances.length > 0 ? (
                instances.map((row) => {
                  const statusBadge =
                    INSTANCE_STATUS_CONFIG[row.status] ?? {
                      label: row.status,
                      className: "bg-gray-200 text-black",
                    };
                  const hasQrPayload = Boolean(row.qrPayload);

                  return (
                    <tr
                      key={row.instanceId}
                      className="transition-colors duration-150 hover:bg-[#f3faf5]"
                    >
                      <td className="px-4 py-2">
                        <p className="truncate font-mono text-xs font-black text-black" title={row.serialNumber}>
                          {row.serialNumber}
                        </p>
                        <span className="mt-0.5 inline-block border border-black bg-gray-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-black">
                          #{row.instanceId}
                        </span>
                      </td>

                      <td className="px-4 py-2">
                        <p className="truncate text-xs font-black uppercase text-black">
                          {row.modelName ?? `Model #${row.modelId}`}
                        </p>
                        {row.deviceName && (
                          <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">
                            Tên hiển thị: {row.deviceName}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-2 font-mono text-xs font-bold text-black">
                        {row.macAddress}
                      </td>

                      <td className="px-3 py-2 text-center">
                        <span className={`${BADGE_BASE_CLASS} ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-xs">
                        {row.fulfillment || row.owner ? (
                          <div className="space-y-0.5">
                            {row.fulfillment && (
                              <p className="font-black text-black tabular-nums">
                                Đơn #{row.fulfillment.orderId}
                              </p>
                            )}
                            {row.owner && (
                              <p className="truncate font-medium text-text-muted">
                                {row.owner.fullName ||
                                  row.owner.email ||
                                  `KH #${row.owner.customerId}`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-text-muted">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-xs font-medium text-black tabular-nums">
                        {row.warrantyExpiresAt ? (
                          <span>
                            BH đến {formatDateTime(row.warrantyExpiresAt, false)}
                          </span>
                        ) : row.manufacturedAt ? (
                          <span>
                            SX {formatDateTime(row.manufacturedAt, false)}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasQrPayload ? (
                          <span className={`${BADGE_BASE_CLASS} gap-1 bg-primary`}>
                            <QrCode size={11} aria-hidden="true" /> Có sẵn
                          </span>
                        ) : (
                          <span className={`${BADGE_BASE_CLASS} bg-gray-200`}>
                            Đã ẩn
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInstanceId(row.instanceId)}
                            aria-label={`Xem chi tiết thiết bị ${row.serialNumber}`}
                            title="Xem chi tiết thiết bị"
                            className="group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                          >
                            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[84px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[84px] group-focus-visible/btn:opacity-100">
                              Chi tiết
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-xs text-text-muted"
                  >
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center border-2 border-black bg-primary/30 shadow-[2px_2px_0_0_#000]">
                      <Boxes size={22} className="text-black" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-wide text-black">
                      Chưa có thiết bị LED vật lý nào cho mẫu {model.modelName}.
                    </p>
                    <p className="mt-1 text-xs font-medium text-text-muted">
                      Thử thay đổi bộ lọc trạng thái / từ khóa hoặc nhập kho thiết bị (Serial/MAC) mới.
                    </p>
                    {canManageCatalog && model.status !== LedModelItem.status.DEPRECATED && (
                      <button
                        type="button"
                        onClick={onOpenStockIn}
                        className="btn-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                      >
                        <PackagePlus size={14} aria-hidden="true" />
                        Nhập kho thiết bị ngay
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CommissionPagination
        page={meta.page}
        size={meta.size || pageSize}
        totalElements={meta.totalElements}
        totalPages={meta.totalPages}
        onPageChange={(nextPage) => setPage(nextPage)}
        ariaLabel="Phân trang danh sách thiết bị LED"
        disabled={isLoading}
        className="mt-auto shrink-0"
      />

      {/* Detail Modal */}
      {selectedInstanceId !== null && (
        <LedInstanceDetailModal
          instanceId={selectedInstanceId}
          onClose={() => setSelectedInstanceId(null)}
        />
      )}
    </>
  );
}

function LedInstanceDetailModal({
  instanceId,
  onClose,
}: {
  instanceId: number;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<LedInstanceDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setCopied(false);

    fetchLedInstanceDetail(instanceId)
      .then((res) => {
        if (!cancelled) {
          setDetail(res);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDetail(null);
          setErrorMessage(
            formatLedInventoryError(
              error,
              "Không thể tải thông tin chi tiết thiết bị LED.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instanceId, reloadToken]);

  const formattedQr = useMemo(
    () => (detail ? formatQrPayload(detail.qrPayload) : null),
    [detail],
  );

  const handleCopyQr = useCallback(async () => {
    if (!formattedQr) return;
    try {
      await navigator.clipboard.writeText(formattedQr);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [formattedQr]);

  const handlePrintQr = useCallback(() => {
    if (!detail || !formattedQr || typeof document === "undefined") return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      return;
    }

    const modelName = detail.model?.modelName ?? `Model #${detail.model?.modelId ?? ""}`;
    doc.open();
    doc.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Tem QR - ${escapeHtml(detail.serialNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
    .label-card { max-width: 420px; border: 2px solid #000; padding: 18px; box-shadow: 4px 4px 0 #000; }
    h1 { font-size: 16px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    p { font-size: 12px; margin: 4px 0; }
    pre { margin-top: 12px; padding: 10px; background: #f3f4f6; border: 2px solid #000; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="label-card">
    <h1>LUMINTRA FACTORY QR PAYLOAD</h1>
    <p><strong>Model:</strong> ${escapeHtml(modelName)}</p>
    <p><strong>Serial Number:</strong> ${escapeHtml(detail.serialNumber)}</p>
    <p><strong>MAC Address:</strong> ${escapeHtml(detail.macAddress)}</p>
    <pre>${escapeHtml(formattedQr)}</pre>
  </div>
</body>
</html>`);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  }, [detail, formattedQr]);

  if (!mounted) return null;

  const statusBadge = detail
    ? (INSTANCE_STATUS_CONFIG[detail.status] ?? {
        label: detail.status,
        className: "bg-gray-200 text-black",
      })
    : null;

  const warrantyBadge = detail
    ? (WARRANTY_STATUS_CONFIG[detail.warrantyStatus] ?? {
        label: detail.warrantyStatus,
        className: "bg-gray-200 text-black",
      })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] h-screen w-screen font-sans text-text-main">
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="led-instance-detail-title"
        className="fixed left-1/2 top-1/2 z-[110] flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-primary/20 px-6 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              CHI TIẾT THIẾT BỊ PHẦN CỨNG LED
            </span>
            <h2
              id="led-instance-detail-title"
              className="mt-1.5 font-mono text-lg font-black uppercase tracking-tight text-black sm:text-xl"
            >
              {detail ? detail.serialNumber : `Thiết bị #${instanceId}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết thiết bị"
            className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-xs font-bold text-text-muted">
              <Loader2 size={24} className="mb-2 animate-spin text-primary-ink" aria-hidden="true" />
              <span>Đang tải thông tin thiết bị #{instanceId}...</span>
            </div>
          ) : errorMessage ? (
            <div className="my-4 border-2 border-black bg-[#fee2e2] p-5 text-center shadow-[4px_4px_0_0_#000]">
              <ShieldAlert size={24} className="mx-auto mb-2 text-red-700" aria-hidden="true" />
              <p className="text-xs font-black text-black">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setReloadToken((prev) => prev + 1)}
                className="btn-secondary mt-3 px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                Thử lại
              </button>
            </div>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              {/* 1. Hardware info */}
              <section className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-gray-200 pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    1. Thông tin phần cứng
                  </h3>
                  {statusBadge && (
                    <span className={`${BADGE_BASE_CLASS} ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <InfoField label="Instance ID" value={`#${detail.instanceId}`} mono />
                  <InfoField label="Serial Number" value={detail.serialNumber} mono />
                  <InfoField label="Địa chỉ MAC" value={detail.macAddress} mono />
                  <InfoField
                    label="Firmware hiện tại"
                    value={
                      detail.currentFirmwareId != null
                        ? `#${detail.currentFirmwareId}`
                        : "Chưa báo cáo"
                    }
                  />
                  <InfoField
                    label="Tên thiết bị khách đặt"
                    value={detail.deviceName || "Chưa đặt tên"}
                  />
                  <InfoField
                    label="Ngày tạo bản ghi"
                    value={formatDateTime(detail.createdAt)}
                  />
                  <InfoField
                    label="Cập nhật gần nhất"
                    value={formatDateTime(detail.updatedAt)}
                  />
                </div>
              </section>

              {/* 2. Model & specs */}
              <section className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                <h3 className="mb-3 border-b-2 border-dashed border-gray-200 pb-2.5 text-xs font-black uppercase tracking-wider text-black">
                  2. Thông tin Model &amp; Thông số kỹ thuật
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <InfoField
                    label="Tên Model LED"
                    value={
                      detail.model.modelName ?? `Model #${detail.model.modelId}`
                    }
                  />
                  <InfoField
                    label="Mã Model / Product"
                    value={`Model #${detail.model.modelId} · ${
                      detail.model.productId != null
                        ? `SP #${detail.model.productId}`
                        : "Chưa gắn cửa hàng"
                    }`}
                  />
                  <InfoField
                    label="Trạng thái Model"
                    value={
                      detail.model.status
                        ? (MODEL_STATUS_LABEL[detail.model.status] ??
                          detail.model.status)
                        : "—"
                    }
                  />
                  <InfoField
                    label="Kích thước ma trận"
                    value={
                      detail.model.spec?.widthPx && detail.model.spec?.heightPx
                        ? `${detail.model.spec.widthPx} × ${detail.model.spec.heightPx} px`
                        : "—"
                    }
                    mono
                  />
                </div>

                {detail.model.spec?.attributes &&
                  detail.model.spec.attributes.length > 0 && (
                    <div className="mt-3 border-t-2 border-dashed border-gray-200 pt-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-text-muted">
                        Thông số chi tiết
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {detail.model.spec.attributes.map((attr, idx) => (
                          <div
                            key={`${attr.label}-${idx}`}
                            className="flex items-center justify-between gap-2 border-2 border-black bg-gray-50 px-3 py-1.5 text-xs"
                          >
                            <span className="font-bold text-text-muted">{attr.label}</span>
                            <span className="font-black text-black">
                              {attr.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </section>

              {/* 3. Warranty & timestamps */}
              <section className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-gray-200 pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    3. Bảo hành &amp; Mốc thời gian
                  </h3>
                  {warrantyBadge && (
                    <span className={`${BADGE_BASE_CLASS} ${warrantyBadge.className}`}>
                      {warrantyBadge.label}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoField
                    label="Ngày sản xuất"
                    value={formatDateTime(detail.manufacturedAt)}
                  />
                  <InfoField
                    label="Ngày kích hoạt (Bind)"
                    value={formatDateTime(detail.boundAt)}
                  />
                  <InfoField
                    label="Hết hạn bảo hành"
                    value={formatDateTime(detail.warrantyExpiresAt)}
                  />
                </div>
              </section>

              {/* 4. Fulfillment & owner */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                  <h3 className="mb-2.5 border-b-2 border-dashed border-gray-200 pb-2 text-xs font-black uppercase tracking-wider text-black">
                    4. Thông tin đơn hàng (Fulfillment)
                  </h3>
                  {detail.fulfillment ? (
                    <div className="space-y-2 text-xs">
                      <InfoField
                        label="Mã đơn hàng"
                        value={`#${detail.fulfillment.orderId}`}
                        mono
                      />
                      <InfoField
                        label="Mã dòng sản phẩm (Order Item)"
                        value={`#${detail.fulfillment.orderItemId}`}
                        mono
                      />
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-text-muted">
                      Thiết bị chưa được gán vào đơn hàng nào.
                    </p>
                  )}
                </div>

                <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                  <h3 className="mb-2.5 border-b-2 border-dashed border-gray-200 pb-2 text-xs font-black uppercase tracking-wider text-black">
                    5. Chủ sở hữu (Owner)
                  </h3>
                  {detail.owner ? (
                    <div className="space-y-2 text-xs">
                      <InfoField
                        label="Khách hàng"
                        value={`${detail.owner.fullName || "Không rõ"} (#${detail.owner.customerId})`}
                      />
                      <InfoField
                        label="Số điện thoại"
                        value={detail.owner.phone || "—"}
                      />
                      <InfoField
                        label="Email"
                        value={detail.owner.email || "—"}
                      />
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-text-muted">
                      Chưa có chủ sở hữu (thiết bị chưa được khách hàng kích hoạt).
                    </p>
                  )}
                </div>
              </section>

              {/* 5. Factory QR payload */}
              <section className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-gray-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-primary-ink" aria-hidden="true" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-black">
                      6. Mã QR Nhà máy (Factory QR Payload)
                    </h3>
                  </div>

                  {formattedQr && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyQr}
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                      >
                        {copied ? (
                          <>
                            <Check size={13} className="text-primary-ink" aria-hidden="true" /> Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" /> Sao chép QR Payload
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintQr}
                        className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                      >
                        <Printer size={13} aria-hidden="true" /> In tem QR
                      </button>
                    </div>
                  )}
                </div>

                {formattedQr ? (
                  <pre className="max-h-56 overflow-x-auto border-2 border-black bg-gray-50 p-3 font-mono text-xs font-bold text-black">
                    {formattedQr}
                  </pre>
                ) : (
                  <div className="border-2 border-black bg-[#fef08a] px-4 py-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
                    Mã QR nhà máy đã được ẩn tự động để bảo mật vì thiết bị đang ở
                    trạng thái{" "}
                    <strong className="font-black">
                      {INSTANCE_STATUS_CONFIG[detail.status]?.label ??
                        detail.status}
                    </strong>{" "}
                    ({detail.status}).
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t-2 border-dashed border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 text-xs font-black text-black break-words ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LinkedProductDetailModal({
  productId,
  onClose,
}: {
  productId: number;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ManagedStoreProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchManagedStoreProducts({ productType: "LED", size: 200 })
      .then((res) => {
        if (!active) return;
        const found = res.items.find((item) => item.productId === productId) ?? null;
        if (!found) {
          setError(`Không tìm thấy sản phẩm #${productId} trong cửa hàng.`);
        } else {
          setProduct(found);
        }
      })
      .catch(() => {
        if (active) setError("Không thể tải chi tiết sản phẩm liên kết.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const canOpenStorefront =
    product?.status === "PUBLISHED" || product?.status === "ARCHIVED";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="linked-product-detail-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans text-text-main"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-primary/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
              <Store size={18} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="linked-product-detail-title"
                className="text-base font-black uppercase tracking-tight text-black"
              >
                Chi tiết sản phẩm liên kết #{productId}
              </h2>
              <p className="font-mono text-xs font-bold text-primary-ink">
                /products/{productId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-text-muted">
              <Loader2 size={18} className="animate-spin text-primary-ink" aria-hidden="true" />
              Đang tải chi tiết sản phẩm...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="border-2 border-black bg-[#fee2e2] p-4 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
            >
              {error}
            </div>
          ) : product ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-28 shrink-0 overflow-hidden border-2 border-black bg-gray-50 shadow-[2px_2px_0_0_#000]">
                  {product.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.thumbnailUrl}
                      alt={product.productName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-bold text-text-muted">
                      Chưa có ảnh
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black uppercase text-black sm:text-lg">
                      {product.productName}
                    </h3>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="text-base font-black text-primary-ink tabular-nums">
                    {Number(product.basePrice ?? 0).toLocaleString("vi-VN")} VNĐ
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-text-muted">
                    {product.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>
              </div>

              {product.tags && product.tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                    Thẻ phân loại
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span
                        key={tag.tagId}
                        className={`${BADGE_BASE_CLASS} bg-primary/30`}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.galleryUrls && product.galleryUrls.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                    Ảnh bổ sung ({product.galleryUrls.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.galleryUrls.map((url, idx) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={`${url}-${idx}`}
                        src={url}
                        alt={`${product.productName} ${idx + 1}`}
                        className="h-16 w-16 border-2 border-black bg-gray-50 object-cover shadow-[2px_2px_0_0_#000]"
                      />
                    ))}
                  </div>
                </div>
              )}

              {!canOpenStorefront && (
                <p className="border-2 border-black bg-[#fef08a] px-3.5 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
                  Sản phẩm này hiện đang ở trạng thái{" "}
                  <strong className="font-black">
                    {product.status === "UNPUBLISHED" ? "Chờ duyệt" : "Đã xóa"}
                  </strong>{" "}
                  nên chưa mở trên trang công khai <code>/products/{productId}</code>.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 bg-white px-6 py-4">
          <Link
            href="/staff/pricing"
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Quản lý tại Cửa hàng
          </Link>
          {canOpenStorefront && (
            <Link
              href={`/products/${productId}`}
              target="_blank"
              className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              Xem trang Store
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
