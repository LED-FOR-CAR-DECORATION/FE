"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  FileSpreadsheet,
  List,
  Loader2,
  PackageCheck,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getAvailableStock,
  getInventoryStatus,
  INVENTORY_IMPORTS,
  LED_INVENTORY,
  type InventoryImportRecord,
  type InventoryStatus,
  type LedInventoryItem,
} from "@/features/product/inventory";
import { useOrders } from "@/features/order/context/OrderContext";
import {
  fetchLedInstanceDetail,
  fetchLedInstances,
  fetchManagedLedModels,
  formatLedInventoryError,
  LedInstanceDetailResponse,
  LedInstanceFilterRequest,
  LedInstanceItem,
  ModelInfo,
  type LedModelItem,
  type PaginationMeta,
} from "@/lib/api/ledInstances";

const STATUS_LABEL: Record<InventoryStatus, string> = {
  "In stock": "Còn hàng",
  "Low stock": "Sắp hết hàng",
  "Out of stock": "Hết hàng",
};

const STATUS_CLASS: Record<InventoryStatus, string> = {
  "In stock": "border-green-200 bg-green-50 text-green-700",
  "Low stock": "border-amber-200 bg-amber-50 text-amber-700",
  "Out of stock": "border-red-200 bg-red-50 text-red-700",
};

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
  DEPRECATED: "Ngừng sản xuất",
};

type SortOption = "name" | "stock" | "available";
const PAGE_SIZE = 10;
const INVENTORY_STORAGE_KEY = "mirage_led_inventory_v1";
const INVENTORY_IMPORTS_STORAGE_KEY = "mirage_led_inventory_imports_v1";

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
  const [activeTab, setActiveTab] = useState<"models" | "instances">("models");
  const [inventoryItems, setInventoryItems] =
    useState<LedInventoryItem[]>(LED_INVENTORY);
  const [importRecords, setImportRecords] =
    useState<InventoryImportRecord[]>(INVENTORY_IMPORTS);
  const [storageReady, setStorageReady] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InventoryStatus | "All">("All");
  const [sort, setSort] = useState<SortOption>("name");
  const [page, setPage] = useState(1);
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<LedInventoryItem | null>(
    null,
  );
  const { orders } = useOrders();

  // Load persisted inventory & import history on mount (client-only to avoid hydration mismatch)
  useEffect(() => {
    try {
      const savedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (savedInventory) {
        const parsed = JSON.parse(savedInventory);
        if (Array.isArray(parsed)) {
          setInventoryItems(parsed as LedInventoryItem[]);
        }
      }
      const savedImports = window.localStorage.getItem(
        INVENTORY_IMPORTS_STORAGE_KEY,
      );
      if (savedImports) {
        const parsed = JSON.parse(savedImports);
        if (Array.isArray(parsed)) {
          setImportRecords(parsed as InventoryImportRecord[]);
        }
      }
    } catch {
      // Keep default seed data on storage read error
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(
        INVENTORY_STORAGE_KEY,
        JSON.stringify(inventoryItems),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [inventoryItems, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(
        INVENTORY_IMPORTS_STORAGE_KEY,
        JSON.stringify(importRecords),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [importRecords, storageReady]);

  const filteredItems = useMemo(
    () =>
      inventoryItems
        .filter((item) => {
          const normalized = query.trim().toLowerCase();
          const matchesQuery =
            !normalized ||
            [item.name, item.modelCode, item.description].some((value) =>
              value.toLowerCase().includes(normalized),
            );
          return (
            matchesQuery &&
            (status === "All" || getInventoryStatus(item) === status)
          );
        })
        .sort((first, second) =>
          sort === "name"
            ? first.name.localeCompare(second.name)
            : sort === "stock"
              ? second.stock - first.stock
              : getAvailableStock(second) - getAvailableStock(first),
        ),
    [inventoryItems, query, sort, status],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, sort, status]);

  const totalStock = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
  const lowStockCount = inventoryItems.filter(
    (item) => getInventoryStatus(item) === "Low stock",
  ).length;
  const soldThisMonth = orders
    .filter(
      (order) =>
        order.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7),
    )
    .reduce(
      (sum, order) =>
        sum +
        order.items
          .filter((item) => item.productType === "LED_MODEL")
          .reduce((count, item) => count + item.quantity, 0),
      0,
    );

  const resetFilters = () => {
    setQuery("");
    setStatus("All");
    setSort("name");
    setPage(1);
  };

  const handleImportExistingStock = (
    productId: string,
    quantity: number,
    recordName: string,
  ) => {
    const now = new Date().toISOString();
    let targetName = "";
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        targetName = item.name;
        return {
          ...item,
          stock: item.stock + quantity,
          lastUpdated: now,
        };
      }),
    );
    setImportRecords((prev) => [
      {
        id: `IMP-${Date.now().toString(36).toUpperCase()}`,
        fileName: recordName,
        importedAt: now,
        itemCount: quantity,
        status: "Completed",
      },
      ...prev,
    ]);
    setNotice({
      type: "success",
      message: `Đã nhập thêm ${quantity} sản phẩm vào "${targetName || productId}".`,
    });
  };

  const handleCreateNewModelInWarehouse = (newModel: {
    modelCode: string;
    name: string;
    description: string;
    stock: number;
    minimumStock: number;
    unitPrice: number;
  }) => {
    const now = new Date().toISOString();
    const created: LedInventoryItem = {
      productId: `LED-${Date.now().toString(36).toUpperCase()}`,
      modelCode: newModel.modelCode,
      name: newModel.name,
      description: newModel.description,
      stock: newModel.stock,
      reserved: 0,
      minimumStock: newModel.minimumStock,
      unitPrice: newModel.unitPrice,
      lastUpdated: now,
    };
    setInventoryItems((prev) => [created, ...prev]);
    setImportRecords((prev) => [
      {
        id: `IMP-${Date.now().toString(36).toUpperCase()}`,
        fileName: `Model mới · ${created.modelCode}`,
        importedAt: now,
        itemCount: created.stock,
        status: "Completed",
      },
      ...prev,
    ]);
    setNotice({
      type: "success",
      message: `Đã nhập model LED mới "${created.name}" (${created.modelCode}) với ${created.stock} sản phẩm.`,
    });
  };

  const handleAdjustStock = (
    productId: string,
    nextStock: number,
    nextMinimumStock: number,
  ) => {
    const now = new Date().toISOString();
    const target = inventoryItems.find((item) => item.productId === productId);
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              stock: nextStock,
              minimumStock: nextMinimumStock,
              lastUpdated: now,
            }
          : item,
      ),
    );
    setAdjustingItem(null);
    setNotice({
      type: "success",
      message: `Đã cập nhật tồn kho "${target?.name ?? productId}" thành ${nextStock} sản phẩm (ngưỡng cảnh báo: ${nextMinimumStock}).`,
    });
  };

  const handleDeleteModel = (item: LedInventoryItem) => {
    if (item.reserved > 0) {
      setNotice({
        type: "error",
        message: `Không thể xóa model "${item.name}" vì đang có ${item.reserved} sản phẩm được đặt giữ cho đơn hàng.`,
      });
      return;
    }
    const confirmed = window.confirm(
      `Bạn xác nhận muốn xóa model "${item.name}" (${item.modelCode}) khỏi kho LED?`,
    );
    if (!confirmed) return;

    setInventoryItems((prev) =>
      prev.filter((entry) => entry.productId !== item.productId),
    );
    setNotice({
      type: "success",
      message: `Đã xóa model "${item.name}" (${item.modelCode}) khỏi kho LED.`,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Quản lý kho LED</h1>
          <p className="mt-1 text-sm font-medium text-text-muted">
            Theo dõi tồn kho, nhập hàng mới, điều chỉnh số lượng và xóa model LED trong kho
          </p>
        </div>

        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-primary px-4 py-2.5 text-sm font-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-primary/90"
        >
          <Plus size={16} />
          Nhập kho LED
        </button>
      </header>

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
          label="Tổng số lượng tồn kho"
          value={totalStock}
          helper="Số lượng sản phẩm hiện có"
        />
        <SummaryCard
          icon={<List size={19} />}
          label="Số model LED"
          value={inventoryItems.length}
          helper="Đang quản lý trong kho"
        />
        <SummaryCard
          icon={<AlertTriangle size={19} />}
          label="Model sắp hết hàng"
          value={lowStockCount}
          helper="Cần kiểm tra"
          tone="warning"
        />
        <SummaryCard
          icon={<PackageCheck size={19} />}
          label="LED đã bán (tháng này)"
          value={soldThisMonth}
          helper="Theo đơn hàng đã ghi nhận"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
        <section className="neo-box-no-hover overflow-hidden bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b-2 border-primary-light px-4 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("models")}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "models"
                  ? "border-primary-dark text-primary-dark"
                  : "border-transparent text-text-muted"
              }`}
            >
              <List size={15} className="mr-1 inline" /> Danh sách theo model
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("instances")}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "instances"
                  ? "border-primary-dark text-primary-dark"
                  : "border-transparent text-text-muted"
              }`}
            >
              <Boxes size={15} className="mr-1 inline" /> Danh sách thiết bị
              (instance)
            </button>
          </div>

          {activeTab === "instances" ? (
            <LedInstancesSection />
          ) : (
            <>
              <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_180px_180px_auto]">
                <label className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-sm">
                  <Search size={15} className="text-text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full outline-none"
                    placeholder="Tìm model, mã model..."
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as InventoryStatus | "All")
                  }
                  className="border-2 border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="All">Trạng thái: Tất cả</option>
                  <option value="In stock">Còn hàng</option>
                  <option value="Low stock">Sắp hết hàng</option>
                  <option value="Out of stock">Hết hàng</option>
                </select>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortOption)}
                  className="border-2 border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="name">Sắp xếp: Tên model (A - Z)</option>
                  <option value="stock">Tồn kho cao nhất</option>
                  <option value="available">Khả dụng cao nhất</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-1 border-2 border-black px-3 py-2 text-xs font-bold hover:bg-primary/20"
                >
                  <RotateCcw size={14} /> Đặt lại
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {[
                        "Model",
                        "Mã model",
                        "Tồn kho",
                        "Đã đặt",
                        "Khả dụng",
                        "Ngưỡng tối thiểu",
                        "Trạng thái",
                        "Thao tác",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase ${
                            heading === "Thao tác" ? "text-right" : "text-left"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => {
                      const itemStatus = getInventoryStatus(item);
                      return (
                        <tr
                          key={item.productId}
                          className="border-b border-gray-100 hover:bg-green-50/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-gray-200 bg-gray-50">
                                {item.previewUrl ? (
                                  <Image
                                    src={item.previewUrl}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <Boxes
                                    size={17}
                                    className="text-text-muted"
                                  />
                                )}
                              </div>
                              <div>
                                <p className="font-bold">{item.name}</p>
                                <p className="text-[11px] text-text-muted">
                                  {item.description || "Không có mô tả"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-text-muted">
                            {item.modelCode}
                          </td>
                          <td className="px-4 py-3 font-black">{item.stock}</td>
                          <td className="px-4 py-3">{item.reserved}</td>
                          <td className="px-4 py-3 font-black text-primary-dark">
                            {getAvailableStock(item)}
                          </td>
                          <td className="px-4 py-3">{item.minimumStock}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-bold ${STATUS_CLASS[itemStatus]}`}
                            >
                              {STATUS_LABEL[itemStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAdjustingItem(item)}
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-primary/20"
                              >
                                <Edit3 size={13} />
                                Chỉnh số lượng
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteModel(item)}
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={13} />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center font-semibold text-text-muted"
                        >
                          Không tìm thấy model LED phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs text-text-muted">
                  Hiển thị{" "}
                  {filteredItems.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}{" "}
                  - {Math.min(currentPage * PAGE_SIZE, filteredItems.length)} /{" "}
                  {filteredItems.length} model
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage === 1}
                    className="border border-gray-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from(
                    { length: pageCount },
                    (_, index) => index + 1,
                  ).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-8 border px-2 py-1 text-xs font-bold ${
                        currentPage === pageNumber
                          ? "border-primary-dark bg-primary/20 text-primary-dark"
                          : "border-gray-300 hover:bg-primary/10"
                      }`}
                      aria-label={`Trang ${pageNumber}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                    disabled={currentPage === pageCount}
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

        <aside className="flex flex-col gap-5">
          <ImportCard
            fileName={fileName}
            models={inventoryItems}
            onFileChange={setFileName}
            onConfirmExcelImport={(productId, quantity, importedFile) => {
              handleImportExistingStock(productId, quantity, importedFile);
              setFileName("");
            }}
          />
          <section className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={17} className="text-primary-dark" />
                <h2 className="font-black">Lịch sử nhập kho</h2>
              </div>
              <span className="text-xs font-bold text-text-muted">
                {importRecords.length} lượt
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {importRecords.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-muted">
                  Chưa có lượt nhập kho nào được ghi nhận.
                </p>
              ) : (
                importRecords.slice(0, 8).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <FileSpreadsheet
                      size={17}
                      className="shrink-0 text-primary-dark"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">
                        {record.fileName}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        +{record.itemCount} thiết bị ·{" "}
                        {new Date(record.importedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        record.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {record.status === "Completed" ? "Thành công" : "Lỗi"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {importModalOpen && (
        <ImportStockModal
          models={inventoryItems}
          onClose={() => setImportModalOpen(false)}
          onImportExisting={(productId, qty, note) => {
            handleImportExistingStock(productId, qty, note);
            setImportModalOpen(false);
          }}
          onCreateNewModel={(newModel) => {
            handleCreateNewModelInWarehouse(newModel);
            setImportModalOpen(false);
          }}
        />
      )}

      {adjustingItem && (
        <AdjustQuantityModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSave={(nextStock, nextMinimum) =>
            handleAdjustStock(adjustingItem.productId, nextStock, nextMinimum)
          }
        />
      )}
    </div>
  );
}

function LedInstancesSection() {
  const [instances, setInstances] = useState<LedInstanceItem[]>([]);
  const [models, setModels] = useState<LedModelItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [modelId, setModelId] = useState("");
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
    let cancelled = false;
    fetchManagedLedModels().then((list) => {
      if (!cancelled) {
        setModels(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

    const parsedModelId = modelId ? Number(modelId) : undefined;

    fetchLedInstances({
      page,
      size: PAGE_SIZE,
      modelId:
        parsedModelId && Number.isFinite(parsedModelId)
          ? parsedModelId
          : undefined,
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
  }, [page, modelId, statusFilter, debouncedSearch, reloadKey]);

  const handleReset = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setModelId("");
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
      <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_200px_190px_auto_auto]">
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
          value={modelId}
          onChange={(event) => {
            setModelId(event.target.value);
            setPage(0);
          }}
          aria-label="Lọc theo model LED"
          className="border-2 border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Tất cả model LED</option>
          {models.map((model) => (
            <option key={model.modelId} value={String(model.modelId)}>
              {model.modelName}
            </option>
          ))}
        </select>

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
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {[
                "Serial & ID",
                "Model LED",
                "Địa chỉ MAC",
                "Trạng thái",
                "Đơn hàng / Chủ sở hữu",
                "Bảo hành / Ngày SX",
                "QR Nhà máy",
                "Chi tiết",
              ].map((heading) => (
                <th
                  key={heading}
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase"
                >
                  {heading}
                </th>
              ))}
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
                    className="border-b border-gray-100 hover:bg-green-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">
                        {row.serialNumber}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        #{row.instanceId}
                        {row.hardwareRevision
                          ? ` · ${row.hardwareRevision}`
                          : ""}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {row.modelName ?? `Model #${row.modelId}`}
                      </p>
                      {row.deviceName && (
                        <p className="text-[11px] text-text-muted">
                          Tên hiển thị: {row.deviceName}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                      {row.macAddress}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs">
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

                    <td className="px-4 py-3 text-xs text-gray-700">
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

                    <td className="px-4 py-3">
                      {hasQrPayload ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <QrCode size={12} /> Có sẵn
                        </span>
                      ) : (
                        <span className="inline-flex whitespace-nowrap rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                          Đã ẩn
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedInstanceId(row.instanceId)}
                        className="inline-flex items-center gap-1 whitespace-nowrap border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold hover:border-black hover:bg-primary/20"
                      >
                        <Eye size={14} /> Xem chi tiết
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
                    Không tìm thấy thiết bị LED vật lý nào.
                  </p>
                  <p className="mt-1 text-xs">
                    Thử thay đổi bộ lọc model, trạng thái hoặc từ khóa tìm kiếm.
                  </p>
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
                  label="Phiên bản PCB"
                  value={detail.hardwareRevision || "—"}
                />
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

function ImportCard({
  fileName,
  models,
  onFileChange,
  onConfirmExcelImport,
}: {
  fileName: string;
  models: LedInventoryItem[];
  onFileChange: (value: string) => void;
  onConfirmExcelImport: (
    productId: string,
    quantity: number,
    importedFileName: string,
  ) => void;
}) {
  const [targetProductId, setTargetProductId] = useState(
    models[0]?.productId ?? "",
  );
  const [importQty, setImportQty] = useState("10");
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!models.some((m) => m.productId === targetProductId)) {
      setTargetProductId(models[0]?.productId ?? "");
    }
  }, [models, targetProductId]);

  const handleDownloadSample = () => {
    const csvContent =
      "\uFEFFmodelCode,name,quantity,unitPrice\nLUM-MAT-6464,Lumintra Matrix Pro 64x64 RGB,20,1490000\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-nhap-kho-led.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    setCardError("");
    if (!fileName) {
      setCardError("Vui lòng chọn file Excel/CSV trước khi xác nhận.");
      return;
    }
    if (!targetProductId) {
      setCardError("Chưa có model LED trong kho để nhập.");
      return;
    }
    const qty = Number(importQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setCardError("Số lượng nhập phải là số nguyên dương (> 0).");
      return;
    }
    onConfirmExcelImport(targetProductId, qty, fileName);
  };

  return (
    <section className="neo-box-no-hover bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Upload size={17} className="text-primary-dark" />
        <h2 className="font-black">Nhập kho từ file Excel</h2>
      </div>
      <div className="flex flex-col gap-3.5 text-xs">
        <div className="flex gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary font-black">
            1
          </span>
          <div>
            <p className="font-bold">Tải file Excel / CSV</p>
            <p className="text-text-muted">
              Chọn file chứa danh sách thiết bị để nhập kho
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center hover:border-primary-dark">
          <Upload size={20} className="text-primary-dark" />
          <span className="font-bold">
            {fileName || "Nhấn để chọn hoặc kéo thả file Excel/CSV"}
          </span>
          <span className="text-text-muted">.xlsx, .xls, .csv (tối đa 10MB)</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(event) => {
              setCardError("");
              onFileChange(event.target.files?.[0]?.name ?? "");
            }}
          />
        </label>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="inline-flex items-center justify-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-bold hover:bg-primary/20"
        >
          <FileSpreadsheet size={14} /> Tải mẫu file Excel
        </button>

        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="font-bold text-gray-800">2. Áp dụng vào kho model</p>
          <select
            value={targetProductId}
            onChange={(e) => setTargetProductId(e.target.value)}
            disabled={models.length === 0}
            className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
          >
            {models.length === 0 ? (
              <option value="">Chưa có model trong kho</option>
            ) : (
              models.map((m) => (
                <option key={m.productId} value={m.productId}>
                  {m.modelCode} · {m.name}
                </option>
              ))
            )}
          </select>
          <label className="block font-semibold text-gray-700">
            Số lượng nhập thêm
            <input
              type="number"
              min={1}
              step={1}
              value={importQty}
              onChange={(e) => setImportQty(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
            />
          </label>
        </div>

        {cardError && (
          <p role="alert" className="rounded bg-red-50 p-2 font-semibold text-red-700">
            {cardError}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex items-center justify-center gap-2 border-2 border-black bg-primary px-3 py-2 text-xs font-black hover:bg-primary/80"
        >
          <Check size={14} /> 3. Xác nhận nhập kho
        </button>
      </div>
    </section>
  );
}

function ImportStockModal({
  models,
  onClose,
  onImportExisting,
  onCreateNewModel,
}: {
  models: LedInventoryItem[];
  onClose: () => void;
  onImportExisting: (productId: string, qty: number, note: string) => void;
  onCreateNewModel: (newModel: {
    modelCode: string;
    name: string;
    description: string;
    stock: number;
    minimumStock: number;
    unitPrice: number;
  }) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    models.length > 0 ? "existing" : "new",
  );
  const [selectedId, setSelectedId] = useState(models[0]?.productId ?? "");
  const [addQty, setAddQty] = useState("20");
  const [note, setNote] = useState("");

  // New model fields
  const [modelCode, setModelCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialStock, setInitialStock] = useState("25");
  const [minimumStock, setMinimumStock] = useState("5");
  const [unitPrice, setUnitPrice] = useState("1490000");

  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "existing") {
      if (!selectedId) {
        setError("Vui lòng chọn model LED cần nhập thêm.");
        return;
      }
      const parsedQty = Number(addQty);
      if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
        setError("Số lượng nhập thêm phải là số nguyên lớn hơn 0.");
        return;
      }
      const selectedModel = models.find((m) => m.productId === selectedId);
      const recordTitle = note.trim()
        ? `${note.trim()} (${selectedModel?.modelCode ?? selectedId})`
        : `Nhập kho thủ công · ${selectedModel?.modelCode ?? selectedId}`;
      onImportExisting(selectedId, parsedQty, recordTitle);
      return;
    }

    const cleanCode = modelCode.trim().toUpperCase();
    const cleanName = name.trim();
    if (!cleanCode || !cleanName) {
      setError("Vui lòng nhập đầy đủ Mã model và Tên model LED.");
      return;
    }
    if (
      models.some(
        (m) => m.modelCode.toLowerCase() === cleanCode.toLowerCase(),
      )
    ) {
      setError(`Mã model "${cleanCode}" đã tồn tại trong kho.`);
      return;
    }

    const stockNum = Number(initialStock);
    const minNum = Number(minimumStock);
    const priceNum = Number(unitPrice);

    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError("Số lượng ban đầu phải là số nguyên >= 0.");
      return;
    }
    if (!Number.isInteger(minNum) || minNum < 0) {
      setError("Ngưỡng cảnh báo tối thiểu phải là số nguyên >= 0.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Đơn giá phải lớn hơn hoặc bằng 0.");
      return;
    }

    onCreateNewModel({
      modelCode: cleanCode,
      name: cleanName,
      description: description.trim(),
      stock: stockNum,
      minimumStock: minNum,
      unitPrice: priceNum,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-stock-title"
    >
      <div className="w-full max-w-lg rounded-2xl border-2 border-black bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 id="import-stock-title" className="text-lg font-black">
            Nhập kho LED
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={models.length === 0}
            onClick={() => {
              setMode("existing");
              setError("");
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
              mode === "existing"
                ? "border-black bg-primary text-black"
                : "border-gray-300 bg-white text-gray-600"
            } disabled:opacity-40`}
          >
            Nhập thêm model có sẵn
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("new");
              setError("");
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
              mode === "new"
                ? "border-black bg-primary text-black"
                : "border-gray-300 bg-white text-gray-600"
            }`}
          >
            Nhập model LED mới
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 text-sm">
          {mode === "existing" ? (
            <>
              <label className="block text-xs font-bold text-gray-700">
                Chọn model LED
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {models.map((m) => (
                    <option key={m.productId} value={m.productId}>
                      {m.modelCode} · {m.name} (Hiện có: {m.stock})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-gray-700">
                Số lượng nhập thêm *
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-xs font-bold text-gray-700">
                Ghi chú lô nhập (tùy chọn)
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Lô nhập tháng 11 - Nhà cung cấp A"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-gray-700">
                  Mã model *
                  <input
                    type="text"
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="Ví dụ: LUM-CAR-6432"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Đơn giá tham chiếu (VNĐ)
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                Tên model LED *
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Lumintra Windshield Matrix 64×32"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-xs font-bold text-gray-700">
                Mô tả kỹ thuật
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Độ phân giải, kết nối, kích thước..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-gray-700">
                  Số lượng nhập kho *
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Ngưỡng cảnh báo tối thiểu *
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-primary px-4 py-2 text-xs font-black hover:bg-primary/80"
            >
              {mode === "existing" ? "Xác nhận nhập thêm" : "Thêm model vào kho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustQuantityModal({
  item,
  onClose,
  onSave,
}: {
  item: LedInventoryItem;
  onClose: () => void;
  onSave: (nextStock: number, nextMinimumStock: number) => void;
}) {
  const [stockInput, setStockInput] = useState(String(item.stock));
  const [minStockInput, setMinStockInput] = useState(String(item.minimumStock));
  const [error, setError] = useState("");

  const parsedStock = Number(stockInput);
  const previewAvailable = Number.isFinite(parsedStock)
    ? Math.max(0, parsedStock - item.reserved)
    : 0;

  const applyDelta = (delta: number) => {
    const base = Number.isInteger(parsedStock) ? parsedStock : item.stock;
    setStockInput(String(Math.max(item.reserved, base + delta)));
    setError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const nextStock = Number(stockInput);
    const nextMin = Number(minStockInput);

    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setError("Số lượng tồn kho phải là số nguyên >= 0.");
      return;
    }
    if (nextStock < item.reserved) {
      setError(
        `Tồn kho không được nhỏ hơn số lượng đang đặt giữ (${item.reserved}).`,
      );
      return;
    }
    if (!Number.isInteger(nextMin) || nextMin < 0) {
      setError("Ngưỡng tối thiểu phải là số nguyên >= 0.");
      return;
    }

    onSave(nextStock, nextMin);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-stock-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h2 id="adjust-stock-title" className="text-lg font-black">
              Chỉnh số lượng tồn kho
            </h2>
            <p className="text-xs font-semibold text-text-muted">
              {item.modelCode} · {item.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center text-xs">
          <div>
            <p className="text-text-muted">Hiện tại</p>
            <p className="mt-0.5 text-base font-black">{item.stock}</p>
          </div>
          <div>
            <p className="text-text-muted">Đang đặt</p>
            <p className="mt-0.5 text-base font-black">{item.reserved}</p>
          </div>
          <div>
            <p className="text-text-muted">Khả dụng mới</p>
            <p className="mt-0.5 text-base font-black text-primary-dark">
              {previewAvailable}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <span className="text-xs font-bold text-gray-700">
              Điều chỉnh nhanh
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[-5, -1, 1, 5, 10].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => applyDelta(delta)}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold hover:bg-primary/20"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-bold text-gray-700">
            Số lượng tồn kho mới *
            <input
              type="number"
              min={item.reserved}
              step={1}
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold"
            />
          </label>

          <label className="block text-xs font-bold text-gray-700">
            Ngưỡng cảnh báo sắp hết hàng *
            <input
              type="number"
              min={0}
              step={1}
              value={minStockInput}
              onChange={(e) => setMinStockInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg border-2 border-black bg-primary px-4 py-2 text-xs font-black hover:bg-primary/80"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
