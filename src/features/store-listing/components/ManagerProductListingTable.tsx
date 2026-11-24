"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { StoreCharacterRow } from "../types";
import { formatVnd, formatDateTime } from "../format";
import StatusBadge from "./StatusBadge";

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
        <div className="flex flex-col gap-3 border-b border-[#e3efe6] bg-[#fbfdfb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Clock size={16} />
            </span>
            <div>
              <h3 className="text-sm font-black text-[#173b28]">
                Hàng đợi phê duyệt nhân vật (Chưa mở bán)
              </h3>
              <p className="text-xs text-[#66736b]">
                Các nhân vật do nhà thiết kế đăng tải đang chờ Quản lý thẩm định và duyệt mở bán.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-[#d8e6dc] bg-white px-3 py-1.5 text-xs focus-within:border-[#48a56a]">
              <Search size={14} className="text-[#66736b]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc nhà thiết kế..."
                className="w-44 bg-transparent outline-none sm:w-56"
              />
            </label>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Làm mới hàng đợi"
              className="rounded-xl border border-[#d8e6dc] bg-white p-2 text-[#66736b] hover:bg-[#f6fbf7] hover:text-[#173b28]"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className="m-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            {actionNotice}
          </span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="rounded p-0.5 hover:bg-emerald-100"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="m-4 flex items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="rounded p-0.5 hover:bg-red-100"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[#e3efe6]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Mã sản phẩm</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Ảnh đại diện</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Tên nhân vật</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Nhà thiết kế</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Phiên bản</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Giá đề xuất</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Trạng thái</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef5f0]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-14 text-center text-xs font-semibold text-[#66736b]">
                  <Loader2 size={18} className="mx-auto mb-2 animate-spin text-[#198653]" />
                  Đang tải danh sách chờ duyệt...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#173b28]">
                    {activeQuery
                      ? "Không có nhân vật nào khớp với từ khóa tìm kiếm."
                      : "Không có nhân vật nào đang chờ duyệt!"}
                  </p>
                  <p className="mt-1 text-xs text-[#66736b]">
                    {activeQuery
                      ? "Hãy kiểm tra lại từ khóa hoặc xóa ô tìm kiếm."
                      : "Tất cả nhân vật trên cửa hàng đều đã được duyệt hoặc đã ẩn."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isProcessing = approvingId === row.characterId;
                return (
                  <tr
                    key={row.characterId}
                    className="transition-colors hover:bg-[#f8fcf9]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-primary-dark">
                      #{row.characterId}
                    </td>

                    <td className="px-4 py-3">
                      <div className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-lg border border-[#d8e6dc] bg-[#0b0f19]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.thumbnailUrl}
                          alt={row.name}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                          onClick={() => setZoomedRow(row)}
                        />
                        <button
                          type="button"
                          onClick={() => setZoomedRow(row)}
                          title="Xem phóng to bản vẽ"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100 text-white"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-[#173b28]">{row.name}</p>
                      <p className="line-clamp-1 max-w-xs text-[11px] text-[#66736b]">
                        {row.description || "Chưa có mô tả chi tiết."}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#8ea394]">
                        Cập nhật: {formatDateTime(row.updatedAt)}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#26352f]">
                      {row.creatorName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {row.activeVersion ? (
                        <span className="rounded-md border border-[#cfe5d6] bg-[#f1faf4] px-2 py-0.5 font-mono text-xs font-black text-[#2c5a3f]">
                          v{row.activeVersion.versionNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">v1 (mặc định)</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#173b28]">
                      {row.draft ? (
                        <input type="number" min={0} max={9999999999.99} step={0.01}
                          aria-label={`Giá bán của ${row.name}`}
                          className="w-32 rounded-lg border border-[#cfe5d6] bg-white px-2 py-2"
                          placeholder="Nhập giá (VNĐ)"
                          disabled={!canManage || isProcessing}
                          value={prices[row.characterId] ?? (row.draft.basePrice ? String(row.draft.basePrice) : "")}
                          onChange={(event) => setPrices((current) => ({ ...current, [row.characterId]: event.target.value }))} />
                      ) : formatVnd(199000)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={!canManage || isProcessing}
                            title="Chỉnh sửa chi tiết, mô tả hoặc gắn thẻ"
                            className="inline-flex items-center gap-1 rounded-xl border border-[#cfe0d4] bg-white px-2.5 py-1.5 text-xs font-bold text-[#173b28] shadow-sm transition hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Edit size={13} />
                            Sửa / Gắn thẻ
                          </button>
                        )}

                        {/* Dedicated "Approve" (Duyệt mở bán) button */}
                        <button
                          type="button"
                          onClick={() => void handleApproveClick(row)}
                          disabled={!canManage || isProcessing}
                          title="Phê duyệt và chuyển sang trạng thái Đang mở bán"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProcessing ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
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
      {zoomedRow &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setZoomedRow(null)}
          >
            <div
              className="relative flex max-w-md flex-col items-center rounded-2xl border border-slate-700 bg-[#090d14] p-5 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomedRow(null)}
                className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
              <h4 className="text-sm font-black text-white">{zoomedRow.name}</h4>
              <p className="text-xs text-slate-400">Bản vẽ Pixel Art kiểm duyệt bởi Quản lý</p>
              <div className="my-4 flex h-64 w-64 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={zoomedRow.thumbnailUrl}
                  alt={zoomedRow.name}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div className="w-full text-center">
                <button
                  type="button"
                  onClick={() => {
                    const target = zoomedRow;
                    setZoomedRow(null);
                    void handleApproveClick(target);
                  }}
                  disabled={!canManage}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700"
                >
                  <Check size={14} />
                  Duyệt mở bán sản phẩm này
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
