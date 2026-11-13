"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Eye, Search, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { MockOrder, OrderStatus } from "@/features/order/types";

type DisplayStatus = OrderStatus | "Paid";
type FilterStatus = DisplayStatus | "All";

const STATUS_CONFIG: Record<DisplayStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700", icon: <Circle size={12} /> },
  PROCESSING: { label: "Chờ đóng hàng", className: "bg-blue-50 text-blue-700", icon: <CheckCircle2 size={12} /> },
  PARTIALLY_FULFILLED: { label: "Đã cấp nhân vật và chờ đóng hàng", className: "bg-purple-50 text-purple-700", icon: <Truck size={12} /> },
  SHIPPING: { label: "Đang vận chuyển", className: "bg-cyan-50 text-cyan-700", icon: <Truck size={12} /> },
  DELIVERED: { label: "Đã giao", className: "bg-teal-50 text-teal-700", icon: <CheckCircle2 size={12} /> },
  COMPLETED: { label: "Đã hoàn thành", className: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={12} /> },
  DELIVERY_FAILED: { label: "Vận chuyển thất bại", className: "bg-orange-50 text-orange-700", icon: <X size={12} /> },
  REFUNDED: { label: "Đã hoàn tiền", className: "bg-gray-50 text-gray-700", icon: <Circle size={12} /> },
  CANCELED: { label: "Đã hủy", className: "bg-red-50 text-red-700", icon: <X size={12} /> },
  Paid: { label: "Đã thanh toán", className: "bg-[#e3f2e9] text-[#155e59]", icon: <CheckCircle2 size={12} /> },
  // Aliases for compatibility
  PendingPayment: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700", icon: <Circle size={12} /> },
  Preparing: { label: "Chờ đóng hàng", className: "bg-blue-50 text-blue-700", icon: <CheckCircle2 size={12} /> },
  HandedOver: { label: "Đã cấp nhân vật và chờ đóng hàng", className: "bg-purple-50 text-purple-700", icon: <Truck size={12} /> },
  Shipping: { label: "Đang vận chuyển", className: "bg-cyan-50 text-cyan-700", icon: <Truck size={12} /> },
  Delivered: { label: "Đã giao", className: "bg-teal-50 text-teal-700", icon: <CheckCircle2 size={12} /> },
  Completed: { label: "Đã hoàn thành", className: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={12} /> },
  Cancelled: { label: "Đã hủy", className: "bg-red-50 text-red-700", icon: <X size={12} /> },
  Pending: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700", icon: <Circle size={12} /> },
  Confirmed: { label: "Chờ đóng hàng", className: "bg-blue-50 text-blue-700", icon: <CheckCircle2 size={12} /> },
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export default function OrdersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("All");

  const displayStatus = (order: MockOrder): DisplayStatus =>
    isCharacterOnlyOrder(order) && order.paymentStatus === "Paid" ? "Paid" : order.status;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        const matchesSearch =
          !query ||
          [order.id, order.customer.fullName, order.customer.email].some((value) =>
            value.toLowerCase().includes(query)
          );
        return matchesSearch && (status === "All" || displayStatus(order) === status);
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [orders, search, status]);

  const filterItems: FilterStatus[] = [
    "All",
    "PENDING_PAYMENT",
    "PROCESSING",
    "PARTIALLY_FULFILLED",
    "SHIPPING",
    "DELIVERED",
    "COMPLETED",
    "DELIVERY_FAILED",
    "REFUNDED",
    "CANCELED",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      {/* Page Title */}
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#155e59]">Vận hành cửa hàng</p>
        <h1 className="mt-1 text-3xl font-black text-[#26352f]">Quản lý đơn hàng</h1>
        <p className="mt-1 text-sm text-[#66736b]">Theo dõi trạng thái, thanh toán và thông tin giao hàng của khách.</p>
      </div>

      {/* Horizontal Status Bar (Thanh ngang các trạng thái) */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[#e2e4db] bg-white p-2 shadow-sm no-scrollbar">
        {filterItems.map((item) => {
          const count =
            item === "All"
              ? orders.length
              : orders.filter((order) => displayStatus(order) === item).length;
          const isActive = status === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#155e59] text-white shadow-sm"
                  : "text-[#66736b] hover:bg-[#f0f4f1] hover:text-[#26352f]"
              }`}
            >
              <span>{item === "All" ? "Tất cả" : STATUS_CONFIG[item].label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-[#66736b]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar (Đã xóa Dropdown filter theo yêu cầu) */}
      <div className="flex items-center gap-3 rounded-xl border border-[#e2e4db] bg-white p-3.5 shadow-sm">
        <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-[#e2e4db] px-3.5 focus-within:border-[#155e59]">
          <Search size={16} className="text-[#66736b]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo mã đơn, tên hoặc email khách hàng..."
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {(search || status !== "All") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("All");
            }}
            className="whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold text-[#155e59] hover:bg-[#e3f2e9]"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e4db] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-[#e2e4db] bg-[#f8f7ef]">
              <tr>
                {["Mã đơn", "Khách hàng", "Hàng hóa", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày tạo", ""].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#66736b]"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const currentStatus = displayStatus(order);
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[#f0f2ed] last:border-0 hover:bg-[#f8f7ef]"
                  >
                    <td className="px-4 py-4 font-black text-[#155e59]">#{order.id}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#26352f]">{order.customer.fullName}</p>
                      <p className="text-xs text-[#66736b]">{order.customer.email}</p>
                    </td>
                    <td className="max-w-[230px] px-4 py-4 text-xs text-[#66736b]">
                      {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-4 font-black text-[#26352f]">{formatMoney(order.total)}</td>
                    <td className="px-4 py-4 text-xs text-[#66736b]">
                      {order.paymentMethod}
                      <br />
                      <span
                        className={
                          order.paymentStatus === "Paid"
                            ? "font-bold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CONFIG[currentStatus].className}`}
                      >
                        {STATUS_CONFIG[currentStatus].icon}
                        {STATUS_CONFIG[currentStatus].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-[#66736b]">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e2e4db] px-2.5 py-1.5 text-xs font-bold text-[#155e59] hover:border-[#8fc7a0] hover:bg-[#e3f2e9]"
                      >
                        <Eye size={13} /> Chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Search size={24} className="mx-auto mb-2 text-[#8fc7a0]" />
                    <p className="font-semibold text-[#66736b]">Không tìm thấy đơn hàng phù hợp.</p>
                    <p className="mt-1 text-xs text-[#66736b]">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
