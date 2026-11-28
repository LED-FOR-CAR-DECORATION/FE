"use client";

import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import { MockOrder, OrderStatus } from "@/features/order/types";
import { useAdaptiveListRows } from "@/hooks/useAdaptiveListRows";
import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DisplayStatus = OrderStatus | "Paid";

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; badgeClass: string }
> = {
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    badgeClass: "bg-[#fef08a] text-black",
  },
  PROCESSING: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  PARTIALLY_FULFILLED: {
    label: "Đã cấp nhân vật & chờ đóng hàng",
    badgeClass: "bg-[#ede9fe] text-black",
  },
  SHIPPING: {
    label: "Đang vận chuyển",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  DELIVERED: {
    label: "Đã giao",
    badgeClass: "bg-primary/40 text-black",
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    badgeClass: "bg-primary text-black",
  },
  DELIVERY_FAILED: {
    label: "Vận chuyển thất bại",
    badgeClass: "bg-[#fed7aa] text-black",
  },
  REFUNDED: {
    label: "Đã hoàn tiền",
    badgeClass: "bg-gray-200 text-black",
  },
  CANCELED: {
    label: "Đã hủy",
    badgeClass: "bg-[#fecaca] text-black",
  },
  PendingPayment: {
    label: "Chờ thanh toán",
    badgeClass: "bg-[#fef08a] text-black",
  },
  Pending: {
    label: "Chờ thanh toán",
    badgeClass: "bg-[#fef08a] text-black",
  },
  Confirmed: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  Preparing: {
    label: "Chờ đóng hàng",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  HandedOver: {
    label: "Đang vận chuyển",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  Shipping: {
    label: "Đang vận chuyển",
    badgeClass: "bg-[#e0f2fe] text-black",
  },
  Delivered: {
    label: "Đã giao",
    badgeClass: "bg-primary/40 text-black",
  },
  Completed: {
    label: "Đã hoàn thành",
    badgeClass: "bg-primary text-black",
  },
  Cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-[#fecaca] text-black",
  },
  Paid: {
    label: "Đã thanh toán",
    badgeClass: "bg-primary text-black",
  },
};

type SortMode = "NEWEST" | "OLDEST" | "STATUS";

const SORT_LABELS: Record<SortMode, string> = {
  NEWEST: "Mới nhất trước",
  OLDEST: "Cũ nhất trước",
  STATUS: "Ưu tiên trạng thái",
};

const NEXT_SORT_MODE: Record<SortMode, SortMode> = {
  NEWEST: "OLDEST",
  OLDEST: "STATUS",
  STATUS: "NEWEST",
};

const STATUS_SORT_PRIORITY: Record<string, number> = {
  DELIVERY_FAILED: 1,
  PROCESSING: 2,
  Preparing: 2,
  Confirmed: 2,
  PARTIALLY_FULFILLED: 3,
  HandedOver: 3,
  SHIPPING: 4,
  Shipping: 4,
  PENDING_PAYMENT: 5,
  PendingPayment: 5,
  Pending: 5,
  DELIVERED: 6,
  Delivered: 6,
  COMPLETED: 7,
  Completed: 7,
  REFUNDED: 8,
  CANCELED: 9,
  Cancelled: 9,
};

function getDisplayStatus(order: MockOrder): DisplayStatus {
  if (isCharacterOnlyOrder(order) && order.paymentStatus === "Paid") {
    return "Paid";
  }
  return order.status;
}

export default function StaffOrdersPage() {
  const { orders, isLoading, error, refreshOrders } = useOrders();
  const { rows: autoPageSize } = useAdaptiveListRows({
    estimatedRowHeight: 62,
    rowGap: 0,
    chromeHeight: 366,
    minRows: 3,
    maxRows: 12,
    defaultRows: 7,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.filter((o) => {
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

    return [...list].sort((a, b) => {
      if (sortMode === "STATUS") {
        const pa = STATUS_SORT_PRIORITY[a.status] ?? 99;
        const pb = STATUS_SORT_PRIORITY[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
      }
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      return sortMode === "OLDEST" ? ta - tb : tb - ta;
    });
  }, [orders, search, statusFilter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / autoPageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedOrders = useMemo(
    () => filtered.slice((safePage - 1) * autoPageSize, safePage * autoPageSize),
    [filtered, safePage, autoPageSize],
  );

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * autoPageSize + 1;
  const rangeEnd = filtered.length === 0 ? 0 : Math.min(filtered.length, safePage * autoPageSize);

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
    "PARTIALLY_FULFILLED",
    "SHIPPING",
    "DELIVERED",
    "COMPLETED",
    "DELIVERY_FAILED",
    "REFUNDED",
    "CANCELED",
  ];

  return (
    <div className="manager-neo-dashboard flex min-h-[calc(100dvh-114px)] flex-col gap-3 font-sans text-black xl:h-[calc(100dvh-114px)]">
      {/* Header Banner */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-black border-l-8 border-l-primary bg-white px-4 py-3 shadow-[4px_4px_0_0_#000] sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              VẬN HÀNH CỬA HÀNG
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Quản lý đơn hàng
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <ShoppingCart size={20} className="shrink-0 text-primary-ink" aria-hidden="true" />
            <h1 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">
              Quản lý đơn hàng
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshOrders()}
          disabled={isLoading}
          className="btn-secondary inline-flex items-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="neo-box-no-hover flex shrink-0 items-center justify-between gap-3 border-l-8 border-l-red-600 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700"
        >
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void refreshOrders()}
            className="btn-secondary px-2.5! py-1! text-xs font-black uppercase"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Filter Toolbar + Table Card */}
      <div className="neo-box-no-hover flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Compact Single-Row Search + Status Filter + Sort Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-[#f7fbf8] px-3.5 py-2.5">
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã đơn, tên hoặc email khách hàng..."
              aria-label="Tìm đơn hàng theo mã, tên hoặc email"
              className="w-full border-2 border-black bg-white py-1.5 pl-9 pr-8 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border border-black bg-white p-0.5 text-black hover:bg-primary"
                aria-label="Xóa từ khóa"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              <span className="shrink-0 text-[11px] font-black uppercase text-text-muted">
                Trạng thái:
              </span>
              <select
                aria-label="Lọc theo trạng thái đơn hàng"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as OrderStatus | "All");
                  setPage(1);
                }}
                className="bg-transparent text-xs font-black text-black focus:outline-none"
              >
                {filterItems.map((item) => {
                  const label =
                    item === "All" ? "Tất cả" : STATUS_CONFIG[item]?.label || item;
                  const count = counts[item] ?? 0;
                  return (
                    <option key={item} value={item}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setSortMode((prev) => NEXT_SORT_MODE[prev]);
                setPage(1);
              }}
              title="Đổi chế độ sắp xếp: Mới nhất -> Cũ nhất -> Ưu tiên trạng thái"
              className={`inline-flex cursor-pointer items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5 ${
                sortMode === "STATUS"
                  ? "bg-primary text-black"
                  : "bg-white text-black hover:bg-primary/20"
              }`}
            >
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0" />
              {SORT_LABELS[sortMode]}
            </button>

            {(statusFilter !== "All" || search || sortMode !== "NEWEST") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("All");
                  setSearch("");
                  setSortMode("NEWEST");
                  setPage(1);
                }}
                className="btn-secondary inline-flex items-center gap-1 px-2.5! py-1.5! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                <X className="h-3 w-3" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Responsive Order Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                <th className="py-2.5 pl-5 pr-4">Mã đơn</th>
                <th className="px-4 py-2.5">Khách hàng</th>
                <th className="px-4 py-2.5">Hàng hóa</th>
                <th className="px-4 py-2.5 text-right">Tổng tiền</th>
                <th className="px-4 py-2.5">Thanh toán</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Ngày tạo</th>
                <th className="py-2.5 pl-4 pr-5 text-right">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10 bg-white">
              {isLoading && orders.length === 0 ? (
                Array.from({ length: autoPageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-2.5 pl-5 pr-4">
                      <div className="h-5 w-14 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-28 bg-gray-200" />
                      <div className="mt-1.5 h-3 w-36 bg-gray-100" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-32 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="ml-auto h-4 w-24 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-20 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-5 w-24 bg-gray-200" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3.5 w-20 bg-gray-100" />
                    </td>
                    <td className="py-2.5 pl-4 pr-5 text-right">
                      <div className="ml-auto h-7 w-16 bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center border-2 border-black bg-gray-50 text-black shadow-[2px_2px_0_0_#000]">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-black uppercase text-black">
                        Không tìm thấy đơn hàng phù hợp
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-muted">
                        Thử thay đổi từ khóa tìm kiếm hoặc chọn tab trạng thái khác.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order) => {
                  const displayStatus = getDisplayStatus(order);
                  const st = STATUS_CONFIG[displayStatus] || {
                    label: displayStatus,
                    badgeClass: "bg-gray-200 text-black",
                  };

                  const firstItem = order.items[0];
                  const extraItemsCount = Math.max(0, order.items.length - 1);
                  const isPaid = order.paymentStatus === "Paid";

                  return (
                    <tr key={order.id} className="group transition-colors hover:bg-[#f3faf5]">
                      <td className="whitespace-nowrap py-2.5 pl-5 pr-4">
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="inline-flex items-center border border-black bg-primary px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1px_1px_0_0_#000] transition-colors hover:bg-primary-dark"
                        >
                          #{order.id}
                        </Link>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="font-bold text-black">{order.customer.fullName}</div>
                        <div className="mt-0.5 text-[11px] font-medium text-text-muted">
                          {order.customer.email}
                        </div>
                      </td>

                      <td className="max-w-[280px] px-4 py-2.5">
                        {firstItem ? (
                          <div className="flex items-center gap-2.5">
                            {firstItem.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={firstItem.previewUrl}
                                alt={firstItem.name}
                                className="h-8 w-8 shrink-0 border-2 border-black bg-gray-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-gray-100 text-black">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-bold text-black">{firstItem.name}</div>
                              {extraItemsCount > 0 ? (
                                <div className="mt-0.5 text-[11px] font-medium text-text-muted">
                                  và {extraItemsCount} sản phẩm khác
                                </div>
                              ) : (
                                <div className="mt-0.5 text-[11px] font-medium text-text-muted">
                                  Số lượng: ×{firstItem.quantity}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-text-muted">Không có sản phẩm</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm font-black text-black tabular-nums">
                        {order.total.toLocaleString("vi-VN")} VNĐ
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`inline-flex border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            isPaid ? "bg-primary text-black" : "bg-[#fef08a] text-black"
                          }`}
                        >
                          {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${st.badgeClass}`}
                          >
                            {st.label}
                          </span>
                          {order.status === "DELIVERY_FAILED" && (
                            <span className="text-[10px] font-black uppercase text-red-700">
                              Cần giao lại / hoàn tiền
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-semibold text-text-muted">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>

                      <td className="whitespace-nowrap py-2.5 pl-4 pr-5 text-right">
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="btn-secondary inline-flex items-center gap-1.5 px-2.5! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                        >
                          <Eye className="h-3.5 w-3.5" />
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

        {/* Bottom-pinned Pagination Bar */}
        <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-4 py-2 text-xs sm:px-5">
          <span className="font-bold text-black">
            {filtered.length > 0 && (
              <>
                <strong className="font-mono">
                  {rangeStart}–{rangeEnd}
                </strong>{" "}
                / {filtered.length} ·{" "}
              </>
            )}
            Trang <strong className="font-mono">{safePage}</strong> / {totalPages}
          </span>

          <nav aria-label="Phân trang danh sách đơn hàng" className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
