"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { getCommissionQueue } from "@/features/commission/services/management-commission.api";
import { isRequestCancelled } from "@/features/commission/errors";
import { getManagementWarrantyClaims } from "@/lib/api/warranty";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Chờ đóng hàng",
  PARTIALLY_FULFILLED: "Đã cấp nhân vật và chờ đóng hàng",
  SHIPPING: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  COMPLETED: "Đã hoàn thành",
  DELIVERY_FAILED: "Vận chuyển thất bại",
  REFUNDED: "Đã hoàn tiền",
  CANCELED: "Đã hủy",
  PendingPayment: "Chờ thanh toán",
  Preparing: "Chờ đóng hàng",
  HandedOver: "Đã cấp nhân vật và chờ đóng hàng",
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

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

function StatCard({
  label,
  value,
  helper,
  badgeText,
  badgeClass,
  iconBoxClass,
  icon,
  href,
}: {
  label: string;
  value: number;
  helper: string;
  badgeText: string;
  badgeClass: string;
  iconBoxClass: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="neo-box group flex h-full flex-col justify-between bg-white p-4 transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center border-2 border-black shadow-[2px_2px_0_0_#000] ${iconBoxClass}`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase leading-snug tracking-wider text-black">
                {label}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-text-muted">{helper}</p>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${badgeClass}`}
          >
            {badgeText}
          </span>
        </div>

        <p className="mt-4 font-mono text-3xl font-black tracking-tight text-black tabular-nums">
          {value.toLocaleString("vi-VN")}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-gray-200 pt-2.5 text-xs font-bold text-black">
        <span>Xem danh sách xử lý</span>
        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { orders, isLoading: ordersLoading, refreshOrders } = useOrders();
  const [commissionStats, setCommissionStats] = useState({
    pendingReview: 0,
    unassigned: 0,
    internalReview: 0,
  });
  const [warrantyStats, setWarrantyStats] = useState({
    pending: 0,
    approved: 0,
  });
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
      const [commResults, warrantyPending, warrantyApproved] = await Promise.all([
        Promise.all(reqs),
        getManagementWarrantyClaims({ status: "PENDING", page: 0, size: 1 }),
        getManagementWarrantyClaims({ status: "APPROVED", page: 0, size: 1 }),
      ]);
      if (latestCountsReqRef.current !== token) return;
      setCommissionStats({
        pendingReview: commResults[0]?.meta?.totalElements ?? commResults[0]?.data.length ?? 0,
        unassigned: commResults[1]?.meta?.totalElements ?? commResults[1]?.data.length ?? 0,
        internalReview: commResults[2]?.meta?.totalElements ?? commResults[2]?.data.length ?? 0,
      });
      setWarrantyStats({
        pending: warrantyPending.totalElements,
        approved: warrantyApproved.totalElements,
      });
    } catch (failure) {
      if (latestCountsReqRef.current === token && !isRequestCancelled(failure)) {
        // Keep previous counts on transient network failure
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

  const days = getLastSevenDays();
  const pendingOrders = orders.filter(
    (order) =>
      order.status === "PROCESSING" ||
      order.status === "PARTIALLY_FULFILLED" ||
      order.status === "Pending" ||
      order.status === "Confirmed" ||
      order.status === "Preparing",
  ).length;
  const shippingOrders = orders.filter(
    (order) => order.status === "SHIPPING" || order.status === "Shipping",
  ).length;
  const commissionActionCount =
    commissionStats.pendingReview + commissionStats.unassigned + commissionStats.internalReview;

  const recentOrders = [...orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
  const orderCounts = days.map(
    (day) =>
      orders.filter((order) => {
        const created = new Date(order.createdAt);
        return (
          created.getFullYear() === day.getFullYear() &&
          created.getMonth() === day.getMonth() &&
          created.getDate() === day.getDate()
        );
      }).length,
  );
  const maxOrders = Math.max(1, ...orderCounts);
  const isRefreshing = ordersLoading || statsLoading;

  return (
    <div className="manager-neo-dashboard mx-auto flex w-full max-w-[1440px] flex-col gap-5 font-sans text-black">
      {/* Top Header Banner */}
      <header className="border-2 border-black border-l-8 border-l-primary bg-white p-5 shadow-[4px_4px_0_0_#000] sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                STAFF WORKSPACE
              </span>
              <span className="inline-flex items-center gap-1 border border-black bg-[#f7fbf8] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                <CalendarDays size={11} aria-hidden="true" /> 7 ngày gần nhất
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
              Xin chào, {user?.fullName || "Nhân viên"}!
            </h1>
            <p className="mt-0.5 text-xs font-medium text-text-muted sm:text-sm">
              Tổng quan vận hành đơn hàng, yêu cầu thiết kế nhân vật và phiếu bảo hành hằng ngày.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="btn-secondary inline-flex items-center gap-2 self-start px-3.5! py-2! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] sm:self-auto"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </header>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Đơn chờ xử lý"
          value={pendingOrders}
          helper="Cần gán thiết bị & đóng gói"
          badgeText={pendingOrders > 0 ? "Cần đóng hàng" : "Ổn định"}
          badgeClass={pendingOrders > 0 ? "bg-[#e0f2fe] text-black" : "bg-primary text-black"}
          iconBoxClass="bg-[#e0f2fe]"
          icon={<Package size={18} className="text-black" aria-hidden="true" />}
          href="/staff/orders"
        />
        <StatCard
          label="Đang vận chuyển"
          value={shippingOrders}
          helper="Đang trong luồng giao AhaMove"
          badgeText="Đang giao"
          badgeClass="bg-[#f7fbf8] text-black"
          iconBoxClass="bg-primary"
          icon={<Truck size={18} className="text-black" aria-hidden="true" />}
          href="/staff/orders"
        />
        <StatCard
          label="Commission cần xử lý"
          value={commissionActionCount}
          helper={`${commissionStats.pendingReview} duyệt · ${commissionStats.unassigned} phân công · ${commissionStats.internalReview} nháp`}
          badgeText={commissionActionCount > 0 ? "Cần xử lý" : "Hoàn tất"}
          badgeClass={commissionActionCount > 0 ? "bg-[#fef08a] text-black" : "bg-primary text-black"}
          iconBoxClass="bg-[#fef08a]"
          icon={<ClipboardList size={18} className="text-black" aria-hidden="true" />}
          href="/staff/commission"
        />
        <StatCard
          label="Bảo hành chờ duyệt"
          value={warrantyStats.pending}
          helper={`${warrantyStats.approved} phiếu chờ tại quầy`}
          badgeText={warrantyStats.pending > 0 ? "Ưu tiên" : "Ổn định"}
          badgeClass={warrantyStats.pending > 0 ? "bg-[#fed7aa] text-black" : "bg-primary text-black"}
          iconBoxClass="bg-[#fed7aa]"
          icon={<ShieldCheck size={18} className="text-black" aria-hidden="true" />}
          href="/staff/warranty"
        />
      </div>

      {/* Middle Row: 7-day Orders Chart + Action Queue */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.9fr)]">
        <section className="neo-box-no-hover flex flex-col justify-between bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary-ink" aria-hidden="true" />
                <h2 className="text-base font-black uppercase tracking-tight text-black">
                  Biểu đồ đơn hàng 7 ngày
                </h2>
              </div>
              <p className="mt-0.5 text-xs font-medium text-text-muted">
                Số lượng đơn phát sinh mỗi ngày trong 7 ngày gần nhất.
              </p>
            </div>
            <span className="border border-black bg-[#e9f5ed] px-2.5 py-1 font-mono text-xs font-black text-black shadow-[2px_2px_0_0_#000]">
              {orders.length} tổng đơn
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-3 border-b-2 border-black px-2 pb-1">
            {orderCounts.map((count, index) => (
              <div
                key={days[index].toISOString()}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="font-mono text-xs font-black text-black tabular-nums">
                  {count}
                </span>
                <div
                  className="w-full max-w-11 border-2 border-black bg-primary transition-colors hover:bg-primary-dark"
                  style={{ height: `${Math.max(count ? 14 : 4, (count / maxOrders) * 100)}%` }}
                />
                <span className="text-[11px] font-bold uppercase text-text-muted">
                  {days[index].toLocaleDateString("vi-VN", { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="neo-box-no-hover flex flex-col bg-white p-5">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <ClipboardList size={18} className="text-primary-ink" aria-hidden="true" />
            <h2 className="text-base font-black uppercase tracking-tight text-black">
              Việc cần làm
            </h2>
          </div>

          <div className="mt-3.5 flex flex-1 flex-col justify-between gap-2.5">
            <Link
              href="/staff/orders"
              className="flex items-center gap-3 border-2 border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase transition hover:-translate-y-0.5 hover:bg-[#eef8f0] hover:shadow-[2px_2px_0_0_#000]"
            >
              <ShoppingCart size={16} className="shrink-0 text-black" aria-hidden="true" />
              <span className="flex-1">Tiếp nhận &amp; đóng gói đơn hàng</span>
              <span className="border border-black bg-[#e0f2fe] px-2 py-0.5 font-mono text-xs font-black">
                {pendingOrders}
              </span>
            </Link>

            <Link
              href="/staff/commission"
              className="flex items-center gap-3 border-2 border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase transition hover:-translate-y-0.5 hover:bg-[#eef8f0] hover:shadow-[2px_2px_0_0_#000]"
            >
              <ClipboardList size={16} className="shrink-0 text-black" aria-hidden="true" />
              <span className="flex-1">Duyệt &amp; phân công Commission</span>
              <span className="border border-black bg-[#fef08a] px-2 py-0.5 font-mono text-xs font-black">
                {commissionActionCount}
              </span>
            </Link>

            <Link
              href="/staff/warranty"
              className="flex items-center gap-3 border-2 border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase transition hover:-translate-y-0.5 hover:bg-[#eef8f0] hover:shadow-[2px_2px_0_0_#000]"
            >
              <ShieldCheck size={16} className="shrink-0 text-black" aria-hidden="true" />
              <span className="flex-1">Thẩm định phiếu bảo hành</span>
              <span className="border border-black bg-[#fed7aa] px-2 py-0.5 font-mono text-xs font-black">
                {warrantyStats.pending}
              </span>
            </Link>

            <Link
              href="/staff/chat"
              className="flex items-center gap-3 border-2 border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase transition hover:-translate-y-0.5 hover:bg-[#eef8f0] hover:shadow-[2px_2px_0_0_#000]"
            >
              <Truck size={16} className="shrink-0 text-black" aria-hidden="true" />
              <span className="flex-1">Trao đổi khách hàng (Inbox)</span>
              <ArrowRight size={14} className="shrink-0 text-black" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* Recent Orders Table */}
      <section className="neo-box-no-hover overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#f7fbf8] px-5 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={17} className="text-primary-ink" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-black">
              Đơn hàng gần đây
            </h2>
          </div>
          <Link
            href="/staff/orders"
            className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink hover:underline"
          >
            Xem tất cả <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-left text-xs text-black">
              <thead>
                <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <th className="px-5 py-2.5">Mã đơn</th>
                  <th className="px-4 py-2.5">Khách hàng</th>
                  <th className="px-4 py-2.5 text-right">Tổng tiền</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-5 py-2.5 text-right">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 font-medium">
                {recentOrders.map((order: MockOrder) => (
                  <tr key={order.id} className="transition-colors hover:bg-[#f3faf5]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="inline-flex items-center border border-black bg-primary px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_0_#000] hover:bg-primary-dark"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-black">{order.customer.fullName}</p>
                      <p className="text-[11px] text-text-muted">{order.customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-black text-black tabular-nums">
                      {formatMoney(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${STATUS_CLASS[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs font-bold uppercase text-text-muted">
            <CheckCircle2 className="mx-auto mb-2 text-primary-ink" size={22} />
            Chưa có đơn hàng nào được ghi nhận.
          </div>
        )}
      </section>
    </div>
  );
}
