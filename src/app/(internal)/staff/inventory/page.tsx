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
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Edit3,
  ExternalLink,
  Eye,
  List,
  Loader2,
  Lock,
  PackageCheck,
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

type InstanceStatusValue =
  | LedInstanceItem.status
  | LedInstanceDetailResponse.status
  | LedInstanceFilterRequest.status;

const INSTANCE_STATUS_CONFIG: Record<
  InstanceStatusValue,
  { label: string; className: string }
> = {
  IN_STOCK: {
    label: "Trong kho",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  IN_TRANSIT: {
    label: "Đang vận chuyển",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  BOUND: {
    label: "Đã kích hoạt",
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },
  RETURNED: {
    label: "Đã hoàn trả",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  DECOMMISSIONED: {
    label: "Ngừng lưu hành",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const WARRANTY_STATUS_CONFIG: Record<
  LedInstanceDetailResponse.warrantyStatus,
  { label: string; className: string }
> = {
  NOT_ACTIVATED: {
    label: "Chưa kích hoạt",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  },
  ACTIVE: {
    label: "Đang trong hạn bảo hành",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  EXPIRED: {
    label: "Đã hết hạn bảo hành",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const MODEL_STATUS_LABEL: Record<ModelInfo.status, string> = {
  ACTIVE: "Đang kinh doanh",
  OUT_OF_STOCK: "Hết hàng",
  DEPRECATED: "Ngừng kinh doanh",
};

const LED_MODEL_STATUS_STYLE: Record<LedModelItem.status, string> = {
  ACTIVE: "border-green-200 bg-green-50 text-green-700",
  OUT_OF_STOCK: "border-amber-200 bg-amber-50 text-amber-800",
  DEPRECATED: "border-gray-300 bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 10;

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

  // Unified Master -> Detail state: null = LED models list, non-null = instances of that LED model
  const [selectedModel, setSelectedModel] = useState<ManagedLedModelItem | null>(null);
  const [instanceReloadKey, setInstanceReloadKey] = useState(0);

  // DEV-01 Paginated LED Models state
  const [models, setModels] = useState<ManagedLedModelItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Summary metrics across full catalog (up to 100 models)
  const [summaryStats, setSummaryStats] = useState({
    totalStock: 0,
    totalModels: 0,
    lowStockCount: 0,
    activeCount: 0,
    linkedProductCount: 0,
  });

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

  // Load summary metrics
  useEffect(() => {
    let cancelled = false;
    fetchLedModelsPage({ page: 0, size: 100 })
      .then((res) => {
        if (cancelled) return;
        const list = res.items;
        const nonDeprecated = list.filter((m) => m.status !== LedModelItem.status.DEPRECATED);
        setSummaryStats({
          totalStock: nonDeprecated.reduce((sum, m) => sum + (m.stockQuantity ?? 0), 0),
          totalModels: res.meta.totalElements,
          lowStockCount: nonDeprecated.filter((m) => m.isLowStock).length,
          activeCount: list.filter((m) => m.status === LedModelItem.status.ACTIVE).length,
          linkedProductCount: list.filter((m) => m.productId != null).length,
        });
        setSelectedModel((prev) => {
          if (!prev) return null;
          return list.find((m) => m.modelId === prev.modelId) ?? prev;
        });
      })
      .catch(() => {
        // Summary stays last known values
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Load paginated models (DEV-01)
  useEffect(() => {
    let cancelled = false;
    setIsLoadingModels(true);
    setModelsError(null);

    fetchLedModelsPage({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      lowStockOnly: lowStockOnly ? true : undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setModels(res.items);
        setMeta(res.meta);
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
  }, [page, debouncedKeyword, statusFilter, lowStockOnly, reloadKey]);

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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Quản lý kho LED</h1>
          <p className="mt-1 text-sm font-medium text-text-muted">
            Quản lý danh mục mẫu LED phần cứng, tồn kho, thông số kỹ thuật và theo dõi từng thiết bị trong kho.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={triggerReload}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3.5 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-gray-50"
          >
            <RefreshCw size={15} className={isLoadingModels ? "animate-spin" : ""} />
            Làm mới
          </button>

          {canManageCatalog && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-primary px-4 py-2.5 text-sm font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <Plus size={16} />
              Thêm mẫu LED
            </button>
          )}
        </div>
      </header>

      {!canManageCatalog && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          <Lock size={15} className="shrink-0" />
          Chế độ chỉ xem: Chỉ Quản lý hoặc Quản trị viên mới có quyền thêm, cập nhật hoặc ngừng kinh doanh mẫu LED.
        </p>
      )}

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
            notice.type === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          <span className="flex items-center gap-2">
            {notice.type === "error" ? (
              <AlertTriangle size={16} className="shrink-0" />
            ) : (
              <CheckCircle size={16} className="shrink-0" />
            )}
            {notice.message}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
            className="rounded p-1 hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={<Boxes size={19} />}
          label="Tổng tồn kho khả dụng"
          value={summaryStats.totalStock}
          helper="Không tính mẫu đã ngừng kinh doanh"
        />
        <SummaryCard
          icon={<List size={19} />}
          label="Tổng mẫu LED"
          value={summaryStats.totalModels}
          helper={`${summaryStats.linkedProductCount} mẫu đã gắn sản phẩm Cửa hàng`}
        />
        <SummaryCard
          icon={<AlertTriangle size={19} />}
          label="Mẫu LED sắp hết hàng"
          value={summaryStats.lowStockCount}
          helper="Tồn kho dưới 5 chiếc"
          tone="warning"
        />
        <SummaryCard
          icon={<PackageCheck size={19} />}
          label="Đang kinh doanh"
          value={summaryStats.activeCount}
          helper="Sẵn sàng cấp phát & bày bán"
        />
      </div>

      <div className="w-full">
        <section className="neo-box-no-hover overflow-hidden bg-white">
          {selectedModel ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary-light bg-[#f9fdfa] px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedModel(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-primary/20"
                  >
                    <ArrowLeft size={14} />
                    Danh sách mẫu LED
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-gray-900">
                        {selectedModel.modelName}
                      </h2>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-gray-700">
                        #{selectedModel.modelId}
                      </span>
                      {selectedModel.spec?.widthPx && selectedModel.spec?.heightPx && (
                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-gray-700">
                          {selectedModel.spec.widthPx}×{selectedModel.spec.heightPx} px
                        </span>
                      )}
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          LED_MODEL_STATUS_STYLE[selectedModel.status]
                        }`}
                      >
                        {MODEL_STATUS_LABEL[selectedModel.status] ?? selectedModel.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Tồn kho khả dụng:{" "}
                      <strong className="text-gray-900">{selectedModel.stockQuantity} thiết bị</strong>{" "}
                      · Xem toàn bộ thiết bị (Serial/MAC) thuộc mẫu LED này và nhập kho kèm mã thiết bị.
                    </p>
                  </div>
                </div>

                {canManageCatalog && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedModel.status !== LedModelItem.status.DEPRECATED && (
                      <button
                        type="button"
                        onClick={() => setStockInModel(selectedModel)}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-primary px-3.5 py-2 text-xs font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-primary/90"
                      >
                        <PackagePlus size={15} />
                        Nhập kho thiết bị
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingModel(selectedModel)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50"
                    >
                      <Edit3 size={13} />
                      Cập nhật mẫu
                    </button>
                  </div>
                )}
              </div>

              <LedInstancesSection
                model={selectedModel}
                externalReloadKey={instanceReloadKey}
                canManageCatalog={canManageCatalog}
                onOpenStockIn={() => setStockInModel(selectedModel)}
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-primary-light px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-primary-dark">
                    Danh sách mẫu LED trong kho
                  </h2>
                  <p className="text-xs text-text-muted">
                    Bấm vào một mẫu LED để xem danh sách thiết bị (Serial/MAC) và nhập kho thiết bị mới.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_210px_auto_auto]">
                <label className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-sm">
                  <Search size={15} className="text-text-muted" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full outline-none"
                    placeholder="Tìm theo tên mẫu LED..."
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as LedModelItem.status | "ALL");
                    setPage(0);
                  }}
                  className="border-2 border-gray-200 px-3 py-2 text-sm font-medium"
                >
                  <option value="ALL">Trạng thái: Tất cả</option>
                  <option value={LedModelItem.status.ACTIVE}>Đang kinh doanh</option>
                  <option value={LedModelItem.status.OUT_OF_STOCK}>Hết hàng</option>
                  <option value={LedModelItem.status.DEPRECATED}>Ngừng kinh doanh</option>
                </select>

                <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => {
                      setLowStockOnly(e.target.checked);
                      setPage(0);
                    }}
                    className="h-3.5 w-3.5 accent-[#439660]"
                  />
                  Chỉ mẫu sắp hết (&lt; 5)
                </label>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-1 border-2 border-black px-3 py-2 text-xs font-bold hover:bg-primary/20"
                >
                  <RotateCcw size={14} /> Đặt lại
                </button>
              </div>

              {modelsError && (
                <div className="m-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {modelsError}
                  </span>
                  <button
                    type="button"
                    onClick={triggerReload}
                    className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[27%]" />
                  </colgroup>
                  <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-700">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                        Mẫu LED &amp; Thông số
                      </th>
                      <th className="px-3 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                        Kích thước
                      </th>
                      <th className="px-2 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                        Tồn kho
                      </th>
                      <th className="px-3 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                        Sản phẩm liên kết
                      </th>
                      <th className="px-2 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingModels ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <Loader2 size={18} className="animate-spin text-primary-dark" />
                            Đang tải danh sách mẫu LED từ máy chủ...
                          </span>
                        </td>
                      </tr>
                    ) : models.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center font-semibold text-text-muted"
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
                            className={`cursor-pointer transition-colors hover:bg-green-50/60 ${
                              isDeprecated ? "bg-gray-50/60 opacity-80" : ""
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gray-200 bg-primary/15 text-primary-dark">
                                  <Cpu size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="truncate font-bold text-gray-900 text-sm leading-snug">
                                      {item.modelName}
                                    </p>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-700">
                                      #{item.modelId}
                                    </span>
                                  </div>
                                  {specPreview ? (
                                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                                      {specPreview}
                                    </p>
                                  ) : (
                                    <p className="mt-0.5 text-[11px] text-text-muted">
                                      Chưa khai báo thông số phụ
                                    </p>
                                  )}
                                  <p className="mt-1 text-[11px] font-bold text-primary-dark">
                                    Bấm để xem thiết bị (Serial) →
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block whitespace-nowrap rounded border border-gray-200 bg-gray-100/90 px-2.5 py-1 font-mono text-xs font-bold text-gray-800">
                                {width && height ? `${width}×${height} px` : "—"}
                              </span>
                            </td>

                            <td className="px-2 py-3.5 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className={`text-sm font-black ${
                                    item.stockQuantity === 0
                                      ? "text-red-600"
                                      : item.isLowStock
                                        ? "text-amber-700"
                                        : "text-gray-900"
                                  }`}
                                >
                                  {item.stockQuantity}
                                </span>
                                {item.isLowStock && !isDeprecated && (
                                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    Sắp hết
                                  </span>
                                )}
                              </div>
                            </td>

                            <td
                              className="px-3 py-3.5 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.productId != null ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingProductId(item.productId!)}
                                  title={`Xem chi tiết sản phẩm #${item.productId}`}
                                  aria-label={`Xem chi tiết sản phẩm #${item.productId}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
                                >
                                  <Eye size={15} />
                                </button>
                              ) : (
                                <span className="text-xs font-medium text-gray-400">—</span>
                              )}
                            </td>

                            <td className="px-2 py-3.5 text-center">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                  LED_MODEL_STATUS_STYLE[item.status]
                                }`}
                              >
                                {MODEL_STATUS_LABEL[item.status] ?? item.status}
                              </span>
                            </td>

                            <td
                              className="px-4 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {canManageCatalog && !isDeprecated && (
                                  <button
                                    type="button"
                                    onClick={() => setStockInModel(item)}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100"
                                    title="Nhập kho thiết bị kèm Serial/MAC"
                                  >
                                    <PackagePlus size={13} />
                                    Nhập kho
                                  </button>
                                )}
                                {canManageCatalog && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingModel(item)}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold shadow-xs hover:bg-primary/20"
                                    title="Cập nhật tên & thông số kỹ thuật"
                                  >
                                    <Edit3 size={13} />
                                    Cập nhật
                                  </button>
                                )}
                                {canManageCatalog && !isDeprecated && (
                                  <button
                                    type="button"
                                    onClick={() => setDeprecatingModel(item)}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 shadow-xs hover:bg-red-50"
                                    title="Ngừng kinh doanh mẫu LED này"
                                  >
                                    <ShieldOff size={13} />
                                    Ngừng KD
                                  </button>
                                )}
                                {!canManageCatalog && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedModel(item)}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-primary/20"
                                  >
                                    <Boxes size={13} />
                                    Thiết bị
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

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs text-text-muted">
                  Trang {meta.page + 1} / {Math.max(1, meta.totalPages)} · Tổng{" "}
                  <strong className="text-gray-800">{meta.totalElements}</strong> mẫu LED
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    disabled={!meta.hasPrevious || isLoadingModels}
                    className="border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={!meta.hasNext || isLoadingModels}
                    className="border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
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
  externalReloadKey,
  canManageCatalog,
  onOpenStockIn,
}: {
  model: ManagedLedModelItem;
  externalReloadKey: number;
  canManageCatalog: boolean;
  onOpenStockIn: () => void;
}) {
  const [instances, setInstances] = useState<LedInstanceItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
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
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    fetchLedInstances({
      page,
      size: PAGE_SIZE,
      modelId: model.modelId,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    })
      .then((result) => {
        if (cancelled) return;
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
  }, [page, model.modelId, statusFilter, debouncedSearch, reloadKey, externalReloadKey]);

  const handleReset = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPage(0);
  };

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  const rangeStart =
    meta.totalElements === 0 ? 0 : meta.page * meta.size + 1;
  const rangeEnd = Math.min(
    (meta.page + 1) * meta.size,
    meta.totalElements,
  );

  return (
    <>
      {/* Filter bar */}
      <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_210px_auto_auto]">
        <label className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-sm">
          <Search size={15} className="shrink-0 text-text-muted" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full outline-none"
            placeholder="Tìm Serial Number hoặc địa chỉ MAC..."
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as LedInstanceFilterRequest.status | "",
            );
            setPage(0);
          }}
          aria-label="Lọc theo trạng thái thiết bị"
          className="border-2 border-gray-200 px-3 py-2 text-sm"
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
          className="inline-flex items-center justify-center gap-1 border-2 border-black px-3 py-2 text-xs font-bold hover:bg-primary/20"
        >
          <RotateCcw size={14} /> Đặt lại
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1 border-2 border-black bg-white px-3 py-2 text-xs font-bold hover:bg-primary/20 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          role="alert"
          className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={17} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] table-fixed text-sm">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[20%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[5.5%]" />
            <col className="w-[5.5%]" />
          </colgroup>
          <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-700">
            <tr>
              <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                Serial & ID
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                Model LED
              </th>
              <th className="px-3 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                Địa chỉ MAC
              </th>
              <th className="px-3 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                Đơn hàng / Chủ sở hữu
              </th>
              <th className="px-3 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">
                Bảo hành / Ngày SX
              </th>
              <th className="px-2 py-3.5 text-center text-[11px] font-black uppercase tracking-wider">
                QR Nhà máy
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider">
                Chi tiết
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted">
                    <Loader2 size={18} className="animate-spin text-primary-dark" />
                    <span>Đang tải danh sách thiết bị LED...</span>
                  </div>
                </td>
              </tr>
            ) : instances.length > 0 ? (
              instances.map((row) => {
                const statusBadge =
                  INSTANCE_STATUS_CONFIG[row.status] ?? {
                    label: row.status,
                    className: "border-gray-200 bg-gray-100 text-gray-700",
                  };
                const hasQrPayload = Boolean(row.qrPayload);

                return (
                  <tr
                    key={row.instanceId}
                    className="border-b border-gray-100 transition-colors hover:bg-green-50/40"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">
                        {row.serialNumber}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        #{row.instanceId}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">
                        {row.modelName ?? `Model #${row.modelId}`}
                      </p>
                      {row.deviceName && (
                        <p className="text-[11px] text-text-muted">
                          Tên hiển thị: {row.deviceName}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3.5 font-mono text-xs font-semibold text-gray-700">
                      {row.macAddress}
                    </td>

                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs">
                      {row.fulfillment || row.owner ? (
                        <div className="space-y-0.5">
                          {row.fulfillment && (
                            <p className="font-semibold text-gray-900">
                              Đơn #{row.fulfillment.orderId}
                            </p>
                          )}
                          {row.owner && (
                            <p className="text-text-muted">
                              {row.owner.fullName ||
                                row.owner.email ||
                                `KH #${row.owner.customerId}`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-xs text-gray-700">
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

                    <td className="px-2 py-3.5 text-center">
                      {hasQrPayload ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          <QrCode size={12} /> Có sẵn
                        </span>
                      ) : (
                        <span className="inline-flex whitespace-nowrap rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                          Đã ẩn
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInstanceId(row.instanceId)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold shadow-2xs hover:border-black hover:bg-primary/20"
                      >
                        <Eye size={13} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-text-muted"
                >
                  <Boxes size={32} className="mx-auto mb-2 text-primary-dark" />
                  <p className="font-semibold text-gray-800">
                    Chưa có thiết bị LED vật lý nào cho mẫu {model.modelName}.
                  </p>
                  <p className="mt-1 text-xs">
                    Thử thay đổi bộ lọc trạng thái / từ khóa hoặc nhập kho thiết bị (Serial/MAC) mới.
                  </p>
                  {canManageCatalog && model.status !== LedModelItem.status.DEPRECATED && (
                    <button
                      type="button"
                      onClick={onOpenStockIn}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-primary px-3.5 py-2 text-xs font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-primary/90"
                    >
                      <PackagePlus size={14} />
                      Nhập kho thiết bị ngay
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-xs text-text-muted">
          Hiển thị {rangeStart} - {rangeEnd} / {meta.totalElements} thiết bị
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={isLoading || !meta.hasPrevious}
            className="inline-flex items-center gap-1 border border-gray-300 px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Trang trước"
          >
            <ChevronLeft size={15} /> Trước
          </button>

          <span className="text-xs font-bold text-gray-700">
            Trang {meta.page + 1} / {Math.max(1, meta.totalPages)}
          </span>

          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={isLoading || !meta.hasNext}
            className="inline-flex items-center gap-1 border border-gray-300 px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Trang sau"
          >
            Sau <ChevronRight size={15} />
          </button>
        </div>
      </div>

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
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    .label-card { max-width: 420px; border: 2px solid #111; border-radius: 10px; padding: 18px; }
    h1 { font-size: 16px; margin: 0 0 8px; }
    p { font-size: 12px; margin: 4px 0; }
    pre { margin-top: 12px; padding: 10px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
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
        className: "border-gray-200 bg-gray-100 text-gray-700",
      })
    : null;

  const warrantyBadge = detail
    ? (WARRANTY_STATUS_CONFIG[detail.warrantyStatus] ?? {
        label: detail.warrantyStatus,
        className: "border-gray-200 bg-gray-100 text-gray-700",
      })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] h-screen w-screen">
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="led-instance-detail-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">
              Chi tiết thiết bị phần cứng LED
            </p>
            <h2
              id="led-instance-detail-title"
              className="mt-1 text-xl font-black text-gray-900"
            >
              {detail ? detail.serialNumber : `Thiết bị #${instanceId}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết thiết bị"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-text-muted">
            <Loader2 size={24} className="mb-2 animate-spin text-primary-dark" />
            <span>Đang tải thông tin thiết bị #{instanceId}...</span>
          </div>
        ) : errorMessage ? (
          <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <ShieldAlert size={24} className="mx-auto mb-2 text-red-600" />
            <p className="text-sm font-bold text-red-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setReloadToken((prev) => prev + 1)}
              className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
            >
              Thử lại
            </button>
          </div>
        ) : detail ? (
          <div className="mt-5 space-y-5 text-sm">
            {/* 1. Hardware info */}
            <section className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wide text-gray-700">
                  1. Thông tin phần cứng
                </h3>
                {statusBadge && (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <InfoField label="Instance ID" value={`#${detail.instanceId}`} />
                <InfoField label="Serial Number" value={detail.serialNumber} />
                <InfoField label="Địa chỉ MAC" value={detail.macAddress} />
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
            <section className="rounded-xl border border-gray-200 p-4">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-gray-700">
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
                />
              </div>

              {detail.model.spec?.attributes &&
                detail.model.spec.attributes.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-bold text-text-muted">
                      Thông số chi tiết
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {detail.model.spec.attributes.map((attr, idx) => (
                        <div
                          key={`${attr.label}-${idx}`}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs"
                        >
                          <span className="text-text-muted">{attr.label}</span>
                          <span className="font-bold text-gray-900">
                            {attr.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </section>

            {/* 3. Warranty & timestamps */}
            <section className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wide text-gray-700">
                  3. Bảo hành &amp; Mốc thời gian
                </h3>
                {warrantyBadge && (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${warrantyBadge.className}`}
                  >
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
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-700">
                  4. Thông tin đơn hàng (Fulfillment)
                </h3>
                {detail.fulfillment ? (
                  <div className="space-y-2 text-xs">
                    <InfoField
                      label="Mã đơn hàng"
                      value={`#${detail.fulfillment.orderId}`}
                    />
                    <InfoField
                      label="Mã dòng sản phẩm (Order Item)"
                      value={`#${detail.fulfillment.orderItemId}`}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    Thiết bị chưa được gán vào đơn hàng nào.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-700">
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
                  <p className="text-xs text-text-muted">
                    Chưa có chủ sở hữu (thiết bị chưa được khách hàng kích hoạt).
                  </p>
                )}
              </div>
            </section>

            {/* 5. Factory QR payload */}
            <section className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-primary-dark" />
                  <h3 className="text-xs font-black uppercase tracking-wide text-gray-700">
                    6. Mã QR Nhà máy (Factory QR Payload)
                  </h3>
                </div>

                {formattedQr && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyQr}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-gray-50"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-600" /> Đã sao
                          chép
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Sao chép QR Payload
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintQr}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black bg-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/80"
                    >
                      <Printer size={14} /> In tem QR
                    </button>
                  </div>
                )}
              </div>

              {formattedQr ? (
                <pre className="max-h-56 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
                  {formattedQr}
                </pre>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Mã QR nhà máy đã được ẩn tự động để bảo mật vì thiết bị đang ở
                  trạng thái{" "}
                  <strong>
                    {INSTANCE_STATUS_CONFIG[detail.status]?.label ??
                      detail.status}
                  </strong>{" "}
                  ({detail.status}).
                </div>
              )}
            </section>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-gray-900 break-words">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="neo-box-no-hover bg-white p-4">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center border-2 border-black ${
          tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-primary/20"
        }`}
      >
        {icon}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p
        className={`mt-1 text-[10px] font-bold ${
          tone === "warning" ? "text-amber-700" : "text-text-muted"
        }`}
      >
        {helper}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-[#173b28] bg-white shadow-[6px_6px_0_#173b28]">
        <div className="flex items-center justify-between border-b border-[#e3efe6] bg-[#f4fbf6] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#3f9660] bg-white text-[#173b28]">
              <Store size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-[#173b28]">
                Chi tiết sản phẩm liên kết #{productId}
              </h2>
              <p className="font-mono text-xs font-semibold text-[#3f7553]">
                /products/{productId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-text-muted hover:bg-emerald-100/70 hover:text-[#173b28]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-text-muted">
              <Loader2 size={18} className="animate-spin text-primary-dark" />
              Đang tải chi tiết sản phẩm...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : product ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[#d8e6dc] bg-[#f6fbf7]">
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
                    <h3 className="text-lg font-black text-[#173b28]">
                      {product.productName}
                    </h3>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="text-base font-black text-[#155e59]">
                    {Number(product.basePrice ?? 0).toLocaleString("vi-VN")} VNĐ
                  </p>
                  <p className="text-xs leading-relaxed text-text-muted">
                    {product.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>
              </div>

              {product.tags && product.tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase text-text-muted">
                    Thẻ phân loại
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span
                        key={tag.tagId}
                        className="rounded-full border border-[#cfe0d4] bg-[#f4fbf6] px-2.5 py-0.5 text-xs font-bold text-[#1f432b]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.galleryUrls && product.galleryUrls.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase text-text-muted">
                    Ảnh bổ sung ({product.galleryUrls.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.galleryUrls.map((url, idx) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={`${url}-${idx}`}
                        src={url}
                        alt={`${product.productName} ${idx + 1}`}
                        className="h-16 w-16 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {!canOpenStorefront && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Sản phẩm này hiện đang ở trạng thái{" "}
                  <strong>{product.status === "UNPUBLISHED" ? "Chờ duyệt" : "Đã xóa"}</strong>{" "}
                  nên chưa mở trên trang công khai <code>/products/{productId}</code>.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e3efe6] bg-[#f9fcfa] px-5 py-3.5">
          <Link
            href="/staff/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3.5 py-2 text-xs font-bold text-[#173b28] hover:bg-[#eef8f0]"
          >
            Quản lý tại Cửa hàng
          </Link>
          {canOpenStorefront && (
            <Link
              href={`/products/${productId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#439660] px-3.5 py-2 text-xs font-black text-white hover:bg-[#387e51]"
            >
              Xem trang Store
              <ExternalLink size={13} />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
