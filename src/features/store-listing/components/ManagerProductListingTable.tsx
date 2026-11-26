"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { StoreCharacterRow } from "../types";
import { formatVnd, formatDateTime } from "../format";
import StatusBadge from "./StatusBadge";
import StoreModal from "./StoreModal";

interface ManagerProductListingTableProps {
  rows: StoreCharacterRow[];
  isLoading: boolean;
  canManage: boolean;
  onApprove: (character: StoreCharacterRow, price?: number) => Promise<void>;
  onRefresh: () => void;
  onEdit?: (character: StoreCharacterRow) => void;
  externalQuery?: string;
  hideHeader?: boolean;
}

export default function ManagerProductListingTable({
  rows,
  isLoading,
  canManage,
  onApprove,
  onRefresh,
  onEdit,
  externalQuery,
  hideHeader = false,
}: ManagerProductListingTableProps) {
  const [query, setQuery] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [zoomedRow, setZoomedRow] = useState<StoreCharacterRow | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

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

  const handleApproveClick = async (row: StoreCharacterRow) => {
    if (approvingId !== null || !canManage) return;
    const priceInput = prices[row.characterId] ?? (row.draft?.basePrice ? String(row.draft.basePrice) : "");
    const price = Number(priceInput);
    if (row.draft && (!/^\d{1,10}(?:\.\d{1,2})?$/.test(priceInput) || !Number.isFinite(price))) {
      setActionError("Nhập giá bán hợp lệ cho sản phẩm trước khi duyệt. Nhập 0 nếu muốn phát hành miễn phí.");
      return;
    }
    setApprovingId(row.characterId);
    setActionNotice(null);
    setActionError(null);
    try {
      await onApprove(row, row.draft ? price : undefined);
      setActionNotice(
        `Đã phê duyệt nhân vật "${row.name}" (#${row.characterId}) và mở bán PUBLISHED trên Store!`,
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Phê duyệt nhân vật thất bại. Vui lòng thử lại.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      {!hideHeader && (
        <div className="flex flex-col gap-3 border-b-2 border-black bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="m-4 flex items-center justify-between gap-2 border-2 border-black bg-primary/25 px-4 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
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
          className="m-4 flex items-center justify-between gap-2 border-2 border-black bg-[#fee2e2] px-4 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="border-b-2 border-black bg-[#e9f5ed]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Mã sản phẩm</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Ảnh đại diện</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Tên nhân vật</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Nhà thiết kế</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Phiên bản</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Giá đề xuất</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Trạng thái</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-black">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/10 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-14 text-center text-xs font-bold text-text-muted">
                  <Loader2 size={18} className="mx-auto mb-2 animate-spin text-primary-ink" aria-hidden="true" />
                  Đang tải danh sách chờ duyệt...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
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
              filteredRows.map((row) => {
                const isProcessing = approvingId === row.characterId;
                return (
                  <tr
                    key={row.characterId}
                    className="transition-colors duration-150 hover:bg-[#f3faf5]"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{row.characterId}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="group relative h-12 w-12 cursor-pointer overflow-hidden border-2 border-black bg-gray-50">
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

                    <td className="px-4 py-3.5">
                      <p className="text-xs font-black uppercase text-black sm:text-sm">{row.name}</p>
                      <p className="line-clamp-1 max-w-xs text-xs font-medium text-text-muted">
                        {row.description || "Chưa có mô tả chi tiết."}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-text-muted tabular-nums">
                        Cập nhật: {formatDateTime(row.updatedAt)}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-black">
                      {row.creatorName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      {row.activeVersion ? (
                        <span className="inline-flex items-center border border-black bg-primary/40 px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-[1px_1px_0_0_#000]">
                          v{row.activeVersion.versionNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-text-muted">v1 (mặc định)</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 font-black text-primary-ink tabular-nums">
                      {row.draft ? (
                        <input
                          type="number"
                          min={0}
                          max={9999999999.99}
                          step={0.01}
                          aria-label={`Giá bán của ${row.name}`}
                          className="w-36 border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-black text-primary-ink tabular-nums focus:bg-white disabled:opacity-50"
                          placeholder="Nhập giá (VNĐ)"
                          disabled={!canManage || isProcessing}
                          value={prices[row.characterId] ?? (row.draft.basePrice ? String(row.draft.basePrice) : "")}
                          onChange={(event) => setPrices((current) => ({ ...current, [row.characterId]: event.target.value }))}
                        />
                      ) : (
                        formatVnd(199000)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={!canManage || isProcessing}
                            title="Chỉnh sửa chi tiết, mô tả hoặc gắn thẻ"
                            className="btn-secondary inline-flex items-center gap-1 px-2.5! py-1.5! text-[11px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                          >
                            <Edit size={13} aria-hidden="true" />
                            Sửa / Gắn thẻ
                          </button>
                        )}

                        {/* Dedicated "Approve" (Duyệt mở bán) button */}
                        <button
                          type="button"
                          onClick={() => void handleApproveClick(row)}
                          disabled={!canManage || isProcessing}
                          title="Phê duyệt và chuyển sang trạng thái Đang mở bán"
                          className="btn-primary inline-flex items-center gap-1.5 px-3! py-1.5! text-[11px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                        >
                          {isProcessing ? (
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <Check size={13} aria-hidden="true" />
                          )}
                          {isProcessing ? "Đang duyệt..." : "Duyệt mở bán"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                  void handleApproveClick(target);
                }}
                disabled={!canManage}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Check size={14} aria-hidden="true" />
                Duyệt mở bán sản phẩm này
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
    </div>
  );
}
