"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  MessageSquare,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { getCommissionQueue } from "@/features/commission/services/management-commission.api";
import { isRequestCancelled } from "@/features/commission/errors";
import { getManagementWarrantyClaims } from "@/lib/api/warranty";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Chờ đóng hàng",
  PARTIALLY_FULFILLED: "Đã cấp nhân vật & chờ đóng hàng",
  SHIPPING: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  COMPLETED: "Đã hoàn thành",
  DELIVERY_FAILED: "Vận chuyển thất bại",
  REFUNDED: "Đã hoàn tiền",
  CANCELED: "Đã hủy",
  PendingPayment: "Chờ thanh toán",
  Preparing: "Chờ đóng hàng",
  HandedOver: "Đã cấp nhân vật & chờ đóng hàng",
  Shipping: "Đang vận chuyển",
  Delivered: "Đã giao",
  Completed: "Đã hoàn thành",
  Cancelled: "Đã hủy",
  Pending: "Chờ thanh toán",
  Confirmed: "Chờ đóng hàng",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-[#fef08a] text-black",
  PROCESSING: "bg-[#e0f2fe] text-black",
  PARTIALLY_FULFILLED: "bg-[#ede9fe] text-black",
  SHIPPING: "bg-[#e0f2fe] text-black",
  DELIVERED: "bg-primary/40 text-black",
  COMPLETED: "bg-primary text-black",
  DELIVERY_FAILED: "bg-[#fed7aa] text-black",
  REFUNDED: "bg-gray-200 text-black",
  CANCELED: "bg-[#fecaca] text-black",
  PendingPayment: "bg-[#fef08a] text-black",
  Preparing: "bg-[#e0f2fe] text-black",
  HandedOver: "bg-[#ede9fe] text-black",
  Shipping: "bg-[#e0f2fe] text-black",
  Delivered: "bg-primary/40 text-black",
  Completed: "bg-primary text-black",
  Cancelled: "bg-[#fecaca] text-black",
  Pending: "bg-[#fef08a] text-black",
  Confirmed: "bg-[#e0f2fe] text-black",
};

const PENDING_ORDER_PRIORITY: Record<string, number> = {
  DELIVERY_FAILED: 1,
  PROCESSING: 2,
  Confirmed: 2,
  Preparing: 2,
  PARTIALLY_FULFILLED: 3,
  HandedOver: 3,
};

type ModalSortMode = "PRIORITY_FIFO" | "NEWEST";

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StaffDashboard() {
  const { orders, isLoading: ordersLoading, refreshOrders } = useOrders();
  const { rows: pageSize } = useAdaptiveListRows({
    estimatedRowHeight: 58,
    rowGap: 0,
    chromeHeight: 376,
    minRows: 3,
    maxRows: 12,
    defaultRows: 7,
  });

  const [page, setPage] = useState(1);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [modalSortMode, setModalSortMode] = useState<ModalSortMode>("PRIORITY_FIFO");

  const [commissionActionCount, setCommissionActionCount] = useState(0);
  const [pendingWarrantyCount, setPendingWarrantyCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const latestCountsReqRef = useRef<symbol | null>(null);

  const loadOperationalCounts = useCallback(async () => {
    const token = Symbol();
    latestCountsReqRef.current = token;
    setStatsLoading(true);
    const reqs = [
      getCommissionQueue({ page: 0, size: 1, status: "PENDING_REVIEW" }),
      getCommissionQueue({ page: 0, size: 1, status: "PAID" }),
      getCommissionQueue({ page: 0, size: 1, status: "INTERNAL_REVIEW" }),
    ];
    try {
      const [commResults, warrantyPending] = await Promise.all([
        Promise.all(reqs),
        getManagementWarrantyClaims({ status: "APPROVED", page: 0, size: 1 }),
      ]);
      if (latestCountsReqRef.current !== token) return;
      const totalComm =
        (commResults[0]?.meta?.totalElements ?? commResults[0]?.data.length ?? 0) +
        (commResults[1]?.meta?.totalElements ?? commResults[1]?.data.length ?? 0) +
        (commResults[2]?.meta?.totalElements ?? commResults[2]?.data.length ?? 0);
      setCommissionActionCount(totalComm);
      setPendingWarrantyCount(warrantyPending.totalElements);
    } catch (failure) {
      if (latestCountsReqRef.current === token && !isRequestCancelled(failure)) {
        // Keep previous counts on transient failure
      }
    } finally {
      if (latestCountsReqRef.current === token) {
        setStatsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOperationalCounts();
    return () => {
      latestCountsReqRef.current = null;
    };
  }, [loadOperationalCounts]);

  useEffect(() => {
    if (!showPendingModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPendingModal(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showPendingModal]);

  const handleRefreshAll = () => {
    void refreshOrders();
    void loadOperationalCounts();
  };

  // Pre-sorted pending orders for the "Tiếp nhận & đóng gói đơn hàng" modal
  const pendingQueueOrders = useMemo(() => {
    const actionable = orders.filter((order) => PENDING_ORDER_PRIORITY[order.status] !== undefined);
    return [...actionable].sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      if (modalSortMode === "NEWEST") {
        return tb - ta;
      }
      const pa = PENDING_ORDER_PRIORITY[a.status] ?? 99;
      const pb = PENDING_ORDER_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return ta - tb; // FIFO within the same priority tier
    });
  }, [orders, modalSortMode]);

  const sortedRecentOrders = useMemo(
    () => [...orders].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    [orders],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRecentOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedOrders = useMemo(
    () => sortedRecentOrders.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRecentOrders, safePage, pageSize],
  );

  const rangeStart = sortedRecentOrders.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd =
    sortedRecentOrders.length === 0
      ? 0
      : Math.min(sortedRecentOrders.length, safePage * pageSize);

  const isRefreshing = ordersLoading || statsLoading;

  return (
    <div className="manager-neo-dashboard mx-auto flex min-h-[calc(100dvh-114px)] w-full max-w-[1440px] flex-col gap-3 font-sans text-black xl:h-[calc(100dvh-114px)]">
      {/* 1. Việc cần làm (Compact 4-card Top Action Strip replacing Banner + KPI + Chart) */}
      <section aria-label="Việc cần làm" className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={17} className="text-primary-ink" aria-hidden="true" />
            <h1 className="text-xs font-black uppercase tracking-wider text-black sm:text-sm">
              Việc cần làm (Staff)
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="btn-secondary inline-flex items-center gap-1.5 px-3! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000] disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
            Làm mới
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setShowPendingModal(true)}
            className="neo-box group flex cursor-pointer items-center gap-3 bg-white p-3 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#e0f2fe] text-black shadow-[2px_2px_0_0_#000]">
              <Package size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black uppercase text-black group-hover:underline">
                Tiếp nhận &amp; đóng gói đơn
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted">
                Bấm để mở danh sách ưu tiên
              </span>
            </span>
            <span className="shrink-0 border-2 border-black bg-[#e0f2fe] px-2 py-0.5 font-mono text-xs font-black text-black">
              {pendingQueueOrders.length}
            </span>
          </button>

          <Link
            href="/staff/commission"
            className="neo-box group flex items-center gap-3 bg-white p-3 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#fef08a] text-black shadow-[2px_2px_0_0_#000]">
              <ClipboardList size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black uppercase text-black group-hover:underline">
                Duyệt &amp; phân công Commission
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted">
                Chờ duyệt, gán họa sĩ, nháp
              </span>
            </span>
            <span className="shrink-0 border-2 border-black bg-[#fef08a] px-2 py-0.5 font-mono text-xs font-black text-black">
              {commissionActionCount}
            </span>
          </Link>

          <Link
            href="/staff/warranty"
            className="neo-box group flex items-center gap-3 bg-white p-3 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#fed7aa] text-black shadow-[2px_2px_0_0_#000]">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black uppercase text-black group-hover:underline">
                Xử lý bảo hành tại quầy
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted">
                Phiếu đang chờ tại quầy
              </span>
            </span>
            <span className="shrink-0 border-2 border-black bg-[#fed7aa] px-2 py-0.5 font-mono text-xs font-black text-black">
              {pendingWarrantyCount}
            </span>
          </Link>

          <Link
            href="/staff/chat"
            className="neo-box group flex items-center gap-3 bg-white p-3 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
              <MessageSquare size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black uppercase text-black group-hover:underline">
                Trao đổi khách hàng (Inbox)
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted">
                Mở phòng chat commission
              </span>
            </span>
            <ArrowRight
              size={16}
              className="shrink-0 text-black transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* 2. Đơn hàng gần đây (Viewport-fitted /paging table with bottom-pinned Trước / Sau) */}
      <section
        aria-label="Đơn hàng gần đây"
        className="neo-box-no-hover flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-black bg-[#f7fbf8] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary-ink" aria-hidden="true" />
            <h2 className="text-xs font-black uppercase tracking-wider text-black sm:text-sm">
              Đơn hàng gần đây
            </h2>
          </div>
          <Link
            href="/staff/orders"
            className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink hover:underline"
          >
            Xem tất cả ({sortedRecentOrders.length}) <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                <th className="w-[96px] py-2.5 pl-4 pr-3">Mã đơn</th>
                <th className="px-4 py-2.5">Khách hàng</th>
                <th className="w-[140px] px-4 py-2.5 text-right">Tổng tiền</th>
                <th className="w-[190px] px-4 py-2.5">Trạng thái</th>
                <th className="w-[124px] px-4 py-2.5">Ngày tạo</th>
                <th className="w-[128px] py-2.5 pl-3 pr-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 bg-white font-medium">
              {ordersLoading && orders.length === 0 ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="h-5 w-14 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-28 bg-gray-200" />
                      <div className="mt-1 h-3 w-36 bg-gray-100" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="ml-auto h-4 w-24 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-5 w-24 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-20 bg-gray-100" />
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right">
                      <div className="ml-auto h-7 w-10 bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold uppercase text-text-muted">
                    <CheckCircle2 className="mx-auto mb-2 text-primary-ink" size={22} />
                    Chưa có đơn hàng nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order: MockOrder) => (
                  <tr key={order.id} className="group transition-colors hover:bg-[#f3faf5]">
                    <td className="whitespace-nowrap py-2.5 pl-4 pr-3">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="inline-flex items-center border border-black bg-primary px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_0_#000] hover:bg-primary-dark"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-black">{order.customer.fullName}</p>
                      <p className="text-[11px] text-text-muted">{order.customer.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm font-black text-black tabular-nums">
                      {formatMoney(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`inline-flex border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${STATUS_CLASS[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-semibold text-text-muted">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-3 pr-4 text-right">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        aria-label={`Xem chi tiết đơn hàng #${order.id}`}
                        title="Chi tiết"
                        className="group/btn inline-flex h-8 items-center border-2 border-black bg-white px-2 text-xs font-black uppercase text-black transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 motion-reduce:transition-none group-hover/btn:ml-1.5 group-hover/btn:max-w-[96px] group-hover/btn:opacity-100 group-focus-visible/btn:ml-1.5 group-focus-visible/btn:max-w-[96px] group-focus-visible/btn:opacity-100">
                          Chi tiết
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom-pinned /paging footer */}
        <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-4 py-2 text-xs">
          <span className="font-bold text-black">
            {sortedRecentOrders.length > 0 && (
              <>
                <strong className="font-mono">
                  {rangeStart}–{rangeEnd}
                </strong>{" "}
                / {sortedRecentOrders.length} ·{" "}
              </>
            )}
            Trang <strong className="font-mono">{safePage}</strong> / {totalPages}
          </span>

          <nav aria-label="Phân trang đơn hàng gần đây" className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Trước
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-secondary inline-flex items-center gap-1 px-3! py-1! text-xs font-black uppercase disabled:opacity-40"
            >
              Sau
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>
      </section>

      {/* Modal: Pre-sorted Orders Waiting for Intake & Packing */}
      {showPendingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPendingModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-orders-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black bg-[#f7fbf8] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-[#e0f2fe] text-black shadow-[2px_2px_0_0_#000]">
                  <Package size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="pending-orders-modal-title"
                    className="text-sm font-black uppercase tracking-wide text-black sm:text-base"
                  >
                    Đơn hàng cần tiếp nhận &amp; đóng gói ({pendingQueueOrders.length})
                  </h2>
                  <p className="text-[11px] font-medium text-text-muted">
                    {modalSortMode === "PRIORITY_FIFO"
                      ? "Đang xếp theo ưu tiên: Giao thất bại → Chờ đóng hàng → Đã cấp NV (đơn tạo lâu nhất lên trước)"
                      : "Đang xếp theo thời gian tạo mới nhất lên trước"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setModalSortMode((prev) =>
                      prev === "PRIORITY_FIFO" ? "NEWEST" : "PRIORITY_FIFO",
                    )
                  }
                  className="btn-secondary inline-flex items-center gap-1.5 px-3! py-1.5! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  <ArrowDownUp size={13} aria-hidden="true" />
                  {modalSortMode === "PRIORITY_FIFO" ? "Ưu tiên + Đơn cũ" : "Mới nhất trước"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  aria-label="Đóng danh sách đơn cần xử lý"
                  className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pendingQueueOrders.length === 0 ? (
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
                <table className="w-full min-w-[680px] border-collapse text-left text-xs text-black">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                      <th className="py-2.5 pl-5 pr-3">Mã đơn</th>
                      <th className="px-3 py-2.5">Khách hàng</th>
                      <th className="px-3 py-2.5">Sản phẩm</th>
                      <th className="px-3 py-2.5 text-right">Tổng tiền</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Ngày tạo</th>
                      <th className="py-2.5 pl-3 pr-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 bg-white">
                    {pendingQueueOrders.map((order) => {
                      const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                      const firstItemName = order.items[0]?.name;
                      return (
                        <tr key={order.id} className="transition-colors hover:bg-[#f3faf5]">
                          <td className="whitespace-nowrap py-2.5 pl-5 pr-3">
                            <span className="inline-flex border border-black bg-primary px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_0_#000]">
                              #{order.id}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-black">{order.customer.fullName}</p>
                            <p className="text-[11px] text-text-muted">{order.customer.email}</p>
                          </td>
                          <td className="max-w-[200px] px-3 py-2.5">
                            <p className="truncate font-bold text-black">
                              {firstItemName || `${order.items.length} mặt hàng`}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              Tổng SL: ×{itemCount}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs font-black text-black tabular-nums">
                            {formatMoney(order.total)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className={`inline-flex border border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000] ${STATUS_CLASS[order.status]}`}
                            >
                              {STATUS_LABEL[order.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold text-text-muted">
                            {formatDateTime(order.createdAt)}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right">
                            <Link
                              href={`/staff/orders/${order.id}`}
                              className="btn-primary inline-flex items-center gap-1 px-2.5! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                            >
                              Xử lý <ArrowRight size={12} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <footer className="flex items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-5 py-2.5 text-xs">
              <span className="font-bold text-text-muted">
                Tổng <strong className="font-mono text-black">{pendingQueueOrders.length}</strong> đơn hàng cần xử lý
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/staff/orders"
                  className="btn-secondary inline-flex items-center gap-1 px-3! py-1.5! text-[11px] font-black uppercase"
                >
                  Mở trang Quản lý đơn
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="btn-secondary px-3! py-1.5! text-[11px] font-black uppercase"
                >
                  Đóng
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
