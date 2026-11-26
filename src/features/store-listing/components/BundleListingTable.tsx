"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Edit,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { fetchManagedBundles, type ManagedBundleItem } from "@/lib/api/bundles";
import { fetchManagedStoreProducts } from "@/lib/api/products";
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

interface EnrichedBundleItem extends ManagedBundleItem {
  thumbnailUrl?: string;
  updatedAt?: string;
}

interface BundleListingTableProps {
  canManage?: boolean;
  onEdit?: (bundle: ManagedBundleItem) => void;
  onPublish?: (bundle: ManagedBundleItem) => void;
  onArchive?: (bundle: ManagedBundleItem) => void;
  onUnlist?: (bundle: ManagedBundleItem) => void;
  onDelete?: (bundle: ManagedBundleItem) => void;
  onCreate?: () => void;
  onCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

const HEADINGS = [
  "Mã sản phẩm",
  "Ảnh đại diện",
  "Tên gói sản phẩm",
  "Thành phần",
  "Giá bán",
  "Trạng thái",
  "Thao tác",
];

export default function BundleListingTable({
  canManage = false,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onCreate,
  onCountChange,
  refreshTrigger = 0,
}: BundleListingTableProps) {
  const [bundles, setBundles] = useState<EnrichedBundleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadBundles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bundlesRes, productsRes] = await Promise.all([
        fetchManagedBundles({ size: 100 }),
        fetchManagedStoreProducts({ productType: "BUNDLE", size: 200 }).catch(() => ({
          items: [],
          totalElements: 0,
          totalPages: 0,
        })),
      ]);

      const productById = new Map(
        productsRes.items.map((product) => [product.productId, product]),
      );

      const enriched: EnrichedBundleItem[] = bundlesRes.items.map((bundle) => {
        const linked = productById.get(bundle.productId);
        return {
          ...bundle,
          thumbnailUrl: linked?.thumbnailUrl || linked?.galleryUrls?.[0] || undefined,
          updatedAt: linked?.updatedAt ?? linked?.createdAt ?? undefined,
        };
      });

      setBundles(enriched);
      onCountChange?.(bundlesRes.totalElements);
    } catch (err) {
      console.error("Failed to load managed bundles:", err);
      setError("Không thể tải danh sách gói sản phẩm. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBundles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const statusCounts = useMemo(
    () => computeStatusCounts(bundles, (b) => b.status),
    [bundles],
  );

  const filteredBundles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bundles.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        b.bundleName.toLowerCase().includes(q) ||
        String(b.bundleId).includes(q) ||
        String(b.productId).includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    });
  }, [bundles, searchQuery, statusFilter]);

  const hasFilters = statusFilter !== "ALL" || searchQuery !== "";
  const resetFilters = () => {
    setStatusFilter("ALL");
    setSearchQuery("");
  };

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
        searchPlaceholder="Tìm kiếm gói sản phẩm theo tên hoặc mã…"
        onRefresh={loadBundles}
        onReset={resetFilters}
        canReset={hasFilters}
      />

      <div className="overflow-x-auto">
        <table className={STORE_TABLE_CLASS}>
          <caption className="sr-only">
            Danh sách gói sản phẩm đang quản lý trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {HEADINGS.map((heading) => (
                <th key={heading} scope="col" className={STORE_TH_CLASS}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <StoreSkeletonRows columns={HEADINGS.length} />}

            {!isLoading && error && (
              <StoreErrorRow colSpan={HEADINGS.length} message={error} onRetry={loadBundles} />
            )}

            {!isLoading && !error && filteredBundles.length === 0 && (
              <StoreEmptyRow
                colSpan={HEADINGS.length}
                message={
                  bundles.length === 0
                    ? "Chưa có gói sản phẩm nào được niêm yết trên cửa hàng."
                    : "Không tìm thấy gói sản phẩm phù hợp với bộ lọc."
                }
                hasActiveFilters={bundles.length > 0 && hasFilters}
                onResetFilters={resetFilters}
                action={
                  canManage && onCreate ? (
                    <StoreActionButton
                      variant="primary"
                      onClick={onCreate}
                      icon={<Plus size={13} />}
                    >
                      Tạo gói sản phẩm
                    </StoreActionButton>
                  ) : undefined
                }
              />
            )}

            {!isLoading &&
              !error &&
              filteredBundles.map((bundle) => {
                const discount =
                  bundle.originalPrice && bundle.originalPrice > bundle.bundlePrice
                    ? Math.round((1 - bundle.bundlePrice / bundle.originalPrice) * 100)
                    : 0;
                const isDeleted = bundle.status === "DELETED";

                return (
                  <tr key={bundle.bundleId} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{bundle.productId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StoreThumbnail
                        src={bundle.thumbnailUrl}
                        alt={`Ảnh đại diện của ${bundle.bundleName}`}
                        fallback={<Boxes size={18} aria-hidden="true" />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`text-xs font-black uppercase sm:text-sm ${isDeleted ? "line-through text-text-muted" : "text-black"}`}>
                        {bundle.bundleName}
                      </p>
                      <p className="max-w-xs truncate text-[11px] font-medium text-text-muted tabular-nums">
                        {bundle.updatedAt
                          ? `Cập nhật lúc ${formatDateTime(bundle.updatedAt)}`
                          : bundle.description || "Chưa có mô tả"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 border border-black bg-primary/35 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] tabular-nums">
                        <Sparkles size={11} className="text-black" aria-hidden="true" />
                        {bundle.itemCount} mục
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="text-sm font-black text-primary-ink tabular-nums">
                        {formatVnd(bundle.bundlePrice)}
                      </p>
                      {discount > 0 && (
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-text-muted line-through tabular-nums">
                            {formatVnd(bundle.originalPrice)}
                          </span>
                          <span className="border border-black bg-[#fecaca] px-1.5 py-0.2 text-[10px] font-black text-black tabular-nums">
                            -{discount}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={bundle.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {isDeleted ? null : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {onEdit && (
                            <StoreActionButton
                              variant="secondary"
                              disabled={!canManage}
                              title={actionTitle}
                              onClick={() => onEdit(bundle)}
                              icon={<Edit size={13} />}
                            >
                              Sửa
                            </StoreActionButton>
                          )}
                          {bundle.status === "UNPUBLISHED" && onPublish && (
                            <StoreActionButton
                              variant="primary"
                              disabled={!canManage}
                              title={actionTitle}
                              onClick={() => onPublish(bundle)}
                              icon={<CheckCircle2 size={13} />}
                            >
                              Mở bán
                            </StoreActionButton>
                          )}
                          {bundle.status === "ARCHIVED" && onPublish && (
                            <StoreActionButton
                              variant="primary"
                              disabled={!canManage}
                              title={actionTitle}
                              onClick={() => onPublish(bundle)}
                              icon={<Undo2 size={13} />}
                            >
                              Mở bán lại
                            </StoreActionButton>
                          )}
                          {bundle.status !== "ARCHIVED" && onArchive && (
                            <StoreActionButton
                              variant="secondary"
                              disabled={!canManage}
                              title={actionTitle}
                              onClick={() => onArchive(bundle)}
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
                              onClick={() => onDelete(bundle)}
                              icon={<Trash2 size={13} />}
                            >
                              Xóa
                            </StoreActionButton>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && (
        <StoreTableFooter
          filteredCount={filteredBundles.length}
          totalCount={bundles.length}
          unitLabel="gói sản phẩm"
        />
      )}
    </>
  );
}
