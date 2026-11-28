"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Images,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Paperclip,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  UserCheck,
  X,
} from "lucide-react";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { canReadHistory } from "@/features/commission-chat/services/commission-messages.api";
import AssignDesignerModal from "@/features/commission/components/AssignDesignerModal";
import StaffCommissionDetailModal, {
  type StaffDetailModalTab,
} from "@/features/commission/components/StaffCommissionDetailModal";
import {
  formatCommissionDate,
  getStatusMeta,
  getTierLabel,
  STATUS_TONE_CLASS,
} from "@/features/commission/config/statusMeta";
import { commissionErrorMessage, isRequestCancelled } from "@/features/commission/errors";
import {
  getCommissionQueue,
  type CommissionManagementDetail,
  type CommissionQueueItem,
} from "@/features/commission/services/management-commission.api";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";
import {
  getManagementWarrantyClaims,
  processWarrantyClaim,
  type ManagementWarrantyClaimItem,
} from "@/lib/api/warranty";
import { formatPrice } from "@/lib/currency";

type HoverTone = "neutral" | "primary" | "approve" | "danger";

const HOVER_TONE_CLASS: Record<HoverTone, string> = {
  neutral: "bg-white hover:bg-neutral-100",
  primary: "bg-white hover:bg-primary/25",
  approve: "bg-white hover:bg-[#e9f5ed]",
  danger: "bg-white hover:bg-[#fecaca]",
};

export function HoverIconAction({
  label,
  ariaLabel,
  icon,
  tone = "neutral",
  maxWidthClass = "group-hover/btn:max-w-[96px] group-focus-visible/btn:max-w-[96px]",
  href,
  onClick,
  disabled = false,
}: {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  tone?: HoverTone;
  maxWidthClass?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const baseClass = `group/btn inline-flex h-8 cursor-pointer items-center border-2 border-black px-2 text-xs font-black uppercase text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-45 ${HOVER_TONE_CLASS[tone]}`;
  const content = (
    <>
      {icon}
      <span
        className={`max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:opacity-100 ${maxWidthClass}`}
      >
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} title={label} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={label}
      className={baseClass}
    >
      {content}
    </button>
  );
}

function ModalPaginationFooter({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  onPageChange,
  manageHref,
  manageLabel,
  onClose,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (nextPage: number) => void;
  manageHref: string;
  manageLabel: string;
  onClose: () => void;
  disabled?: boolean;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  return (
    <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-5 py-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-bold text-black">
          {totalItems > 0 && (
            <>
              <strong className="font-mono">
                {startItem}–{endItem}
              </strong>{" "}
              / {totalItems} {itemLabel} ·{" "}
            </>
          )}
          Trang <strong className="font-mono">{safePage}</strong> / {safeTotalPages}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            className="btn-secondary inline-flex h-8 items-center gap-1 px-2.5! py-0! text-[11px] font-black uppercase disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Trước
          </button>
          <button
            type="button"
            disabled={disabled || safePage >= safeTotalPages}
            onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
            className="btn-secondary inline-flex h-8 items-center gap-1 px-2.5! py-0! text-[11px] font-black uppercase disabled:opacity-40"
          >
            Sau
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={manageHref}
          className="btn-secondary inline-flex h-8 items-center gap-1 px-3! py-0! text-[11px] font-black uppercase"
        >
          {manageLabel}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary h-8 px-3! py-0! text-[11px] font-black uppercase"
        >
          Đóng
        </button>
      </div>
    </footer>
  );
}

export type ModalSortMode = "PRIORITY_FIFO" | "NEWEST";

export function StaffPendingOrdersModal({
  orders,
  sortMode,
  onToggleSort,
  onClose,
  statusLabel,
  statusClass,
  formatMoney,
  formatDateTime,
}: {
  orders: MockOrder[];
  sortMode: ModalSortMode;
  onToggleSort: () => void;
  onClose: () => void;
  statusLabel: Record<OrderStatus, string>;
  statusClass: Record<OrderStatus, string>;
  formatMoney: (value: number) => string;
  formatDateTime: (value: string) => string;
}) {
  const { rows: modalPageSize } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 336,
    minRows: 3,
    maxRows: 7,
    defaultRows: 5,
  });
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(orders.length / modalPageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const pagedOrders = useMemo(
    () => orders.slice((safePage - 1) * modalPageSize, safePage * modalPageSize),
    [orders, safePage, modalPageSize],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-orders-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black bg-[#f7fbf8] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#e0f2fe] text-black shadow-[2px_2px_0_0_#000]">
              <Package size={18} aria-hidden="true" />
            </span>
            <h2
              id="pending-orders-modal-title"
              className="text-sm font-black uppercase tracking-wide text-black sm:text-base"
            >
              Đơn hàng cần tiếp nhận &amp; đóng gói ({orders.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleSort();
                setPage(1);
              }}
              className="btn-secondary inline-flex h-8 items-center gap-1.5 px-3! py-0! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              <ArrowDownUp size={13} aria-hidden="true" />
              {sortMode === "PRIORITY_FIFO" ? "Ưu tiên + Đơn cũ" : "Mới nhất trước"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng danh sách đơn cần xử lý"
              className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 size={28} className="mb-2 text-primary-ink" />
              <p className="text-sm font-black uppercase text-black">
                Không có đơn hàng nào đang chờ đóng gói
              </p>
              <p className="mt-1 text-xs font-medium text-text-muted">
                Tất cả đơn cần xử lý đều đã được bàn giao vận chuyển.
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse text-left text-sm text-black">
              <thead>
                <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                  <th className="w-[78px] py-2.5 pl-4 pr-2">Mã đơn</th>
                  <th className="px-3 py-2.5">Khách hàng</th>
                  <th className="w-[200px] px-3 py-2.5">Sản phẩm</th>
                  <th className="w-[120px] px-3 py-2.5 text-right">Tổng tiền</th>
                  <th className="w-[180px] px-3 py-2.5">Trạng thái</th>
                  <th className="w-[104px] px-3 py-2.5">Ngày tạo</th>
                  <th className="w-[116px] py-2.5 pl-2 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/15 bg-white">
                {pagedOrders.map((order) => {
                  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                  const firstItemName = order.items[0]?.name || `${order.items.length} mặt hàng`;
                  const label = statusLabel[order.status];
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-[#f3faf5]">
                      <td className="whitespace-nowrap py-2 pl-4 pr-2 font-mono text-xs font-black text-black">
                        #{order.id}
                      </td>
                      <td className="px-3 py-2">
                        <p title={order.customer.fullName} className="truncate pt-0.5 font-bold leading-snug text-black">
                          {order.customer.fullName}
                        </p>
                        <p title={order.customer.email} className="truncate text-xs text-black/65">
                          {order.customer.email}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p title={firstItemName} className="truncate pt-0.5 font-bold leading-snug text-black">
                          {firstItemName}
                        </p>
                        <p className="text-xs text-black/65">Tổng SL: ×{itemCount}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-black text-primary-ink tabular-nums">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          title={label}
                          className={`inline-block max-w-full truncate border-2 px-2 py-0.5 align-middle text-xs font-black leading-normal ${statusClass[order.status]}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-black/65">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="whitespace-nowrap py-2 pl-2 pr-4 text-right">
                        <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                          <HoverIconAction
                            href={`/staff/orders/${order.id}`}
                            label="Xử lý"
                            ariaLabel={`Xử lý đơn hàng #${order.id}`}
                            tone="primary"
                            maxWidthClass="group-hover/btn:max-w-[72px] group-focus-visible/btn:max-w-[72px]"
                            icon={<ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <ModalPaginationFooter
          page={safePage}
          totalPages={totalPages}
          totalItems={orders.length}
          pageSize={modalPageSize}
          itemLabel="đơn hàng"
          onPageChange={setPage}
          manageHref="/staff/orders"
          manageLabel="Mở trang Quản lý đơn"
          onClose={onClose}
        />
      </div>
    </div>
  );
}

type CommissionModalStatusFilter = "ALL" | "PENDING_REVIEW" | "PAID" | "INTERNAL_REVIEW";

const ACTIONABLE_COMMISSION_STATUSES = ["PENDING_REVIEW", "PAID", "INTERNAL_REVIEW"] as const;

export function StaffCommissionTodoModal({
  onClose,
  onMutated,
}: {
  onClose: () => void;
  onMutated: () => void;
}) {
  const { rows: modalPageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 336,
    minRows: 3,
    maxRows: 7,
    defaultRows: 5,
  });

  const [statusFilter, setStatusFilter] = useState<CommissionModalStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CommissionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [detailModal, setDetailModal] = useState<{
    commissionId: number;
    initialTab: StaffDetailModalTab;
  } | null>(null);
  const [detailReloadSignal, setDetailReloadSignal] = useState(0);
  const [assignTarget, setAssignTarget] = useState<
    CommissionQueueItem | CommissionManagementDetail | null
  >(null);

  const refreshAll = useCallback(() => {
    setReloadTick((tick) => tick + 1);
    onMutated();
  }, [onMutated]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const cancelers: Array<() => void> = [];
    setLoading(true);
    setError("");

    const statusesToFetch =
      statusFilter === "ALL" ? [...ACTIONABLE_COMMISSION_STATUSES] : [statusFilter];

    const requests = statusesToFetch.map((status) =>
      getCommissionQueue({
        page: 0,
        size: 50,
        status,
        sortDirection: "DESC",
      }),
    );
    requests.forEach((req) => cancelers.push(() => req.cancel()));

    Promise.all(requests)
      .then((responses) => {
        if (!active) return;
        const merged = responses
          .flatMap((res) => res.data ?? [])
          .sort(
            (a, b) =>
              (b.createdAt ? Date.parse(b.createdAt) || 0 : 0) -
              (a.createdAt ? Date.parse(a.createdAt) || 0 : 0),
          );
        setItems(merged);
      })
      .catch((failure: unknown) => {
        if (!active || isRequestCancelled(failure)) return;
        setError(commissionErrorMessage(failure, "Không tải được danh sách yêu cầu thiết kế."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      cancelers.forEach((cancel) => cancel());
    };
  }, [ready, statusFilter, reloadTick]);

  const totalPages = Math.max(1, Math.ceil(items.length / modalPageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (detailModal || assignTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [assignTarget, detailModal, onClose]);

  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * modalPageSize, safePage * modalPageSize),
    [items, safePage, modalPageSize],
  );

  const handleAssignedSuccess = () => {
    setAssignTarget(null);
    setDetailReloadSignal((value) => value + 1);
    refreshAll();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="commission-todo-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
        >
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black bg-[#f7fbf8] px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#fef08a] text-black shadow-[2px_2px_0_0_#000]">
                <ClipboardList size={18} aria-hidden="true" />
              </span>
              <h2
                id="commission-todo-modal-title"
                className="text-sm font-black uppercase tracking-wide text-black sm:text-base"
              >
                Yêu cầu thiết kế cần xử lý ({items.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Lọc trạng thái yêu cầu thiết kế"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as CommissionModalStatusFilter);
                  setPage(1);
                }}
                className="h-8 border-2 border-black bg-white px-2.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0_0_#000] focus:outline-none"
              >
                <option value="ALL">Tất cả cần xử lý</option>
                <option value="PENDING_REVIEW">Chờ duyệt</option>
                <option value="PAID">Chờ phân công</option>
                <option value="INTERNAL_REVIEW">Duyệt bản nháp</option>
              </select>

              <button
                type="button"
                onClick={() => setReloadTick((tick) => tick + 1)}
                disabled={loading}
                aria-label="Làm mới danh sách yêu cầu thiết kế"
                title="Làm mới"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000] disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng danh sách yêu cầu thiết kế"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden">
            {error ? (
              <div role="alert" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <AlertTriangle size={24} className="text-red-600" />
                <p className="text-xs font-bold text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadTick((tick) => tick + 1)}
                  className="btn-secondary h-8 px-3! py-0! text-xs font-black uppercase"
                >
                  Thử lại
                </button>
              </div>
            ) : loading || !ready ? (
              <table className="w-full table-fixed border-collapse text-left text-xs text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                    <th className="w-[180px] py-2.5 pl-4 pr-2">Mã / Khách</th>
                    <th className="px-3 py-2.5">Tiêu đề &amp; Gói</th>
                    <th className="w-[168px] px-3 py-2.5">Trạng thái</th>
                    <th className="w-[132px] px-3 py-2.5">Họa sĩ</th>
                    <th className="w-[120px] px-3 py-2.5 text-right">Giá</th>
                    <th className="w-[244px] py-2.5 pl-2 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/15 bg-white">
                  {Array.from({ length: modalPageSize }).map((_, idx) => (
                    <tr key={`comm-skel-${idx}`} className="animate-pulse">
                      <td className="py-2.5 pl-4 pr-2"><div className="h-4 w-28 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-40 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-5 w-24 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-20 bg-gray-100" /></td>
                      <td className="px-3 py-2.5 text-right"><div className="ml-auto h-4 w-20 bg-gray-200" /></td>
                      <td className="py-2.5 pl-2 pr-4 text-right"><div className="ml-auto h-8 w-24 bg-gray-200" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 size={28} className="mb-2 text-primary-ink" />
                <p className="text-sm font-black uppercase text-black">
                  Không có yêu cầu thiết kế nào cần xử lý
                </p>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  Tất cả yêu cầu chờ duyệt, chờ phân công và bản nháp đều đã được xử lý.
                </p>
              </div>
            ) : (
              <table className="w-full table-fixed border-collapse text-left text-sm text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                    <th className="w-[180px] py-2.5 pl-4 pr-2">Mã / Khách</th>
                    <th className="px-3 py-2.5">Tiêu đề &amp; Gói</th>
                    <th className="w-[168px] px-3 py-2.5">Trạng thái</th>
                    <th className="w-[132px] px-3 py-2.5">Họa sĩ</th>
                    <th className="w-[120px] px-3 py-2.5 text-right">Giá</th>
                    <th className="w-[244px] py-2.5 pl-2 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/15 bg-white">
                  {pagedItems.map((row) => {
                    const statusMeta = getStatusMeta(row.status);
                    const toneClass = STATUS_TONE_CLASS[statusMeta.tone] ?? STATUS_TONE_CLASS.info;
                    const canOpenChat = canReadHistory(row.status);
                    const needsAssign = row.status === "PAID";

                    return (
                      <tr key={row.commissionId} className="transition-colors hover:bg-[#f3faf5]">
                        <td className="py-2 pl-4 pr-2">
                          <div className="font-mono text-xs font-black text-black">
                            #{row.commissionId}
                          </div>
                          <p title={row.customerName || "Khách hàng"} className="truncate font-bold text-black">
                            {row.customerName || "Khách hàng"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <p title={row.title} className="truncate pt-0.5 font-black leading-snug text-black">
                            {row.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold">
                            {row.tierCode && (
                              <span className="truncate border border-black bg-neutral-100 px-1.5 py-0.5">
                                {getTierLabel(row.tierCode)}
                              </span>
                            )}
                            {row.targetMatrixDimensions && (
                              <span className="shrink-0 border border-black bg-white px-1.5 py-0.5 font-mono">
                                {row.targetMatrixDimensions}
                              </span>
                            )}
                            {row.isSlaOverdue && (
                              <span className="shrink-0 border border-red-600 bg-red-600 px-1.5 py-0.5 text-white">
                                Quá hạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            title={statusMeta.label}
                            className={`inline-block max-w-full truncate border-2 px-2 py-0.5 align-middle text-xs font-black leading-normal ${toneClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p
                            title={row.assignedDesignerName || "Chưa phân công"}
                            className={`truncate text-xs font-bold ${
                              row.assignedDesignerName ? "text-primary-ink" : "text-amber-800"
                            }`}
                          >
                            {row.assignedDesignerName || "Chưa phân công"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm font-black text-primary-ink tabular-nums">
                          {formatPrice(row.totalPrice ?? row.initialPrice ?? 0)}
                        </td>
                        <td className="whitespace-nowrap py-2 pl-2 pr-4 text-right">
                          <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                            {needsAssign && (
                              <HoverIconAction
                                label="Phân công"
                                ariaLabel={`Phân công họa sĩ cho yêu cầu #${row.commissionId}`}
                                tone="primary"
                                maxWidthClass="group-hover/btn:max-w-[96px] group-focus-visible/btn:max-w-[96px]"
                                onClick={() => setAssignTarget(row)}
                                icon={<UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                              />
                            )}
                            <HoverIconAction
                              label="Ảnh"
                              ariaLabel={`Xem ảnh & bản nháp của yêu cầu #${row.commissionId}`}
                              tone="neutral"
                              maxWidthClass="group-hover/btn:max-w-[60px] group-focus-visible/btn:max-w-[60px]"
                              onClick={() =>
                                setDetailModal({ commissionId: row.commissionId, initialTab: "MEDIA" })
                              }
                              icon={<Images className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                            {canOpenChat && (
                              <HoverIconAction
                                href={`/staff/chat?commissionId=${row.commissionId}`}
                                label="Chat"
                                ariaLabel={`Mở phòng chat cho yêu cầu #${row.commissionId}`}
                                tone="neutral"
                                maxWidthClass="group-hover/btn:max-w-[60px] group-focus-visible/btn:max-w-[60px]"
                                icon={<MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                              />
                            )}
                            <HoverIconAction
                              label="Chi tiết"
                              ariaLabel={`Xem chi tiết yêu cầu #${row.commissionId}`}
                              tone="primary"
                              maxWidthClass="group-hover/btn:max-w-[76px] group-focus-visible/btn:max-w-[76px]"
                              onClick={() =>
                                setDetailModal({ commissionId: row.commissionId, initialTab: "OVERVIEW" })
                              }
                              icon={<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <ModalPaginationFooter
            page={safePage}
            totalPages={totalPages}
            totalItems={items.length}
            pageSize={modalPageSize}
            itemLabel="yêu cầu"
            onPageChange={setPage}
            manageHref="/staff/commission"
            manageLabel="Mở trang Yêu cầu thiết kế"
            onClose={onClose}
            disabled={loading}
          />
        </div>
      </div>

      {detailModal && (
        <StaffCommissionDetailModal
          commissionId={detailModal.commissionId}
          initialTab={detailModal.initialTab}
          reloadSignal={detailReloadSignal}
          onClose={() => setDetailModal(null)}
          onQueueMutated={refreshAll}
          onOpenAssignDesigner={(detail) => setAssignTarget(detail)}
        />
      )}

      {assignTarget && (
        <AssignDesignerModal
          commission={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssignedSuccess}
        />
      )}
    </>
  );
}

export function StaffWarrantyTodoModal({
  onClose,
  onMutated,
}: {
  onClose: () => void;
  onMutated: () => void;
}) {
  const { rows: modalPageSize, ready } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 336,
    minRows: 3,
    maxRows: 7,
    defaultRows: 5,
  });

  const [page, setPage] = useState(0);
  const [claims, setClaims] = useState<ManagementWarrantyClaimItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [detailClaim, setDetailClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionClaim, setActionClaim] = useState<ManagementWarrantyClaimItem | null>(null);
  const [actionType, setActionType] = useState<"COMPLETE" | "REJECT" | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const activeTokenRef = useRef<symbol | null>(null);

  const fetchPendingWarranty = useCallback(async () => {
    if (!ready) return;
    const token = Symbol();
    activeTokenRef.current = token;
    setLoading(true);
    setError("");
    try {
      const res = await getManagementWarrantyClaims({
        status: "APPROVED",
        page,
        size: modalPageSize,
      });
      if (activeTokenRef.current !== token) return;
      const safeTotalPages = Math.max(1, res.totalPages || 1);
      if (page >= safeTotalPages && safeTotalPages > 0) {
        setPage(safeTotalPages - 1);
        return;
      }
      setClaims(res.items ?? []);
      setTotalElements(res.totalElements ?? 0);
      setTotalPages(safeTotalPages);
    } catch (failure: unknown) {
      if (activeTokenRef.current !== token) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể tải danh sách bảo hành đang chờ tại quầy.",
      );
    } finally {
      if (activeTokenRef.current === token) setLoading(false);
    }
  }, [modalPageSize, page, ready]);

  useEffect(() => {
    void fetchPendingWarranty();
    return () => {
      activeTokenRef.current = null;
    };
  }, [fetchPendingWarranty, reloadTick]);

  useEffect(() => {
    if (detailClaim || actionClaim || previewImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [actionClaim, detailClaim, onClose, previewImage]);

  const openActionModal = (claim: ManagementWarrantyClaimItem, type: "COMPLETE" | "REJECT") => {
    setActionClaim(claim);
    setActionType(type);
    setResolutionNotes("");
    setActionError(null);
  };

  const closeActionModal = () => {
    if (isProcessing) return;
    setActionClaim(null);
    setActionType(null);
    setResolutionNotes("");
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!actionClaim || !actionType) return;
    const trimmed = resolutionNotes.trim();
    if (!trimmed) {
      setActionError(
        actionType === "COMPLETE"
          ? "Vui lòng nhập ghi chú kết quả sửa chữa trước khi xác nhận hoàn tất."
          : "Vui lòng nhập lý do từ chối yêu cầu bảo hành.",
      );
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await processWarrantyClaim(actionClaim.ticketId, {
        status: actionType === "COMPLETE" ? "COMPLETED" : "REJECTED",
        resolutionNotes: trimmed,
      });
      setActionClaim(null);
      setActionType(null);
      setDetailClaim(null);
      setResolutionNotes("");
      setReloadTick((tick) => tick + 1);
      onMutated();
    } catch (failure: unknown) {
      setActionError(
        failure instanceof Error ? failure.message : "Xử lý phiếu bảo hành thất bại.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="warranty-todo-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
        >
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-black bg-[#f7fbf8] px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#fed7aa] text-black shadow-[2px_2px_0_0_#000]">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <h2
                id="warranty-todo-modal-title"
                className="text-sm font-black uppercase tracking-wide text-black sm:text-base"
              >
                Xử lý bảo hành tại quầy ({totalElements})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReloadTick((tick) => tick + 1)}
                disabled={loading}
                aria-label="Làm mới danh sách phiếu bảo hành"
                title="Làm mới"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000] disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng danh sách bảo hành tại quầy"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden">
            {error ? (
              <div role="alert" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <AlertTriangle size={24} className="text-red-600" />
                <p className="text-xs font-bold text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadTick((tick) => tick + 1)}
                  className="btn-secondary h-8 px-3! py-0! text-xs font-black uppercase"
                >
                  Thử lại
                </button>
              </div>
            ) : loading || !ready ? (
              <table className="w-full table-fixed border-collapse text-left text-xs text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                    <th className="w-[84px] py-2.5 pl-4 pr-2">Mã phiếu</th>
                    <th className="w-[180px] px-3 py-2.5">Khách hàng</th>
                    <th className="w-[175px] px-3 py-2.5">Thiết bị</th>
                    <th className="px-3 py-2.5">Mô tả sự cố</th>
                    <th className="w-[112px] px-3 py-2.5">Ngày tạo</th>
                    <th className="w-[216px] py-2.5 pl-2 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/15 bg-white">
                  {Array.from({ length: modalPageSize }).map((_, idx) => (
                    <tr key={`war-skel-${idx}`} className="animate-pulse">
                      <td className="py-2.5 pl-4 pr-2"><div className="h-4 w-12 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-28 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-24 bg-gray-200" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-40 bg-gray-100" /></td>
                      <td className="px-3 py-2.5"><div className="h-4 w-20 bg-gray-100" /></td>
                      <td className="py-2.5 pl-2 pr-4 text-right"><div className="ml-auto h-8 w-24 bg-gray-200" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 size={28} className="mb-2 text-primary-ink" />
                <p className="text-sm font-black uppercase text-black">
                  Không có phiếu bảo hành nào đang chờ tại quầy
                </p>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  Tất cả phiếu bảo hành được duyệt đã hoàn tất xử lý.
                </p>
              </div>
            ) : (
              <table className="w-full table-fixed border-collapse text-left text-sm text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                    <th className="w-[84px] py-2.5 pl-4 pr-2">Mã phiếu</th>
                    <th className="w-[180px] px-3 py-2.5">Khách hàng</th>
                    <th className="w-[175px] px-3 py-2.5">Thiết bị</th>
                    <th className="px-3 py-2.5">Mô tả sự cố</th>
                    <th className="w-[112px] px-3 py-2.5">Ngày tạo</th>
                    <th className="w-[216px] py-2.5 pl-2 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/15 bg-white">
                  {claims.map((claim) => {
                    const contact = [claim.customerPhone, claim.customerEmail].filter(Boolean).join(" · ") || "—";
                    return (
                      <tr key={claim.ticketId} className="transition-colors hover:bg-[#f3faf5]">
                        <td className="whitespace-nowrap py-2 pl-4 pr-2 font-mono text-xs font-black tabular-nums">
                          #{claim.ticketId}
                        </td>
                        <td className="px-3 py-2">
                          <p title={claim.customerName} className="truncate font-bold text-black">
                            {claim.customerName}
                          </p>
                          <p title={contact} className="truncate text-xs text-black/65">
                            {contact}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <p title={claim.deviceName} className="truncate pt-0.5 text-xs font-black uppercase leading-snug text-black">
                            {claim.deviceName}
                          </p>
                          <span
                            title={claim.deviceSerialNumber}
                            className="mt-0.5 inline-block max-w-full truncate border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-bold"
                          >
                            {claim.deviceSerialNumber}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p title={claim.issueDescription} className="truncate text-xs font-medium text-black">
                            {claim.issueDescription}
                          </p>
                          {claim.evidenceMediaUrls.length > 0 && (
                            <span className="mt-0.5 inline-flex items-center gap-1 border border-black bg-primary/25 px-1.5 py-0.5 text-[11px] font-black uppercase">
                              <Paperclip size={11} aria-hidden="true" />
                              {claim.evidenceMediaUrls.length} ảnh
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-black/65">
                          {new Date(claim.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="whitespace-nowrap py-2 pl-2 pr-4 text-right">
                          <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                            <HoverIconAction
                              label="Chi tiết"
                              ariaLabel={`Xem chi tiết phiếu bảo hành #${claim.ticketId}`}
                              tone="neutral"
                              maxWidthClass="group-hover/btn:max-w-[76px] group-focus-visible/btn:max-w-[76px]"
                              onClick={() => setDetailClaim(claim)}
                              icon={<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                            <HoverIconAction
                              label="Hoàn tất"
                              ariaLabel={`Xác nhận hoàn tất bảo hành phiếu #${claim.ticketId}`}
                              tone="approve"
                              maxWidthClass="group-hover/btn:max-w-[84px] group-focus-visible/btn:max-w-[84px]"
                              onClick={() => openActionModal(claim, "COMPLETE")}
                              icon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                            <HoverIconAction
                              label="Từ chối"
                              ariaLabel={`Từ chối bảo hành phiếu #${claim.ticketId}`}
                              tone="danger"
                              maxWidthClass="group-hover/btn:max-w-[72px] group-focus-visible/btn:max-w-[72px]"
                              onClick={() => openActionModal(claim, "REJECT")}
                              icon={<ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <ModalPaginationFooter
            page={page + 1}
            totalPages={totalPages}
            totalItems={totalElements}
            pageSize={modalPageSize}
            itemLabel="phiếu"
            onPageChange={(nextOneBased) => setPage(nextOneBased - 1)}
            manageHref="/staff/warranty"
            manageLabel="Mở trang Bảo hành"
            onClose={onClose}
            disabled={loading}
          />
        </div>
      </div>

      {/* Inline Warranty Detail Modal */}
      {detailClaim && !actionClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailClaim(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-warranty-detail-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-2xl flex-col border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-black p-4">
              <div className="flex items-center gap-2">
                <h2 id="staff-warranty-detail-title" className="font-mono text-lg font-black uppercase">
                  Phiếu #{detailClaim.ticketId}
                </h2>
                <span className="border border-black bg-[#e0f2fe] px-2 py-0.5 text-[10px] font-black uppercase">
                  Chờ tại quầy
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailClaim(null)}
                aria-label="Đóng chi tiết phiếu bảo hành"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-4 border-2 border-black bg-gray-50 p-3.5 sm:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase text-text-muted">
                    <User size={12} aria-hidden="true" />
                    Khách hàng
                  </h3>
                  <p className="mt-1 text-sm font-black text-black">{detailClaim.customerName}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-bold tabular-nums">
                    <Phone size={12} className="text-text-muted" aria-hidden="true" />
                    {detailClaim.customerPhone || "Chưa có SĐT"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
                    <Mail size={12} className="text-text-muted" aria-hidden="true" />
                    {detailClaim.customerEmail || "—"}
                  </p>
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase text-text-muted">
                    <Store size={12} aria-hidden="true" />
                    Thiết bị
                  </h3>
                  <p className="mt-1 text-sm font-black uppercase text-black">{detailClaim.deviceName}</p>
                  <p className="mt-1 inline-flex border border-black bg-white px-2 py-0.5 font-mono text-xs font-bold text-primary-ink">
                    Serial: {detailClaim.deviceSerialNumber}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-black">Mô tả sự cố</h3>
                <div className="mt-1 whitespace-pre-wrap border-2 border-black bg-white p-3 text-xs leading-relaxed text-black">
                  {detailClaim.issueDescription}
                </div>
              </div>

              {detailClaim.evidenceMediaUrls.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-black">
                    Hình ảnh bằng chứng ({detailClaim.evidenceMediaUrls.length})
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {detailClaim.evidenceMediaUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImage(url)}
                        aria-label={`Xem phóng to bằng chứng ${idx + 1}`}
                        className="h-16 w-16 cursor-pointer overflow-hidden border-2 border-black bg-gray-100 shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Bằng chứng ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t-2 border-black bg-[#f7fbf8] px-4 py-2.5">
              <button
                type="button"
                onClick={() => openActionModal(detailClaim, "REJECT")}
                className="btn-danger h-9 px-3.5 py-0 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => openActionModal(detailClaim, "COMPLETE")}
                className="btn-primary h-9 px-4 py-0 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                Hoàn tất tại quầy
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Inline Warranty Process Modal */}
      {actionClaim && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeActionModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-warranty-action-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-black p-4">
              <h2 id="staff-warranty-action-title" className="text-sm font-black uppercase text-black sm:text-base">
                {actionType === "COMPLETE"
                  ? "Xác nhận hoàn tất bảo hành"
                  : "Từ chối yêu cầu bảo hành"}
              </h2>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={isProcessing}
                aria-label="Đóng hộp thoại xử lý bảo hành"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-xs font-medium text-black">
                Phiếu <strong className="font-mono font-black">#{actionClaim.ticketId}</strong> —{" "}
                <strong className="font-black">{actionClaim.customerName}</strong> (
                <span className="font-mono font-bold">{actionClaim.deviceSerialNumber}</span>)
              </p>

              {actionError && (
                <div role="alert" className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-2.5 text-xs font-bold text-black">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label htmlFor="staff-warranty-notes" className="block text-xs font-black uppercase text-black">
                  {actionType === "COMPLETE"
                    ? "Ghi chú kết quả sửa chữa / bàn giao *"
                    : "Lý do từ chối bảo hành *"}
                </label>
                <textarea
                  id="staff-warranty-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder={
                    actionType === "COMPLETE"
                      ? "Mô tả linh kiện đã thay thế, kết quả kiểm tra và bàn giao..."
                      : "Nêu rõ nguyên nhân từ chối..."
                  }
                  className="mt-1.5 w-full border-2 border-black bg-gray-50 p-2.5 text-xs font-medium text-black focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 border-black bg-[#f7fbf8] px-4 py-2.5">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={isProcessing}
                className="btn-secondary h-9 px-3.5 py-0 text-xs font-black uppercase"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`inline-flex h-9 items-center gap-1.5 px-4 py-0 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] ${
                  actionType === "REJECT" ? "btn-danger" : "btn-primary"
                }`}
              >
                {isProcessing && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {actionType === "COMPLETE" ? "Xác nhận hoàn tất" : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Lightbox */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem phóng to ảnh bằng chứng"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] max-w-[90vw] flex-col border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <div className="flex items-center justify-between gap-4 border-b-2 border-black px-4 py-2.5">
              <span className="text-xs font-black uppercase text-black">Ảnh bằng chứng bảo hành</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                aria-label="Đóng xem ảnh"
                className="btn-secondary grid h-8 w-8 place-items-center p-0! shadow-[2px_2px_0_0_#000]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-auto bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage} alt="Ảnh phóng to" className="max-h-[75vh] max-w-[85vw] border-2 border-black object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
