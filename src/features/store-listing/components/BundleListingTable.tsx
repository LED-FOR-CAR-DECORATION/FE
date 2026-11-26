"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Cpu,
  Edit,
  Eye,
  Loader2,
  Monitor,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  fetchManagedBundleDetail,
  fetchManagedBundles,
  type BundleConstituentItem,
  type ManagedBundleItem,
} from "@/lib/api/bundles";
import { fetchManagedStoreProducts, fetchStoreProductDetail } from "@/lib/api/products";
import { formatDateTime, formatVnd } from "../format";
import StatusBadge from "./StatusBadge";
import StoreListingToolbar, {
  computeStatusCounts,
  type StoreStatusFilter,
} from "./StoreListingToolbar";
import StoreModal from "./StoreModal";
import {
  STORE_FORBIDDEN_HINT,
  STORE_TABLE_CLASS,
  STORE_THEAD_CLASS,
  STORE_TH_CLASS,
  StoreActionButton,
  StoreEmptyRow,
  StoreErrorRow,
  StoreHoverActionButton,
  StoreSkeletonRows,
  StoreTablePagination,
  StoreThumbnail,
  storeRowClass,
  useStoreTablePagination,
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

const HEADINGS: { label: string; className?: string }[] = [
  { label: "Mã sản phẩm", className: "w-[108px]" },
  { label: "Ảnh đại diện", className: "w-[88px]" },
  { label: "Tên gói sản phẩm" },
  { label: "Thành phần", className: "w-[132px]" },
  { label: "Giá bán", className: "w-[160px]" },
  { label: "Trạng thái", className: "w-[132px]" },
  { label: "Thao tác", className: "w-[260px] text-right" },
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
  const [inspectBundle, setInspectBundle] = useState<EnrichedBundleItem | null>(null);
  const [inspectItems, setInspectItems] = useState<BundleConstituentItem[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const openInspectModal = async (bundle: EnrichedBundleItem) => {
    setInspectBundle(bundle);
    setInspectItems([]);
    setInspectError(null);
    setInspectLoading(true);
    try {
      const detail = await fetchManagedBundleDetail(bundle.bundleId);
      setInspectItems(detail.items ?? []);
    } catch {
      try {
        const publicDetail = await fetchStoreProductDetail(bundle.productId);
        setInspectItems(
          (publicDetail?.bundleDetails?.items ?? []).map((bi) => ({
            itemType: bi.itemType,
            productId: bi.productId,
            modelId: bi.modelId,
            modelName: bi.modelName,
            stockQuantity: bi.stockQuantity,
            specifications: bi.specifications,
            versionId: bi.versionId,
            characterId: bi.characterId,
            characterName: bi.characterName,
            versionNumber: bi.versionNumber,
            previewGifUrl: bi.previewGifUrl,
            thumbnailUrl: bi.thumbnailUrl,
            unitPrice: bi.unitPrice,
            quantity: bi.quantity,
          })),
        );
      } catch {
        setInspectError("Không thể tải danh sách sản phẩm trong gói Combo.");
      }
    } finally {
      setInspectLoading(false);
    }
  };

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
  const {
    page,
    setPage,
    pageSize,
    ready,
    totalPages,
    totalElements,
    pagedItems,
  } = useStoreTablePagination(filteredBundles, `${searchQuery}::${statusFilter}`);

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

      <div className="min-h-0 flex-1 overflow-auto">
        <table className={`${STORE_TABLE_CLASS} min-w-[1060px]`}>
          <caption className="sr-only">
            Danh sách gói sản phẩm đang quản lý trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {HEADINGS.map((heading) => (
                <th
                  key={heading.label}
                  scope="col"
                  className={`${STORE_TH_CLASS} ${heading.className ?? ""}`}
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(isLoading || !ready) && (
              <StoreSkeletonRows columns={HEADINGS.length} rows={pageSize} />
            )}

            {!isLoading && ready && error && (
              <StoreErrorRow colSpan={HEADINGS.length} message={error} onRetry={loadBundles} />
            )}

            {!isLoading && ready && !error && filteredBundles.length === 0 && (
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
              ready &&
              !error &&
              pagedItems.map((bundle) => {
                const discount =
                  bundle.originalPrice && bundle.originalPrice > bundle.bundlePrice
                    ? Math.round((1 - bundle.bundlePrice / bundle.originalPrice) * 100)
                    : 0;
                const isDeleted = bundle.status === "DELETED";

                return (
                  <tr key={bundle.bundleId} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{bundle.productId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StoreThumbnail
                        src={bundle.thumbnailUrl}
                        alt={`Ảnh đại diện của ${bundle.bundleName}`}
                        fallback={<Boxes size={18} aria-hidden="true" />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p
                        title={bundle.bundleName}
                        className={`truncate text-xs font-black uppercase sm:text-sm ${isDeleted ? "line-through text-text-muted" : "text-black"}`}
                      >
                        {bundle.bundleName}
                      </p>
                      <p className="truncate text-[11px] font-medium text-text-muted tabular-nums">
                        {bundle.updatedAt
                          ? `Cập nhật lúc ${formatDateTime(bundle.updatedAt)}`
                          : bundle.description || "Chưa có mô tả"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => void openInspectModal(bundle)}
                        title="Xem các sản phẩm có trong gói Combo"
                        className="inline-flex cursor-pointer items-center gap-1.5 border border-black bg-primary/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000] transition-colors hover:bg-primary tabular-nums"
                      >
                        <Eye size={12} className="text-black" aria-hidden="true" />
                        {bundle.itemCount} mục · Xem
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
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
                    <td className="px-4 py-2.5">
                      <StatusBadge status={bundle.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {isDeleted ? null : (
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                          {onEdit && (
                            <StoreHoverActionButton
                              tone="primary"
                              label="Sửa"
                              aria-label={`Sửa ${bundle.bundleName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Sửa"}
                              onClick={() => onEdit(bundle)}
                              icon={<Edit className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {bundle.status === "UNPUBLISHED" && onPublish && (
                            <StoreHoverActionButton
                              tone="approve"
                              label="Mở bán"
                              aria-label={`Mở bán ${bundle.bundleName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Mở bán"}
                              onClick={() => onPublish(bundle)}
                              icon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {bundle.status === "ARCHIVED" && onPublish && (
                            <StoreHoverActionButton
                              tone="approve"
                              labelSize="medium"
                              label="Mở bán lại"
                              aria-label={`Mở bán lại ${bundle.bundleName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Mở bán lại"}
                              onClick={() => onPublish(bundle)}
                              icon={<Undo2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {bundle.status !== "ARCHIVED" && onArchive && (
                            <StoreHoverActionButton
                              tone="neutral"
                              labelSize="medium"
                              label="Ngừng bán"
                              aria-label={`Ngừng bán ${bundle.bundleName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Ngừng bán"}
                              onClick={() => onArchive(bundle)}
                              icon={<Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          )}
                          {onDelete && (
                            <StoreHoverActionButton
                              tone="danger"
                              label="Xóa"
                              aria-label={`Xóa ${bundle.bundleName}`}
                              disabled={!canManage}
                              title={actionTitle ?? "Xóa"}
                              onClick={() => onDelete(bundle)}
                              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
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

      {!error && (
        <StoreTablePagination
          page={page}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          totalUnfilteredCount={bundles.length}
          unitLabel="gói sản phẩm"
          onPageChange={setPage}
          disabled={isLoading || !ready}
          ariaLabel="Phân trang danh sách gói sản phẩm"
        />
      )}

      {inspectBundle && (
        <StoreModal
          title={inspectBundle.bundleName}
          badge={`THÀNH PHẦN GÓI COMBO #${inspectBundle.bundleId}`}
          description={inspectBundle.description || "Danh sách các sản phẩm cấu thành gói Combo."}
          icon={<Boxes size={18} />}
          iconBoxClassName="bg-primary/35"
          onClose={() => setInspectBundle(null)}
          size="md"
          footer={
            <button
              type="button"
              onClick={() => setInspectBundle(null)}
              className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              Đóng
            </button>
          }
        >
          {inspectLoading ? (
            <div className="flex items-center justify-center py-12 text-xs font-bold text-text-muted">
              <Loader2 size={20} className="mr-2 animate-spin text-primary-ink" aria-hidden="true" />
              Đang tải danh sách sản phẩm trong gói...
            </div>
          ) : inspectError ? (
            <div className="border-2 border-black bg-[#fee2e2] p-4 text-xs font-bold text-red-800">
              {inspectError}
            </div>
          ) : inspectItems.length === 0 ? (
            <div className="border-2 border-dashed border-black/30 bg-gray-50 p-6 text-center text-xs font-bold text-text-muted">
              Gói Combo này hiện chưa có thành phần nào.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y-2 divide-black/15 border-2 border-black bg-white">
                {inspectItems.map((it, idx) => {
                  const isLed = it.itemType === "LED" || it.modelId != null;
                  const name = isLed
                    ? it.modelName || `Tấm LED #${it.modelId ?? idx + 1}`
                    : it.characterName || `Nhân vật #${it.characterId ?? it.versionId ?? idx + 1}`;
                  const thumb = isLed ? it.thumbnailUrl : it.previewGifUrl || it.thumbnailUrl;
                  const resolution =
                    isLed && it.specifications && it.specifications.resolution
                      ? String(it.specifications.resolution)
                      : null;
                  const unitPrice = it.unitPrice != null ? Number(it.unitPrice) : null;

                  return (
                    <div
                      key={`${isLed ? "LED" : "CHAR"}-${it.modelId ?? it.versionId ?? idx}`}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-50">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={name}
                              className={`h-full w-full object-contain p-1 ${
                                isLed ? "" : "[image-rendering:pixelated]"
                              }`}
                            />
                          ) : isLed ? (
                            <Cpu size={20} className="text-primary-ink" aria-hidden="true" />
                          ) : (
                            <Monitor size={20} className="text-primary-ink" aria-hidden="true" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`border border-black px-1.5 py-0.5 text-[10px] font-black uppercase text-black ${
                                isLed ? "bg-[#fef08a]" : "bg-[#bae6fd]"
                              }`}
                            >
                              {isLed ? "Tấm LED" : "Nhân vật"}
                            </span>
                            {resolution && (
                              <span className="border border-black/40 bg-gray-100 px-1.5 py-0.5 text-[10px] font-black text-black">
                                {resolution}
                              </span>
                            )}
                            {!isLed && it.versionNumber != null && (
                              <span className="border border-black/40 bg-gray-100 px-1.5 py-0.5 text-[10px] font-black text-black">
                                v{it.versionNumber}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-black uppercase text-black">
                            {name}
                          </p>
                          <p className="text-[11px] font-medium text-text-muted tabular-nums">
                            {unitPrice != null ? `Giá lẻ: ${formatVnd(unitPrice)}` : "Đã bao gồm"}
                            {isLed && it.stockQuantity != null
                              ? ` · Tồn kho: ${it.stockQuantity}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-block border-2 border-black bg-black px-2 py-0.5 text-xs font-black text-white tabular-nums">
                          ×{it.quantity}
                        </span>
                        {unitPrice != null && (
                          <p className="mt-1 text-xs font-black text-primary-ink tabular-nums">
                            {formatVnd(unitPrice * it.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-primary/15 px-3.5 py-2.5 text-xs">
                <div>
                  <span className="font-bold text-text-muted">Giá gốc: </span>
                  <span className="font-black text-black line-through tabular-nums">
                    {formatVnd(inspectBundle.originalPrice)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-text-muted">Giá bán Combo: </span>
                  <span className="text-sm font-black text-primary-ink tabular-nums">
                    {formatVnd(inspectBundle.bundlePrice)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </StoreModal>
      )}
    </>
  );
}
