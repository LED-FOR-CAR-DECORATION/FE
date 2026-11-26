"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Eye,
  Images,
  MessageSquare,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import { formatPrice } from "@/lib/currency";
import {
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  STATUS_TONE_CLASS,
} from "../config/statusMeta";
import { commissionErrorMessage, isRequestCancelled } from "../errors";
import {
  getCommissionQueue,
  type CommissionManagementDetail,
  type CommissionQueueItem,
  type CommissionQueueMeta,
} from "../services/management-commission.api";
import AssignDesignerModal from "./AssignDesignerModal";
import CommissionPagination from "./CommissionPagination";
import StaffCommissionDetailModal, {
  type StaffDetailModalTab,
} from "./StaffCommissionDetailModal";

const PRIMARY_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "PAID", label: "Chờ phân công" },
  { value: "IN_PROGRESS", label: "Đang thiết kế" },
  { value: "INTERNAL_REVIEW", label: "Duyệt bản nháp" },
  { value: "PREVIEW_DELIVERED", label: "Đã gửi khách" },
  { value: "COMPLETED", label: "Hoàn thành" },
];

const SECONDARY_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "INTERNAL_REVISION_REQUIRED", label: "Sửa nội bộ" },
  { value: "AWAITING_EXTRA_PAYMENT", label: "Chờ phí sửa" },
  { value: "AWAITING_ESTIMATE", label: "Chờ dự kiến sửa" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "EXPIRED", label: "Hết hạn" },
];

export default function ManagementCommissionQueue() {
  const [rows, setRows] = useState<CommissionQueueItem[]>([]);
  const [meta, setMeta] = useState<CommissionQueueMeta>({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<"DESC" | "ASC">("DESC");
  const [reloadTick, setReloadTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [detailModal, setDetailModal] = useState<{
    commissionId: number;
    initialTab: StaffDetailModalTab;
  } | null>(null);
  const [detailReloadSignal, setDetailReloadSignal] = useState(0);
  const [assignTarget, setAssignTarget] = useState<
    | CommissionQueueItem
    | CommissionManagementDetail
    | null
  >(null);

  const refreshQueue = useCallback(() => {
    setReloadTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const req = getCommissionQueue({
      page,
      size,
      status: statusFilter || undefined,
      sortDirection,
    });
    req
      .then((res) => {
        if (!active) return;
        const list = res.data ?? [];
        setRows(list);
        setMeta(
          res.meta ?? {
            page,
            size,
            totalElements: list.length,
            totalPages: Math.max(1, Math.ceil(list.length / size)),
            hasNext: false,
            hasPrevious: page > 0,
          },
        );
      })
      .catch((failure) => {
        if (!active || isRequestCancelled(failure)) return;
        setError(commissionErrorMessage(failure, "Không tải được danh sách commission."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      req.cancel();
    };
  }, [page, size, statusFilter, sortDirection, reloadTick]);

  function handleStatusChange(nextStatus: string) {
    setStatusFilter(nextStatus);
    setPage(0);
  }

  function handleSortToggle() {
    setSortDirection((prev) => (prev === "DESC" ? "ASC" : "DESC"));
    setPage(0);
  }

  function handleSizeChange(nextSize: number) {
    setSize(nextSize);
    setPage(0);
  }

  function handleAssignedSuccess() {
    refreshQueue();
    setDetailReloadSignal((value) => value + 1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-widest text-primary-ink">
            Staff & Manager Workspace
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
            Quản lý Commission
          </h1>
          <p className="mt-1 text-sm text-black/75">
            Theo dõi yêu cầu, phân công họa sĩ, duyệt bản nháp và quản lý ảnh gửi khách hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
            <span className="shrink-0 uppercase text-black/65">Trạng thái:</span>
            <select
              aria-label="Lọc theo trạng thái commission"
              disabled={loading}
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="bg-transparent font-bold text-black focus:outline-none disabled:opacity-50"
            >
              <option value="">Tất cả trạng thái</option>
              <optgroup label="Trạng thái chính">
                {PRIMARY_STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Trạng thái khác">
                {SECONDARY_STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={handleSortToggle}
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold disabled:opacity-50"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sortDirection === "DESC" ? "Mới nhất trước" : "Cũ nhất trước"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={refreshQueue}
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="neo-box-no-hover flex flex-wrap items-center justify-between gap-3 border-red-600 bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refreshQueue}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Commission Queue Table */}
      <section className="neo-box-no-hover overflow-hidden bg-white" aria-label="Danh sách yêu cầu commission">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                <th className="px-4 py-3">Mã / Khách hàng</th>
                <th className="px-4 py-3">Yêu cầu</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Phụ trách</th>
                <th className="px-4 py-3">Giá trị / Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/15">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-black/60">
                    Đang tải danh sách commission…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-black/60">
                    Không có yêu cầu nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const statusMeta = getStatusMeta(row.status);
                  const toneClass = STATUS_TONE_CLASS[statusMeta.tone] ?? STATUS_TONE_CLASS.info;
                  const canOpenChat = canReadHistory(row.status);
                  const needsAssign = row.status === "PAID";

                  return (
                    <tr
                      key={row.commissionId}
                      onClick={() =>
                        setDetailModal({ commissionId: row.commissionId, initialTab: "OVERVIEW" })
                      }
                      className="cursor-pointer transition-colors hover:bg-primary/10"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono text-xs font-black text-black">
                          #{row.commissionId}
                        </div>
                        <div className="mt-1 font-bold text-black">
                          {row.customerName || "Khách hàng"}
                        </div>
                        {row.customerEmail && (
                          <div className="max-w-[180px] truncate text-xs text-black/65">
                            {row.customerEmail}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <p className="max-w-[260px] font-black text-black line-clamp-2">
                          {row.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                          {row.tierCode && (
                            <span className="border border-black bg-neutral-100 px-1.5 py-0.5 text-black">
                              {getTierLabel(row.tierCode)}
                            </span>
                          )}
                          {row.targetMatrixDimensions && (
                            <span className="border border-black bg-white px-1.5 py-0.5 font-mono text-black">
                              {row.targetMatrixDimensions}
                            </span>
                          )}
                          {row.isSlaOverdue && (
                            <span className="inline-flex items-center gap-1 border border-red-600 bg-red-600 px-1.5 py-0.5 uppercase text-white">
                              <AlertTriangle className="h-3 w-3" />
                              Quá hạn SLA
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex border-2 px-2 py-0.5 text-xs font-black ${toneClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        {row.slaDueAt && (
                          <p className="mt-1 text-[11px] font-semibold text-black/65">
                            SLA: {formatCommissionDate(row.slaDueAt, true)}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-xs">
                        <p className="font-bold text-black">
                          Họa sĩ:{" "}
                          <span
                            className={
                              row.assignedDesignerName ? "text-primary-ink" : "text-amber-800"
                            }
                          >
                            {row.assignedDesignerName || "Chưa phân công"}
                          </span>
                        </p>
                        <p className="mt-0.5 font-semibold text-black/70">
                          Staff: {row.assignedStaffName || "Chưa gán"}
                        </p>
                      </td>

                      <td className="px-4 py-3 align-top text-xs">
                        <p className="font-mono text-sm font-black text-primary-ink">
                          {formatPrice(row.totalPrice ?? row.initialPrice ?? 0)}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-black/65">
                          {formatCommissionDate(row.createdAt, true)}
                        </p>
                      </td>

                      <td
                        className="px-4 py-3 align-top text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {needsAssign && (
                            <button
                              type="button"
                              onClick={() => setAssignTarget(row)}
                              className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-black"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Phân công
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setDetailModal({ commissionId: row.commissionId, initialTab: "MEDIA" })
                            }
                            aria-label="Quản lý ảnh gửi khách & bản nháp"
                            title="Quản lý ảnh gửi khách & bản nháp"
                            className="group/btn inline-flex h-8 items-center border-2 border-black bg-white px-2 text-xs font-bold text-black transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Images className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/btn:ml-1.5 group-hover/btn:max-w-[72px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[72px] group-focus-visible/btn:opacity-100">
                              Ảnh
                            </span>
                          </button>

                          {canOpenChat && (
                            <Link
                              href={`/staff/chat?commissionId=${row.commissionId}`}
                              aria-label="Mở phòng chat"
                              title="Mở phòng chat"
                              className="group/btn inline-flex h-8 items-center border-2 border-black bg-white px-2 text-xs font-bold text-black transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/btn:ml-1.5 group-hover/btn:max-w-[72px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[72px] group-focus-visible/btn:opacity-100">
                                Chat
                              </span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setDetailModal({
                                commissionId: row.commissionId,
                                initialTab: "OVERVIEW",
                              })
                            }
                            aria-label="Xem chi tiết commission"
                            title="Xem chi tiết"
                            className="group/btn inline-flex h-8 items-center border-2 border-black bg-white px-2 text-xs font-bold text-black transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Eye className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/btn:ml-1.5 group-hover/btn:max-w-[72px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[72px] group-focus-visible/btn:opacity-100">
                              Chi tiết
                            </span>
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
      </section>

      {/* Server-side Pagination */}
      <CommissionPagination
        page={meta.page}
        size={meta.size}
        totalElements={meta.totalElements}
        totalPages={meta.totalPages}
        onPageChange={(nextPage) => setPage(nextPage)}
        onSizeChange={handleSizeChange}
        disabled={loading}
      />

      {/* Detail & Image Management Modal */}
      {detailModal && (
        <StaffCommissionDetailModal
          commissionId={detailModal.commissionId}
          initialTab={detailModal.initialTab}
          reloadSignal={detailReloadSignal}
          onClose={() => setDetailModal(null)}
          onQueueMutated={refreshQueue}
          onOpenAssignDesigner={(detail) => setAssignTarget(detail)}
        />
      )}

      {/* Quick Assign Designer Modal */}
      {assignTarget && (
        <AssignDesignerModal
          commission={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssignedSuccess}
        />
      )}
    </div>
  );
}
