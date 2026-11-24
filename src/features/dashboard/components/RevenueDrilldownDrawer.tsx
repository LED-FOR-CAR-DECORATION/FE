"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSearch,
  Loader2,
  Package,
  ReceiptText,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  fetchManagerOrderAuditDetail,
  fetchManagerRevenueDrilldown,
  type ManagerOrderAuditDetail,
  type ManagerRevenueDrilldown,
  type RevenueSourceItem,
} from "@/lib/api/dashboard";

export interface RevenueDrilldownQuery {
  month: string;
  category?: string;
  productId?: number;
  titleHint?: string;
}

const CATEGORY_TABS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "HARDWARE", label: "Phần cứng" },
  { key: "COMMISSION", label: "Yêu cầu thiết kế" },
  { key: "BUNDLE", label: "Gói sản phẩm" },
  { key: "CHARACTER", label: "Nhân vật" },
  { key: "SUBSCRIPTION", label: "Gói hội viên" },
];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "Tổng doanh thu",
  HARDWARE: "Phần cứng",
  COMMISSION: "Yêu cầu thiết kế",
  BUNDLE: "Gói sản phẩm",
  CHARACTER: "Nhân vật",
  SUBSCRIPTION: "Gói hội viên",
  MIXED: "Đa danh mục",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: "Vật lý",
  DIGITAL: "Kỹ thuật số",
  MIXED: "Kết hợp",
  SUBSCRIPTION: "Hội viên",
  COMMISSION: "Thiết kế",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Hoàn thành", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DELIVERED: { label: "Đã giao", className: "bg-teal-50 text-teal-700 border-teal-200" },
  SHIPPING: { label: "Đang giao", className: "bg-sky-50 text-sky-700 border-sky-200" },
  PROCESSING: { label: "Đang xử lý", className: "bg-blue-50 text-blue-700 border-blue-200" },
  PARTIALLY_FULFILLED: { label: "Đã cấp nội dung số", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_PROGRESS: { label: "Đang thiết kế", className: "bg-blue-50 text-blue-700 border-blue-200" },
  AWAITING_CUSTOMER_REVIEW: { label: "Chờ khách duyệt", className: "bg-amber-50 text-amber-700 border-amber-200" },
  AWAITING_EXTRA_PAYMENT: { label: "Chờ thanh toán thêm", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ASSIGNED: { label: "Đã phân công", className: "bg-purple-50 text-purple-700 border-purple-200" },
  SUCCESS: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  return (
    STATUS_BADGES[status] ?? {
      label: status,
      className: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

interface RevenueDrilldownDrawerProps {
  query: RevenueDrilldownQuery | null;
  onClose: () => void;
  onChangeQuery: (next: RevenueDrilldownQuery) => void;
}

export default function RevenueDrilldownDrawer({
  query,
  onClose,
  onChangeQuery,
}: RevenueDrilldownDrawerProps) {
  const [data, setData] = useState<ManagerRevenueDrilldown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, ManagerOrderAuditDetail>>({});
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSearch("");
    setExpandedOrderId(null);
    setOrderDetailError(null);

    fetchManagerRevenueDrilldown({
      month: query.month,
      category: query.productId != null ? undefined : query.category || "ALL",
      productId: query.productId,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        setError(
          status === 403
            ? "Bạn không có quyền truy xuất chi tiết đơn hàng."
            : status === 401
              ? "Phiên đăng nhập đã hết hạn."
              : "Không thể tải danh sách đơn hàng nguồn. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    if (!query) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query, onClose]);

  const filteredItems = useMemo(() => {
    const list = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      return (
        item.referenceCode.toLowerCase().includes(q) ||
        String(item.referenceId).includes(q) ||
        (item.customerName ?? "").toLowerCase().includes(q) ||
        (item.customerEmail ?? "").toLowerCase().includes(q) ||
        (item.itemName ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const filteredRevenueSum = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.contributionAmount || 0), 0),
    [filteredItems],
  );

  const toggleOrderDetail = async (item: RevenueSourceItem) => {
    if (item.sourceType !== "ORDER") return;
    const orderId = item.referenceId;
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setOrderDetailError(null);
      return;
    }

    setExpandedOrderId(orderId);
    setOrderDetailError(null);

    if (orderDetails[orderId]) {
      return;
    }

    setLoadingOrderId(orderId);
    try {
      const detail = await fetchManagerOrderAuditDetail(orderId);
      setOrderDetails((prev) => ({ ...prev, [orderId]: detail }));
    } catch {
      setOrderDetailError("Không thể tải chi tiết đơn hàng #" + orderId);
    } finally {
      setLoadingOrderId(null);
    }
  };

  if (!query) return null;

  const activeCategory = query.productId != null ? null : (query.category || "ALL");

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Truy xuất đơn hàng nguồn doanh thu"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5">
                <FileSearch className="h-3.5 w-3.5" />
                Truy xuất số liệu
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">Tháng {query.month}</span>
              {data?.scopeType === "PRODUCT" && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                    Theo sản phẩm
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-1.5 truncate text-lg font-bold text-slate-900">
              {data?.scopeLabel || query.titleHint || "Chi tiết nguồn doanh thu"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Danh sách đơn hàng và yêu cầu thiết kế đóng góp trực tiếp vào số liệu thống kê. Nhấn vào từng đơn để xem chi tiết hóa đơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng bảng truy xuất"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Tổng doanh thu đối soát</p>
            <p className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
              {loading && !data ? "…" : formatVnd(data?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Tổng số lượng bán</p>
            <p className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
              {loading && !data ? "…" : `${(data?.totalUnits ?? 0).toLocaleString("vi-VN")} đơn vị`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-slate-500">Nguồn đơn phát sinh</p>
            <p className="mt-0.5 text-base font-bold text-blue-700 tabular-nums">
              {loading && !data ? "…" : `${(data?.distinctSourceCount ?? 0).toLocaleString("vi-VN")} đơn`}
            </p>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="space-y-3 border-b border-slate-200 px-6 py-3.5">
          {query.productId != null ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">
                Đang lọc theo mã sản phẩm <strong className="text-slate-900">#{query.productId}</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeQuery({
                    month: query.month,
                    category: "ALL",
                    titleHint: "Tổng doanh thu",
                  })
                }
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                Xem toàn bộ đơn tháng {query.month}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      onChangeQuery({
                        month: query.month,
                        category: tab.key,
                        titleHint: tab.label,
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn (#38, COM-12), tên khách hàng, email hoặc sản phẩm..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Đang truy xuất danh sách đơn hàng...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 p-8 text-center">
              <AlertCircle className="h-7 w-7 text-red-500" />
              <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
              <ReceiptText className="h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {search
                  ? "Không tìm thấy đơn hàng khớp với từ khóa"
                  : "Chưa có đơn hàng nào đóng góp vào mục này trong kỳ báo cáo"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Các đơn ở trạng thái Chờ thanh toán, Hủy, Giao thất bại hoặc Hoàn tiền không được tính vào doanh thu.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {search && (
                <div className="flex items-center justify-between rounded-lg bg-blue-50/70 px-3 py-2 text-xs text-blue-800">
                  <span>
                    Hiển thị <strong>{filteredItems.length}</strong> / {data?.items.length ?? 0} dòng khớp
                  </span>
                  <span className="font-bold tabular-nums">
                    Tổng lọc: {formatVnd(filteredRevenueSum)}
                  </span>
                </div>
              )}

              {filteredItems.map((item, index) => {
                const isOrder = item.sourceType === "ORDER";
                const isExpanded = isOrder && expandedOrderId === item.referenceId;
                const detail = isOrder ? orderDetails[item.referenceId] : undefined;
                const isLoadingDetail = isOrder && loadingOrderId === item.referenceId;
                const badge = getStatusBadge(item.status);
                const showOrderTotalDiff =
                  isOrder &&
                  Math.abs((item.orderTotalAmount ?? 0) - (item.contributionAmount ?? 0)) > 1;

                return (
                  <div
                    key={`${item.sourceType}-${item.referenceId}-${item.productId ?? "all"}-${index}`}
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      isExpanded
                        ? "border-blue-300 bg-blue-50/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      role={isOrder ? "button" : undefined}
                      tabIndex={isOrder ? 0 : undefined}
                      onClick={() => isOrder && toggleOrderDetail(item)}
                      onKeyDown={(e) => {
                        if (isOrder && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          toggleOrderDetail(item);
                        }
                      }}
                      className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                        isOrder ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                              isOrder
                                ? "bg-slate-900 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {isOrder ? <Package className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                            {item.referenceCode}
                          </span>

                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {ORDER_TYPE_LABELS[item.orderType] ?? item.orderType}
                          </span>

                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-900">
                          {item.itemName}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium text-slate-700">
                              {item.customerName || "Khách hàng"}
                            </span>
                            {item.customerEmail && (
                              <span className="text-slate-400">({item.customerEmail})</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-2.5 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {formatVnd(item.contributionAmount)}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {item.quantity > 1 && data?.scopeType !== "ALL"
                              ? `${item.quantity} × ${formatVnd(item.unitPrice)}`
                              : `${item.quantity} đơn vị`}
                          </p>
                          {showOrderTotalDiff && (
                            <p className="text-[11px] text-blue-600 tabular-nums">
                              Tổng đơn: {formatVnd(item.orderTotalAmount)}
                            </p>
                          )}
                        </div>

                        {isOrder ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                            {isExpanded ? (
                              <>
                                Ẩn chi tiết <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Xem đơn <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </span>
                        ) : (
                          <Link
                            href="/staff/commission"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            Mở yêu cầu <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Expanded Order Audit Detail */}
                    {isExpanded && (
                      <div className="border-t border-blue-200/80 bg-slate-50/90 px-4 py-3.5 text-xs">
                        {isLoadingDetail ? (
                          <div className="flex items-center gap-2 py-3 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Đang tải chi tiết hóa đơn {item.referenceCode}...</span>
                          </div>
                        ) : orderDetailError && !detail ? (
                          <p className="text-red-600">{orderDetailError}</p>
                        ) : detail ? (
                          <div className="space-y-3">
                            {/* Payment metadata */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                                <span>
                                  Mã giao dịch:{" "}
                                  <strong className="font-mono text-slate-900">
                                    {detail.paymentCode || "—"}
                                  </strong>
                                </span>
                                {detail.paymentGateway && (
                                  <span>
                                    Cổng: <strong className="text-slate-900">{detail.paymentGateway}</strong>
                                  </span>
                                )}
                                {detail.paidAt && (
                                  <span>
                                    Thanh toán:{" "}
                                    <strong className="text-slate-900 tabular-nums">
                                      {formatDateTime(detail.paidAt)}
                                    </strong>
                                  </span>
                                )}
                              </div>
                              {detail.paymentStatus && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    getStatusBadge(detail.paymentStatus).className
                                  }`}
                                >
                                  {getStatusBadge(detail.paymentStatus).label}
                                </span>
                              )}
                            </div>

                            {/* Order Line Items Table */}
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2">Sản phẩm trong đơn</th>
                                    <th className="px-3 py-2">Danh mục</th>
                                    <th className="px-3 py-2 text-right">SL</th>
                                    <th className="px-3 py-2 text-right">Đơn giá</th>
                                    <th className="px-3 py-2 text-right">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {detail.items.map((line) => {
                                    const isHighlighted =
                                      (query.productId != null && line.productId === query.productId) ||
                                      (query.productId == null &&
                                        activeCategory != null &&
                                        activeCategory !== "ALL" &&
                                        line.category === activeCategory);
                                    return (
                                      <tr
                                        key={line.orderItemId}
                                        className={isHighlighted ? "bg-blue-50/70" : undefined}
                                      >
                                        <td className="px-3 py-2 font-medium text-slate-900">
                                          {line.productName}
                                          {isHighlighted && (
                                            <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                              Đang truy xuất
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">
                                          {CATEGORY_LABELS[line.category] ?? line.category}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-700">
                                          {line.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                                          {formatVnd(line.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                                          {formatVnd(line.subtotal)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Totals footer */}
                            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 px-1 text-slate-600 tabular-nums">
                              <span>
                                Tạm tính: <strong className="text-slate-800">{formatVnd(detail.subtotal)}</strong>
                              </span>
                              <span>
                                Phí giao hàng:{" "}
                                <strong className="text-slate-800">{formatVnd(detail.shippingFee)}</strong>
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                Tổng đơn: {formatVnd(detail.totalAmount)}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
