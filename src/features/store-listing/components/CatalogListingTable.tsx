"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Cpu, Edit, Trash2, Undo2 } from "lucide-react";
import { fetchManagedStoreProducts, type BackendProductStatus } from "@/lib/api/products";
import type { CatalogProduct } from "@/features/cart/catalog";
import type { ProductType } from "@/features/cart/types";
import { formatDateTime, formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";
import {
  STORE_FORBIDDEN_HINT,
  STORE_TABLE_CLASS,
  STORE_THEAD_CLASS,
  STORE_TH_CLASS,
  StoreActionButton,
  StoreEmptyRow,
  StoreErrorRow,
  StoreSkeletonRows,
  StoreTableFooter,
  StoreThumbnail,
  storeRowClass,
} from "./StoreTablePrimitives";

type CatalogKind = Extract<ProductType, "LED_MODEL" | "BUNDLE">;

export interface StoreCatalogItem extends CatalogProduct {
  status?: BackendProductStatus;
  updatedAt?: string;
}

const COPY: Record<CatalogKind, { label: string; unitLabel: string; nameHeading: string }> = {
  LED_MODEL: {
    label: "Mẫu LED",
    unitLabel: "mẫu LED",
    nameHeading: "Tên mẫu LED",
  },
  BUNDLE: {
    label: "Gói sản phẩm",
    unitLabel: "gói sản phẩm",
    nameHeading: "Tên gói sản phẩm",
  },
};

interface CatalogListingTableProps {
  kind: CatalogKind;
  items?: StoreCatalogItem[];
  isLoading?: boolean;
  error?: string | null;
  canManage?: boolean;
  onPublish?: (product: StoreCatalogItem) => void;
  onEdit?: (product: StoreCatalogItem) => void;
  onArchive?: (product: StoreCatalogItem) => void;
  onUnlist?: (product: StoreCatalogItem) => void;
  onDelete?: (product: StoreCatalogItem) => void;
  onRefresh?: () => void;
}

/** Bảng xem thông tin và quản lý các sản phẩm bán trên cửa hàng — đồng bộ thiết kế với bảng Nhân vật. */
export default function CatalogListingTable({
  kind,
  items: initialItems,
  isLoading: externalLoading,
  error: externalError,
  canManage = false,
  onPublish,
  onEdit,
  onArchive,
  onDelete,
  onRefresh,
}: CatalogListingTableProps) {
  const [items, setItems] = useState<StoreCatalogItem[]>(initialItems ?? []);
  const [internalLoading, setInternalLoading] = useState(!initialItems);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setInternalLoading(false);
      return;
    }
    let active = true;
    setInternalLoading(true);
    setInternalError(null);
    fetchManagedStoreProducts({
      productType: kind === "LED_MODEL" ? "LED" : "BUNDLE",
      size: 200,
    })
      .then((res) => {
        if (!active) return;
        setItems(
          res.items.map((item) => ({
            id: String(item.productId),
            productId: item.productId,
            productType: kind,
            name: item.productName,
            price: Number(item.basePrice ?? 0),
            description: item.description ?? "",
            previewUrl: item.thumbnailUrl || item.galleryUrls?.[0] || undefined,
            galleryUrls: item.galleryUrls ?? [],
            tags: item.tags ?? [],
            status: item.status,
            updatedAt: item.updatedAt ?? item.createdAt ?? undefined,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to load managed catalog products:", err);
        if (active) {
          setInternalError("Không thể tải danh sách mẫu LED. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialItems, kind]);

  const isLoading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const currentStatus: BackendProductStatus = item.status ?? "UNPUBLISHED";
      if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery, statusFilter]);

  const statusCounts = useMemo(
    () => computeStatusCounts(items, (item) => item.status),
    [items],
  );

  const hasFilters = statusFilter !== "ALL" || searchQuery !== "";
  const resetFilters = () => {
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  const isBundle = kind === "BUNDLE";
  const headings = [
    "Mã sản phẩm",
    "Ảnh đại diện",
    COPY[kind].nameHeading,
    isBundle ? "Thành phần gói" : "Mô tả",
    "Giá bán",
    "Trạng thái",
    ...(!isBundle ? ["Thao tác"] : []),
  ];

  const actionTitle = canManage ? undefined : STORE_FORBIDDEN_HINT;

  return (
    <>
      <StoreListingToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={statusCounts}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Tìm kiếm ${COPY[kind].unitLabel} theo tên hoặc mã…`}
        onRefresh={onRefresh}
        onReset={resetFilters}
        canReset={hasFilters}
      />

      <div className="overflow-x-auto">
        <table className={STORE_TABLE_CLASS}>
          <caption className="sr-only">
            Danh sách {COPY[kind].label} đang quản lý trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {headings.map((heading) => (
                <th key={heading} scope="col" className={STORE_TH_CLASS}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <StoreSkeletonRows columns={headings.length} />}

            {!isLoading && error && (
              <StoreErrorRow colSpan={headings.length} message={error} onRetry={onRefresh} />
            )}

            {!isLoading && !error && filteredItems.length === 0 && (
              <StoreEmptyRow
                colSpan={headings.length}
                message={
                  items.length === 0
                    ? `Chưa có ${COPY[kind].unitLabel} nào được niêm yết trên cửa hàng.`
                    : `Không tìm thấy ${COPY[kind].unitLabel} phù hợp với bộ lọc.`
                }
                hasActiveFilters={items.length > 0 && hasFilters}
                onResetFilters={resetFilters}
              />
            )}

            {!isLoading &&
              !error &&
              filteredItems.map((item) => {
                const status: BackendProductStatus = item.status ?? "UNPUBLISHED";
                const isDeleted = status === "DELETED";

                return (
                  <tr key={item.id} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{item.productId ?? item.id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StoreThumbnail
                        src={item.previewUrl}
                        alt={`Ảnh đại diện của ${item.name}`}
                        fallback={<Cpu size={18} aria-hidden="true" />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`text-xs font-black uppercase sm:text-sm ${isDeleted ? "text-text-muted line-through" : "text-black"}`}>
                        {item.name}
                      </p>
                      {item.updatedAt && (
                        <p className="text-[11px] font-medium text-text-muted tabular-nums">
                          Cập nhật lúc {formatDateTime(item.updatedAt)}
                        </p>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3.5 text-xs font-medium text-text-muted">
                      <span className="line-clamp-2">
                        {isBundle
                          ? `${item.components?.length ?? 0} sản phẩm: ${(item.components ?? [])
                              .map((component) => component.name)
                              .join(", ")}`
                          : item.description || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm font-black text-primary-ink tabular-nums">
                      {formatVnd(item.price)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={status} />
                    </td>
                    {!isBundle && (
                      <td className="px-4 py-3.5">
                        {isDeleted ? null : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {onEdit && (
                              <StoreActionButton
                                variant="secondary"
                                disabled={!canManage}
                                title={actionTitle}
                                onClick={() => onEdit(item)}
                                icon={<Edit size={13} />}
                              >
                                Sửa
                              </StoreActionButton>
                            )}
                            {status === "UNPUBLISHED" && onPublish && (
                              <StoreActionButton
                                variant="primary"
                                disabled={!canManage}
                                title={actionTitle}
                                onClick={() => onPublish(item)}
                                icon={<CheckCircle2 size={13} />}
                              >
                                Mở bán
                              </StoreActionButton>
                            )}
                            {status === "ARCHIVED" && onPublish && (
                              <StoreActionButton
                                variant="primary"
                                disabled={!canManage}
                                title={actionTitle}
                                onClick={() => onPublish(item)}
                                icon={<Undo2 size={13} />}
                              >
                                Mở bán lại
                              </StoreActionButton>
                            )}
                            {status !== "ARCHIVED" && onArchive && (
                              <StoreActionButton
                                variant="secondary"
                                disabled={!canManage}
                                title={actionTitle}
                                onClick={() => onArchive(item)}
                                icon={<Archive size={13} />}
                              >
                                Ngừng bán
                              </StoreActionButton>
                            )}
                            {onDelete && (
                              <StoreActionButton
                                variant="danger"
                                disabled={!canManage}
                                title={actionTitle}
                                onClick={() => onDelete(item)}
                                icon={<Trash2 size={13} />}
                              >
                                Xóa
                              </StoreActionButton>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && (
        <StoreTableFooter
          filteredCount={filteredItems.length}
          totalCount={items.length}
          unitLabel={COPY[kind].unitLabel}
        />
      )}
    </>
  );
}
