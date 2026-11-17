"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
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
  onApprove: (character: StoreCharacterRow) => Promise<void>;
  onRefresh: () => void;
}

export default function ManagerProductListingTable({
  rows,
  isLoading,
  canManage,
  onApprove,
  onRefresh,
}: ManagerProductListingTableProps) {
  const [query, setQuery] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [zoomedRow, setZoomedRow] = useState<StoreCharacterRow | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter ONLY UNPUBLISHED ("Pending Review") store listings
  const unpublishedRows = useMemo(() => {
    return rows.filter((row) => row.status === "Pending Review");
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unpublishedRows;
    return unpublishedRows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.creatorName.toLowerCase().includes(q) ||
        row.characterId.includes(q),
    );
  }, [query, unpublishedRows]);

  const handleApproveClick = async (row: StoreCharacterRow) => {
    if (approvingId !== null || !canManage) return;
    setApprovingId(row.characterId);
    setActionNotice(null);
    setActionError(null);
    try {
      await onApprove(row);
      setActionNotice(
        `Đã phê duyệt sản phẩm "${row.name}" (#${row.characterId}) và mở bán PUBLISHED trên Store!`,
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Phê duyệt sản phẩm thất bại. Vui lòng thử lại.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-[#e3efe6] bg-[#fbfdfb] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Clock size={16} />
          </span>
          <div>
            <h3 className="text-sm font-black text-[#173b28]">
              Hàng đợi Phê duyệt Store Listing (Chưa công khai - UNPUBLISHED)
            </h3>
            <p className="text-xs text-[#66736b]">
              Các sản phẩm do Designer đăng tải đang chờ Manager thẩm định nghệ thuật và duyệt mở bán.
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
              placeholder="Tìm theo tên hoặc Designer..."
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
        <table className="w-full text-left text-xs text-[#26352f]">
          <thead className="border-b border-[#e3efe6] bg-[#f7fbf8] font-bold text-[#173b28]">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tác phẩm</th>
              <th className="px-4 py-3">Tên sản phẩm</th>
              <th className="px-4 py-3">Designer</th>
              <th className="px-4 py-3">Phiên bản</th>
              <th className="px-4 py-3">Giá đề xuất</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Phê duyệt (Approval)</th>
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
                    {query
                      ? "Không có sản phẩm nào khớp với từ khóa tìm kiếm."
                      : "Không có sản phẩm nào đang chờ duyệt!"}
                  </p>
                  <p className="mt-1 text-xs text-[#66736b]">
                    {query
                      ? "Hãy kiểm tra lại từ khóa hoặc xóa ô tìm kiếm."
                      : "Tất cả các sản phẩm Store Listing đều đã được duyệt (PUBLISHED) hoặc đã ẩn."}
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
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#155e59]">
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
                      {formatVnd(199000)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        <Clock size={11} />
                        UNPUBLISHED (Chờ duyệt)
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Toggle Simulation */}
                        <label
                          className={`relative inline-flex cursor-pointer items-center ${
                            !canManage || isProcessing ? "cursor-not-allowed opacity-60" : ""
                          }`}
                          title={
                            canManage
                              ? "Bật chuyển đổi trạng thái sang PUBLISHED"
                              : "Chỉ Manager mới có quyền duyệt"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={!canManage || isProcessing}
                            onChange={() => void handleApproveClick(row)}
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>

                        {/* Dedicated "Approve" (Duyệt mở bán) button */}
                        <button
                          type="button"
                          onClick={() => void handleApproveClick(row)}
                          disabled={!canManage || isProcessing}
                          title="Phê duyệt Store Listing và chuyển trạng thái sang PUBLISHED"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProcessing ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          {isProcessing ? "Đang duyệt..." : "Duyệt (Approve)"}
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
            <p className="text-xs text-slate-400">Bản vẽ Pixel Art kiểm duyệt bởi Manager</p>
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
                Duyệt mở bán sản phẩm này (PUBLISHED)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
