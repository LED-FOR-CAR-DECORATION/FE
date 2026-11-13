"use client";

import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import { MockOrder, OrderStatus } from "@/features/order/types";
import { Eye, Package, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type DisplayStatus = OrderStatus | "Paid";

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; badgeClass: string }
> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  PROCESSING: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  PARTIALLY_FULFILLED: {
    label: "Đã cấp nhân vật và chờ đóng hàng",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  SHIPPING: {
    label: "Đang vận chuyển",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  DELIVERED: {
    label: "Đã giao",
    badgeClass: "bg-green-100 text-green-800",
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    badgeClass: "bg-green-100 text-green-800",
  },
  DELIVERY_FAILED: {
    label: "Vận chuyển thất bại",
    badgeClass: "bg-red-100 text-red-800",
  },
  REFUNDED: {
    label: "Đã hoàn tiền",
    badgeClass: "bg-gray-100 text-gray-800",
  },
  CANCELED: {
    label: "Đã hủy",
    badgeClass: "bg-red-100 text-red-800",
  },

  // Legacy aliases for backward compatibility
  PendingPayment: {
    label: "Chờ thanh toán",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  Pending: {
    label: "Chờ thanh toán",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  Confirmed: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  Preparing: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  HandedOver: {
    label: "Đang vận chuyển",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  Shipping: {
    label: "Đang vận chuyển",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  Delivered: {
    label: "Đã giao",
    badgeClass: "bg-green-100 text-green-800",
  },
  Completed: {
    label: "Đã hoàn thành",
    badgeClass: "bg-green-100 text-green-800",
  },
  Cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-red-100 text-red-800",
  },
  Paid: {
    label: "Đã thanh toán",
    badgeClass: "bg-green-100 text-green-800",
  },
};

function getDisplayStatus(order: MockOrder): DisplayStatus {
  if (isCharacterOnlyOrder(order) && order.paymentStatus === "Paid") {
    return "Paid";
  }
  return order.status;
}

function getTabBadgeClass(
  item: OrderStatus | "All",
  count: number,
  active: boolean
): string {
  if (count > 0) {
    if (item === "DELIVERY_FAILED") {
      return "bg-red-100 text-red-700";
    }
    if (
      item === "PENDING_PAYMENT" ||
      item === "PROCESSING" ||
      item === "SHIPPING"
    ) {
      return "bg-orange-100 text-orange-700";
    }
  }
  if (active) {
    return "bg-[#155e59]/10 text-[#155e59]";
  }
  return "bg-gray-100 text-gray-600";
}

export default function StaffOrdersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (q) {
        const hit =
          o.id.toLowerCase().includes(q) ||
          o.customer.fullName.toLowerCase().includes(q) ||
          o.customer.email.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: orders.length };
    for (const o of orders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return map;
  }, [orders]);

  const filterItems: Array<OrderStatus | "All"> = [
    "All",
    "PENDING_PAYMENT",
    "PROCESSING",
    "SHIPPING",
    "DELIVERED",
    "COMPLETED",
    "DELIVERY_FAILED",
    "REFUNDED",
    "CANCELED",
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-[#155e59]">
          Vận hành cửa hàng
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
          Quản lý đơn hàng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi trạng thái, thanh toán và thông tin giao hàng của khách.
        </p>
      </div>

      {/* Main SaaS Card Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        {/* Underline Status Filter Tabs */}
        <div className="border-b border-gray-200 px-4 pt-2 sm:px-6">
          <div className="-mb-px flex items-center gap-6 overflow-x-auto no-scrollbar">
            {filterItems.map((item) => {
              const active = statusFilter === item;
              const label =
                item === "All" ? "Tất cả" : STATUS_CONFIG[item]?.label || item;
              const count = counts[item] ?? 0;
              const badgeColor = getTabBadgeClass(item, count, active);

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatusFilter(item)}
                  className={`group inline-flex shrink-0 items-center gap-2 border-b-2 py-3.5 text-sm transition-all ${
                    active
                      ? "border-[#155e59] font-semibold text-[#155e59]"
                      : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-800"
                  }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold leading-none transition-colors ${badgeColor}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/40 px-4 py-3.5 sm:px-6">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn, tên hoặc email khách hàng..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[#155e59] focus:outline-none focus:ring-2 focus:ring-[#155e59]/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(statusFilter !== "All" || search) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("All");
                setSearch("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-3.5 w-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Responsive Order Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="py-3.5 pl-6 pr-4">Mã đơn</th>
                <th className="px-4 py-3.5">Khách hàng</th>
                <th className="px-4 py-3.5">Hàng hóa</th>
                <th className="px-4 py-3.5 text-right">Tổng tiền</th>
                <th className="px-4 py-3.5">Thanh toán</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5">Ngày tạo</th>
                <th className="py-3.5 pl-4 pr-6 text-right">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-gray-900">
                        Không tìm thấy đơn hàng phù hợp
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Thử thay đổi từ khóa tìm kiếm hoặc chọn tab trạng thái khác.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const displayStatus = getDisplayStatus(order);
                  const st = STATUS_CONFIG[displayStatus] || {
                    label: displayStatus,
                    badgeClass: "bg-gray-100 text-gray-800",
                  };

                  const firstItem = order.items[0];
                  const extraItemsCount = Math.max(0, order.items.length - 1);
                  const isPaid = order.paymentStatus === "Paid";

                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-gray-50/90"
                    >
                      {/* Order ID Badge Link */}
                      <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="inline-flex items-center rounded-md bg-[#155e59]/10 px-2.5 py-1 text-xs font-semibold text-[#155e59] transition-colors hover:bg-[#155e59] hover:text-white"
                        >
                          #{order.id}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {order.customer.fullName}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {order.customer.email}
                        </div>
                      </td>

                      {/* Products: 32x32 circular thumbnail + First Product Name + muted extra count */}
                      <td className="px-4 py-4 max-w-[280px]">
                        {firstItem ? (
                          <div className="flex items-center gap-3">
                            {firstItem.previewUrl ? (
                              <img
                                src={firstItem.previewUrl}
                                alt={firstItem.name}
                                className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-gray-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900">
                                {firstItem.name}
                              </div>
                              {extraItemsCount > 0 ? (
                                <div className="mt-0.5 text-xs text-gray-500">
                                  và {extraItemsCount} sản phẩm khác
                                </div>
                              ) : (
                                <div className="mt-0.5 text-xs text-gray-400">
                                  Số lượng: ×{firstItem.quantity}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">
                            Không có sản phẩm
                          </span>
                        )}
                      </td>

                      {/* Total Amount (Right-aligned, slightly larger, font-semibold) */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <span className="text-[15px] font-semibold text-gray-900 tabular-nums">
                          {order.total.toLocaleString("vi-VN")} ₫
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div
                          className={`text-xs font-semibold ${
                            isPaid ? "text-emerald-600" : "text-orange-600"
                          }`}
                        >
                          {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                        </div>
                      </td>

                      {/* Status Badge (Soft-colored pill badge, no icons) */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>

                      {/* Subtle Ghost Action Button, fully opaque on row hover */}
                      <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 opacity-55 transition-all group-hover:bg-white group-hover:text-[#155e59] group-hover:opacity-100 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-gray-200 hover:!bg-[#155e59] hover:!text-white hover:!ring-[#155e59]"
                        >
                          <Eye className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
