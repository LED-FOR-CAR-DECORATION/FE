"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { StoreCharacterRow } from "../types";
import { formatVnd, formatDateTime } from "../format";
import StatusBadge from "./StatusBadge";
import StoreModal from "./StoreModal";
import EditStoreProductModal from "./EditStoreProductModal";
import {
  STORE_FORBIDDEN_HINT,
  STORE_THEAD_CLASS,
  STORE_TH_CLASS,
  StoreHoverActionButton,
  StoreSkeletonRows,
  StoreTablePagination,
  useStoreTablePagination,
} from "./StoreTablePrimitives";

interface ManagerProductListingTableProps {
  rows: StoreCharacterRow[];
  isLoading: boolean;
  canManage: boolean;
  onApprove?: (character: StoreCharacterRow, price?: number) => Promise<void>;
  onOpenApprove?: (character: StoreCharacterRow) => void;
  onRefresh: () => void;
  onEdit?: (character: StoreCharacterRow) => void;
  externalQuery?: string;
  hideHeader?: boolean;
}

export default function ManagerProductListingTable({
  rows,
  isLoading,
  canManage,
  onOpenApprove,
  onRefresh,
  onEdit,
  externalQuery,
  hideHeader = false,
}: ManagerProductListingTableProps) {
  const [query, setQuery] = useState("");
  const [zoomedRow, setZoomedRow] = useState<StoreCharacterRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<StoreCharacterRow | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter ONLY UNPUBLISHED ("Chờ duyệt") character products
  const unpublishedRows = useMemo(() => {
    return rows.filter((row) => row.status === "UNPUBLISHED");
  }, [rows]);

  const activeQuery = externalQuery !== undefined ? externalQuery : query;

  const filteredRows = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    if (!q) return unpublishedRows;
    return unpublishedRows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.creatorName.toLowerCase().includes(q) ||
        row.characterId.includes(q),
    );
  }, [activeQuery, unpublishedRows]);

  const {
    page,
    setPage,
    pageSize,
    ready,
    totalPages,
    totalElements,
    pagedItems,
  } = useStoreTablePagination(filteredRows, activeQuery);

  const handleOpenApprove = (row: StoreCharacterRow) => {
    if (!canManage) return;
    setActionError(null);
    if (onOpenApprove) {
      onOpenApprove(row);
      return;
    }
    setApproveTarget(row);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header bar */}
      {!hideHeader && (
        <div className="flex shrink-0 flex-col gap-3 border-b-2 border-black bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#fef08a] text-black shadow-[2px_2px_0_0_#000]">
              <Clock size={16} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-black">
                Hàng đợi phê duyệt nhân vật (Chưa mở bán)
              </h3>
              <p className="text-xs font-medium text-text-muted">
                Các nhân vật do nhà thiết kế đăng tải đang chờ Quản lý thẩm định và duyệt mở bán.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc nhà thiết kế..."
                aria-label="Tìm theo tên hoặc nhà thiết kế"
                className="w-48 border-2 border-black bg-gray-50 py-1.5 pl-8 pr-3 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white sm:w-60"
              />
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Làm mới hàng đợi"
              aria-label="Làm mới hàng đợi"
              className="btn-secondary p-2! shadow-[2px_2px_0_0_#000]"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className="m-4 flex shrink-0 items-center justify-between gap-2 border-2 border-black bg-primary/25 px-4 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-primary-ink" aria-hidden="true" />
            {actionNotice}
          </span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            aria-label="Đóng thông báo"
            className="btn-secondary p-1! shadow-[1px_1px_0_0_#000]"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="m-4 flex shrink-0 items-center justify-between gap-2 border-2 border-black bg-[#fee2e2] px-4 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-700" aria-hidden="true" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Đóng lỗi"
            className="btn-secondary p-1! shadow-[1px_1px_0_0_#000]"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[880px] table-fixed border-collapse text-left text-sm">
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              <th className={`${STORE_TH_CLASS} w-[108px]`}>Mã sản phẩm</th>
              <th className={`${STORE_TH_CLASS} w-[88px]`}>Ảnh đại diện</th>
              <th className={STORE_TH_CLASS}>Tên nhân vật</th>
              <th className={`${STORE_TH_CLASS} w-[170px]`}>Nhà thiết kế</th>
              <th className={`${STORE_TH_CLASS} w-[136px]`}>Trạng thái</th>
              <th className={`${STORE_TH_CLASS} w-[200px] text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/10 bg-white">
            {isLoading || !ready ? (
              <StoreSkeletonRows columns={6} rows={pageSize} />
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center border-2 border-dashed border-black/25 bg-gray-50 px-5 py-8">
                    <div className="grid h-11 w-11 place-items-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
                      <ShieldCheck size={22} aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                      {activeQuery
                        ? "Không có nhân vật nào khớp với từ khóa tìm kiếm."
                        : "Không có nhân vật nào đang chờ duyệt!"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-text-muted">
                      {activeQuery
                        ? "Hãy kiểm tra lại từ khóa hoặc xóa ô tìm kiếm."
                        : "Tất cả nhân vật trên cửa hàng đều đã được duyệt hoặc đã ẩn."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedItems.map((row) => {
                return (
                  <tr
                    key={row.characterId}
                    className="transition-colors duration-150 hover:bg-[#f3faf5]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{row.characterId}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="group relative h-11 w-11 cursor-pointer overflow-hidden border-2 border-black bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.thumbnailUrl}
                          alt={row.name}
                          className="h-full w-full object-contain [image-rendering:pixelated]"
                          onClick={() => setZoomedRow(row)}
                        />
                        <button
                          type="button"
                          onClick={() => setZoomedRow(row)}
                          title="Xem phóng to bản vẽ"
                          aria-label={`Xem phóng to ${row.name}`}
                          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Eye size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <p title={row.name} className="truncate text-xs font-black uppercase text-black sm:text-sm">{row.name}</p>
                      <p className="line-clamp-1 text-xs font-medium text-text-muted">
                        {row.description || "Chưa có mô tả chi tiết."}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted tabular-nums">
                        Cập nhật: {formatDateTime(row.updatedAt)}
                      </p>
                    </td>

                    <td className="truncate whitespace-nowrap px-4 py-2.5 text-xs font-bold text-black">
                      {row.creatorName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                        {onEdit && (
                          <StoreHoverActionButton
                            tone="primary"
                            labelSize="medium"
                            label="Sửa / Gắn thẻ"
                            aria-label={`Sửa và gắn thẻ ${row.name}`}
                            disabled={!canManage}
                            title={canManage ? "Chỉnh sửa chi tiết, mô tả hoặc gắn thẻ" : STORE_FORBIDDEN_HINT}
                            onClick={() => onEdit(row)}
                            icon={<Edit className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                          />
                        )}

                        {/* Dedicated "Approve" (Xét duyệt) button */}
                        <StoreHoverActionButton
                          tone="approve"
                          labelSize="medium"
                          label="Xét duyệt"
                          aria-label={`Xét duyệt ${row.name}`}
                          disabled={!canManage}
                          title={canManage ? "Mở hộp thoại xét duyệt thông tin, đặt giá bán và mở bán lên cửa hàng" : STORE_FORBIDDEN_HINT}
                          onClick={() => handleOpenApprove(row)}
                          icon={<Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <StoreTablePagination
        page={page}
        size={pageSize}
        totalElements={totalElements}
        totalPages={totalPages}
        totalUnfilteredCount={unpublishedRows.length}
        unitLabel="nhân vật chờ duyệt"
        onPageChange={setPage}
        disabled={isLoading || !ready}
        ariaLabel="Phân trang hàng đợi phê duyệt nhân vật"
      />

      {/* Zoom Artwork Modal */}
      {zoomedRow && (
        <StoreModal
          title={zoomedRow.name}
          description="Bản vẽ Pixel Art kiểm duyệt bởi Quản lý"
          badge={`Nhân vật #${zoomedRow.characterId}`}
          onClose={() => setZoomedRow(null)}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setZoomedRow(null)}
                className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = zoomedRow;
                  setZoomedRow(null);
                  handleOpenApprove(target);
                }}
                disabled={!canManage}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Check size={14} aria-hidden="true" />
                Xét duyệt sản phẩm này
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center justify-center border-2 border-black bg-gray-50 p-6">
            <div className="flex h-64 w-64 items-center justify-center overflow-hidden border-2 border-black bg-[#111111] shadow-[4px_4px_0_0_#000]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedRow.thumbnailUrl}
                alt={zoomedRow.name}
                className="h-full w-full object-contain [image-rendering:pixelated]"
              />
            </div>
          </div>
        </StoreModal>
      )}

      {/* Fallback Approve Modal based on EditStoreProductModal */}
      {approveTarget && (
        <EditStoreProductModal
          mode="approve"
          creatorName={approveTarget.creatorName}
          previewFallbackUrl={approveTarget.thumbnailUrl}
          product={{
            id: approveTarget.characterId,
            productType: "CHARACTER",
            productName: approveTarget.name,
            basePrice: approveTarget.draft?.basePrice ?? approveTarget.basePrice ?? 0,
            description: approveTarget.description,
            thumbnailUrl: approveTarget.draft?.thumbnailUrl ?? undefined,
            galleryUrls: approveTarget.draft?.galleryUrls ?? approveTarget.galleryUrls ?? [],
            tags: approveTarget.tags ?? [],
          }}
          onClose={() => setApproveTarget(null)}
          onSuccess={(productName, savedPrice) => {
            const priceLabel = savedPrice !== undefined ? ` (${formatVnd(savedPrice)})` : "";
            setActionNotice(
              `Đã xét duyệt nhân vật "${productName}"${priceLabel} sang trạng thái Đang bán!`,
            );
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
