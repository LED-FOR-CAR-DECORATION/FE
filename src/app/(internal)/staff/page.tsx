"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  MessageSquare,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { getCommissionQueue } from "@/features/commission/services/management-commission.api";
import { isRequestCancelled } from "@/features/commission/errors";
import CommissionPagination from "@/features/commission/components/CommissionPagination";
import { getManagementWarrantyClaims } from "@/lib/api/warranty";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";
import {
  HoverIconAction,
  StaffCommissionTodoModal,
  StaffPendingOrdersModal,
  StaffWarrantyTodoModal,
  type ModalSortMode,
} from "@/features/staff/components/StaffTodoModals";

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
  PENDING_PAYMENT: "border-black bg-[#fef08a] text-black",
  PROCESSING: "border-black bg-[#e0f2fe] text-black",
  PARTIALLY_FULFILLED: "border-black bg-[#ede9fe] text-black",
  SHIPPING: "border-black bg-[#e0f2fe] text-black",
  DELIVERED: "border-black bg-primary/40 text-black",
  COMPLETED: "border-black bg-primary/25 text-primary-ink",
  DELIVERY_FAILED: "border-amber-700 bg-[#fed7aa] text-black",
  REFUNDED: "border-black bg-gray-200 text-black",
  CANCELED: "border-red-600 bg-red-50 text-red-700",
  PendingPayment: "border-black bg-[#fef08a] text-black",
  Preparing: "border-black bg-[#e0f2fe] text-black",
  HandedOver: "border-black bg-[#ede9fe] text-black",
  Shipping: "border-black bg-[#e0f2fe] text-black",
  Delivered: "border-black bg-primary/40 text-black",
  Completed: "border-black bg-primary/25 text-primary-ink",
  Cancelled: "border-red-600 bg-red-50 text-red-700",
  Pending: "border-black bg-[#fef08a] text-black",
  Confirmed: "border-black bg-[#e0f2fe] text-black",
};

const PENDING_ORDER_PRIORITY: Record<string, number> = {
  DELIVERY_FAILED: 1,
  PROCESSING: 2,
  Confirmed: 2,
  Preparing: 2,
  PARTIALLY_FULFILLED: 3,
  HandedOver: 3,
};

type ActiveStaffTodoModal = "orders" | "commissions" | "warranty" | null;

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StaffDashboard() {
  const { orders, isLoading: ordersLoading, refreshOrders } = useOrders();
  const { rows: pageSize } = useAdaptiveListRows({
    estimatedRowHeight: 58,
    rowGap: 0,
    chromeHeight: 416,
    minRows: 3,
    maxRows: 12,
    defaultRows: 6,
  });

  const [page, setPage] = useState(1);
  const [activeTodoModal, setActiveTodoModal] = useState<ActiveStaffTodoModal>(null);
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

  const handleRefreshAll = () => {
    void refreshOrders();
    void loadOperationalCounts();
  };

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
      return ta - tb;
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

  const isRefreshing = ordersLoading || statsLoading;

  return (
    <div className="manager-neo-dashboard flex min-h-[calc(100dvh-114px)] flex-col gap-3 font-sans xl:h-[calc(100dvh-114px)]">
      {/* 1. Workspace Header (Aligned with /staff/commission standard) */}
      <header className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-widest text-primary-ink">
            Staff Workspace
          </p>
          <h1 className="mt-0.5 pt-0.5 text-xl font-black uppercase leading-tight tracking-tight text-black sm:text-2xl">
            Tổng quan Nhân viên
          </h1>
          <p className="mt-0.5 text-xs text-black/75 sm:text-sm">
            Theo dõi việc cần làm, tiếp nhận đóng gói đơn hàng, xử lý yêu cầu thiết kế và bảo hành tại quầy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/staff/orders"
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
            Quản lý đơn ({sortedRecentOrders.length})
          </Link>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </header>

      {/* 2. Việc cần làm (4 Action Cards opening inline Modals / Inbox) */}
      <section aria-label="Việc cần làm" className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTodoModal("orders")}
          className="neo-box group flex cursor-pointer items-center gap-3 bg-white p-3 text-left transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#e0f2fe] text-black shadow-[2px_2px_0_0_#000]">
            <Package size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate pt-0.5 text-xs font-black uppercase leading-normal text-black group-hover:underline">
              Tiếp nhận &amp; đóng gói đơn
            </span>
            <span className="block truncate text-[11px] font-medium leading-snug text-black/65">
              Bấm để mở danh sách xử lý
            </span>
          </span>
          <span className="shrink-0 border-2 border-black bg-[#e0f2fe] px-2 py-0.5 font-mono text-xs font-black text-black">
            {pendingQueueOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTodoModal("commissions")}
          className="neo-box group flex cursor-pointer items-center gap-3 bg-white p-3 text-left transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#fef08a] text-black shadow-[2px_2px_0_0_#000]">
            <ClipboardList size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate pt-0.5 text-xs font-black uppercase leading-normal text-black group-hover:underline">
              Yêu cầu thiết kế
            </span>
            <span className="block truncate text-[11px] font-medium leading-snug text-black/65">
              Chờ duyệt, gán họa sĩ, nháp
            </span>
          </span>
          <span className="shrink-0 border-2 border-black bg-[#fef08a] px-2 py-0.5 font-mono text-xs font-black text-black">
            {commissionActionCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTodoModal("warranty")}
          className="neo-box group flex cursor-pointer items-center gap-3 bg-white p-3 text-left transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#fed7aa] text-black shadow-[2px_2px_0_0_#000]">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate pt-0.5 text-xs font-black uppercase leading-normal text-black group-hover:underline">
              Xử lý bảo hành tại quầy
            </span>
            <span className="block truncate text-[11px] font-medium leading-snug text-black/65">
              Phiếu đang chờ tại quầy
            </span>
          </span>
          <span className="shrink-0 border-2 border-black bg-[#fed7aa] px-2 py-0.5 font-mono text-xs font-black text-black">
            {pendingWarrantyCount}
          </span>
        </button>

        <Link
          href="/staff/chat"
          className="neo-box group flex items-center gap-3 bg-white p-3 transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
            <MessageSquare size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate pt-0.5 text-xs font-black uppercase leading-normal text-black group-hover:underline">
              Trao đổi khách hàng (Inbox)
            </span>
            <span className="block truncate text-[11px] font-medium leading-snug text-black/65">
              Mở phòng chat commission
            </span>
          </span>
          <ArrowRight
            size={16}
            className="shrink-0 text-black transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </section>

      {/* 3. Đơn hàng gần đây (Matches /staff/commission table box) */}
      <section
        aria-label="Đơn hàng gần đây"
        className="neo-box-no-hover flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-black bg-[#f7fbf8] px-3.5 py-2">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-primary-ink" aria-hidden="true" />
            <h2 className="pt-0.5 text-xs font-black uppercase leading-normal tracking-wider text-black">
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
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-[#f7fbf8] text-xs font-black uppercase tracking-wider text-black">
                <th className="w-[100px] px-3.5 py-2.5">Mã đơn</th>
                <th className="px-3.5 py-2.5">Khách hàng</th>
                <th className="w-[160px] px-3.5 py-2.5 text-right">Tổng tiền</th>
                <th className="w-[220px] px-3.5 py-2.5">Trạng thái</th>
                <th className="w-[165px] px-3.5 py-2.5">Ngày tạo</th>
                <th className="w-[128px] px-3 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/15">
              {ordersLoading && orders.length === 0 ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="px-3.5 py-2.5">
                      <div className="h-4 w-14 bg-gray-200" />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="h-3.5 w-32 bg-gray-200" />
                      <div className="mt-1.5 h-3 w-40 bg-gray-100" />
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="ml-auto h-4 w-24 bg-gray-200" />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="h-5 w-28 bg-gray-200" />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="h-3.5 w-28 bg-gray-100" />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="ml-auto h-8 w-10 bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-black/60">
                    <CheckCircle2 className="mx-auto mb-2 text-primary-ink" size={22} />
                    Chưa có đơn hàng nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order: MockOrder) => (
                  <tr key={order.id} className="transition-colors hover:bg-[#f3faf5]">
                    <td className="whitespace-nowrap px-3.5 py-2 align-middle">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="font-mono text-xs font-black text-black hover:underline"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2 align-middle">
                      <p title={order.customer.fullName} className="truncate font-bold text-black">
                        {order.customer.fullName}
                      </p>
                      <p title={order.customer.email} className="truncate text-xs text-black/65">
                        {order.customer.email}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right align-middle font-mono text-sm font-black text-primary-ink tabular-nums">
                      {formatMoney(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 align-middle">
                      <span
                        title={STATUS_LABEL[order.status]}
                        className={`inline-flex max-w-full truncate border-2 px-2 py-0.5 text-xs font-black leading-normal ${STATUS_CLASS[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 align-middle font-mono text-xs font-semibold text-black/65">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-middle">
                      <HoverIconAction
                        href={`/staff/orders/${order.id}`}
                        label="Chi tiết"
                        ariaLabel={`Xem chi tiết đơn hàng #${order.id}`}
                        tone="primary"
                        icon={<Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Detached Bottom Pagination (Exact /staff/commission style) */}
      <CommissionPagination
        page={safePage - 1}
        size={pageSize}
        totalElements={sortedRecentOrders.length}
        totalPages={totalPages}
        onPageChange={(nextZeroBased) => setPage(nextZeroBased + 1)}
        ariaLabel="Phân trang đơn hàng gần đây"
        disabled={ordersLoading && orders.length === 0}
        className="mt-auto shrink-0"
      />

      {activeTodoModal === "orders" && (
        <StaffPendingOrdersModal
          orders={pendingQueueOrders}
          sortMode={modalSortMode}
          onToggleSort={() =>
            setModalSortMode((prev) => (prev === "PRIORITY_FIFO" ? "NEWEST" : "PRIORITY_FIFO"))
          }
          onClose={() => setActiveTodoModal(null)}
          statusLabel={STATUS_LABEL}
          statusClass={STATUS_CLASS}
          formatMoney={formatMoney}
          formatDateTime={formatDateTime}
        />
      )}

      {activeTodoModal === "commissions" && (
        <StaffCommissionTodoModal
          onClose={() => setActiveTodoModal(null)}
          onMutated={() => {
            void loadOperationalCounts();
          }}
        />
      )}

      {activeTodoModal === "warranty" && (
        <StaffWarrantyTodoModal
          onClose={() => setActiveTodoModal(null)}
          onMutated={() => {
            void loadOperationalCounts();
          }}
        />
      )}
    </div>
  );
}
