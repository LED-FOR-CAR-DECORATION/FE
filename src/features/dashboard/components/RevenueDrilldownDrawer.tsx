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
  LED: "Phần cứng",
  PHYSICAL: "Phần cứng",
  COMMISSION: "Yêu cầu thiết kế",
  BUNDLE: "Gói sản phẩm",
  CHARACTER: "Nhân vật",
  DIGITAL: "Nhân vật",
  SUBSCRIPTION: "Gói hội viên",
  MIXED: "Đa danh mục",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: "Vật lý (Phần cứng)",
  DIGITAL: "Kỹ thuật số (Nhân vật)",
  MIXED: "Kết hợp (Combo/Hỗn hợp)",
  SUBSCRIPTION: "Gói hội viên",
  COMMISSION: "Yêu cầu thiết kế",
};

const GATEWAY_LABELS: Record<string, string> = {
  SEPAY: "SePay (VietQR)",
  VIETQR: "VietQR",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  MOCK: "Mô phỏng thanh toán",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Hoàn thành", className: "bg-primary text-black" },
  DELIVERED: { label: "Đã giao hàng", className: "bg-primary/70 text-black" },
  SHIPPING: { label: "Đang vận chuyển", className: "bg-[#e0f2fe] text-black" },
  PROCESSING: { label: "Đang xử lý / Chờ đóng gói", className: "bg-[#fef08a] text-black" },
  PARTIALLY_FULFILLED: { label: "Đã cấp nhân vật số", className: "bg-primary/40 text-black" },
  IN_PROGRESS: { label: "Đang thiết kế", className: "bg-[#e0f2fe] text-black" },
  AWAITING_CUSTOMER_REVIEW: { label: "Chờ khách duyệt", className: "bg-[#fef08a] text-black" },
  AWAITING_EXTRA_PAYMENT: { label: "Chờ thanh toán phụ thu", className: "bg-[#fed7aa] text-black" },
  ASSIGNED: { label: "Đã phân công Designer", className: "bg-[#ede9fe] text-black" },
  SUCCESS: { label: "Thanh toán thành công", className: "bg-primary text-black" },
  PAID: { label: "Đã thanh toán", className: "bg-primary text-black" },
  PENDING_PAYMENT: { label: "Chờ thanh toán", className: "bg-[#fef08a] text-black" },
  CANCELED: { label: "Đã hủy", className: "bg-[#fecaca] text-black" },
  CANCELLED: { label: "Đã hủy", className: "bg-[#fecaca] text-black" },
  REFUNDED: { label: "Đã hoàn tiền", className: "bg-gray-200 text-black" },
  DELIVERY_FAILED: { label: "Giao hàng thất bại", className: "bg-[#fecaca] text-black" },
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
      className: "bg-gray-100 text-black",
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
      className="fixed inset-0 z-50 flex justify-end bg-black/45 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Truy xuất đơn hàng nguồn doanh thu"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col border-l-2 border-black bg-white shadow-[-6px_0_0_0_#000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-primary/25 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 text-black shadow-[1px_1px_0_0_#000]">
                <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                Truy xuất số liệu
              </span>
              <span className="text-black" aria-hidden="true">·</span>
              <span className="text-black">Tháng {query.month}</span>
              {data?.scopeType === "PRODUCT" && (
                <>
                  <span className="text-black" aria-hidden="true">·</span>
                  <span className="border border-black bg-white px-2 py-0.5 text-black">
                    Theo sản phẩm
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-2 truncate text-lg font-black uppercase tracking-tight text-black">
              {data?.scopeLabel || query.titleHint || "Chi tiết nguồn doanh thu"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-text-muted">
              Danh sách đơn hàng và yêu cầu thiết kế đóng góp trực tiếp vào số liệu thống kê. Nhấn vào từng đơn để xem chi tiết hóa đơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 p-2! shadow-[2px_2px_0_0_#000]"
            aria-label="Đóng bảng truy xuất"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-1 gap-3 border-b-2 border-black bg-gray-50 px-6 py-4 sm:grid-cols-3">
          <div className="border-2 border-black bg-white px-3.5 py-2.5 shadow-[2px_2px_0_0_#000]">
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Tổng doanh thu đối soát
            </p>
            <p className="mt-0.5 text-base font-black text-primary-ink tabular-nums">
              {loading && !data ? "…" : formatVnd(data?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="border-2 border-black bg-white px-3.5 py-2.5 shadow-[2px_2px_0_0_#000]">
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Tổng số lượng bán
            </p>
            <p className="mt-0.5 text-base font-black text-black tabular-nums">
              {loading && !data ? "…" : `${(data?.totalUnits ?? 0).toLocaleString("vi-VN")} đơn vị`}
            </p>
          </div>
          <div className="border-2 border-black bg-white px-3.5 py-2.5 shadow-[2px_2px_0_0_#000]">
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Nguồn đơn phát sinh
            </p>
            <p className="mt-0.5 text-base font-black text-primary-ink tabular-nums">
              {loading && !data ? "…" : `${(data?.distinctSourceCount ?? 0).toLocaleString("vi-VN")} đơn`}
            </p>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="space-y-3 border-b-2 border-black bg-white px-6 py-3.5">
          {query.productId != null ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-text-muted">
                Đang lọc theo mã sản phẩm{" "}
                <strong className="border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-black">
                  #{query.productId}
                </strong>
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
                className="btn-secondary px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
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
                    aria-pressed={isActive}
                    onClick={() =>
                      onChangeQuery({
                        month: query.month,
                        category: tab.key,
                        titleHint: tab.label,
                      })
                    }
                    className={`cursor-pointer border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                      isActive
                        ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white text-black hover:bg-primary/20"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn (#38, COM-12), tên khách hàng, email hoặc sản phẩm..."
              className="w-full border-2 border-black bg-gray-50 py-2 pl-9 pr-9 text-xs font-bold text-black placeholder:text-text-muted focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-black hover:text-red-700"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto bg-background px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary-ink" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-wider text-black">
                Đang truy xuất danh sách đơn hàng...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-[#fee2e2] p-8 text-center shadow-[4px_4px_0_0_#000]">
              <AlertCircle className="h-7 w-7 text-red-700" aria-hidden="true" />
              <p className="mt-2 text-xs font-black uppercase text-black">{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-black/30 bg-white px-6 py-14 text-center">
              <ReceiptText className="h-8 w-8 text-text-muted" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-black">
                {search
                  ? "Không tìm thấy đơn hàng khớp với từ khóa"
                  : "Chưa có đơn hàng nào đóng góp vào mục này trong kỳ báo cáo"}
              </p>
              <p className="mt-1 text-xs font-medium text-text-muted">
                Các đơn ở trạng thái Chờ thanh toán, Hủy, Giao thất bại hoặc Hoàn tiền không được tính vào doanh thu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {search && (
                <div className="flex items-center justify-between border-2 border-black bg-primary/25 px-3.5 py-2 text-xs text-black">
                  <span className="font-bold">
                    Hiển thị <strong className="font-black">{filteredItems.length}</strong> / {data?.items.length ?? 0} dòng khớp
                  </span>
                  <span className="font-black text-primary-ink tabular-nums">
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
                    className={`overflow-hidden border-2 border-black bg-white transition-shadow duration-150 ${
                      isExpanded
                        ? "shadow-[4px_4px_0_0_#000]"
                        : "shadow-[2px_2px_0_0_#000] hover:shadow-[4px_4px_0_0_#000]"
                    }`}
                  >
                    <div
                      role={isOrder ? "button" : undefined}
                      tabIndex={isOrder ? 0 : undefined}
                      aria-expanded={isOrder ? isExpanded : undefined}
                      onClick={() => isOrder && toggleOrderDetail(item)}
                      onKeyDown={(e) => {
                        if (isOrder && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          toggleOrderDetail(item);
                        }
                      }}
                      className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                        isOrder
                          ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 border border-black px-2 py-0.5 font-mono text-xs font-black ${
                              isOrder
                                ? "bg-black text-white"
                                : "bg-primary text-black"
                            }`}
                          >
                            {isOrder ? (
                              <Package className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <Sparkles className="h-3 w-3" aria-hidden="true" />
                            )}
                            {item.referenceCode}
                          </span>

                          <span
                            className={`inline-flex items-center border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${badge.className}`}
                          >
                            {badge.label}
                          </span>

                          <span className="border border-black/30 bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                            {ORDER_TYPE_LABELS[item.orderType] ?? item.orderType}
                          </span>

                          <span className="text-[11px] font-medium text-text-muted tabular-nums">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm font-black uppercase text-black">
                          {item.itemName}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary-ink" aria-hidden="true" />
                            <span className="font-bold text-black">
                              {item.customerName || "Khách hàng"}
                            </span>
                            {item.customerEmail && (
                              <span className="text-text-muted">({item.customerEmail})</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-4 border-t-2 border-dashed border-gray-200 pt-2.5 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-black text-primary-ink tabular-nums">
                            {formatVnd(item.contributionAmount)}
                          </p>
                          <p className="text-[11px] font-bold text-text-muted tabular-nums">
                            {item.quantity > 1 && data?.scopeType !== "ALL"
                              ? `${item.quantity} × ${formatVnd(item.unitPrice)}`
                              : `${item.quantity} đơn vị`}
                          </p>
                          {showOrderTotalDiff && (
                            <p className="text-[11px] font-bold text-black tabular-nums">
                              Tổng đơn: {formatVnd(item.orderTotalAmount)}
                            </p>
                          )}
                        </div>

                        {isOrder ? (
                          <span className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[1px_1px_0_0_#000]">
                            {isExpanded ? (
                              <>
                                Ẩn chi tiết <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </>
                            ) : (
                              <>
                                Xem đơn <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </>
                            )}
                          </span>
                        ) : (
                          <Link
                            href="/staff/commission"
                            className="btn-primary inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                          >
                            Mở yêu cầu <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Expanded Order Audit Detail */}
                    {isExpanded && (
                      <div className="border-t-2 border-black bg-[#f7fbf8] px-4 py-4 text-xs">
                        {isLoadingDetail ? (
                          <div className="flex items-center gap-2 py-3 font-bold text-text-muted">
                            <Loader2 className="h-4 w-4 animate-spin text-primary-ink" aria-hidden="true" />
                            <span>Đang tải chi tiết hóa đơn {item.referenceCode}...</span>
                          </div>
                        ) : orderDetailError && !detail ? (
                          <p className="font-bold text-red-700">{orderDetailError}</p>
                        ) : detail ? (
                          <div className="space-y-3">
                            {/* Payment metadata */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-white px-3 py-2">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-muted">
                                <span>
                                  Mã giao dịch:{" "}
                                  <strong className="font-mono font-black text-black">
                                    {detail.paymentCode || "—"}
                                  </strong>
                                </span>
                                {detail.paymentGateway && (
                                  <span>
                                    Cổng:{" "}
                                    <strong className="font-black text-black">
                                      {GATEWAY_LABELS[detail.paymentGateway.toUpperCase()] ?? detail.paymentGateway}
                                    </strong>
                                  </span>
                                )}
                                {detail.paidAt && (
                                  <span>
                                    Thanh toán:{" "}
                                    <strong className="font-black text-black tabular-nums">
                                      {formatDateTime(detail.paidAt)}
                                    </strong>
                                  </span>
                                )}
                              </div>
                              {detail.paymentStatus && (
                                <span
                                  className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                                    getStatusBadge(detail.paymentStatus).className
                                  }`}
                                >
                                  {getStatusBadge(detail.paymentStatus).label}
                                </span>
                              )}
                            </div>

                            {/* Order Line Items Table */}
                            <div className="overflow-x-auto border-2 border-black bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b-2 border-black bg-[#e9f5ed] text-[10px] font-black uppercase tracking-wider text-black">
                                  <tr>
                                    <th className="px-3 py-2">Sản phẩm trong đơn</th>
                                    <th className="px-3 py-2">Danh mục</th>
                                    <th className="px-3 py-2 text-right">SL</th>
                                    <th className="px-3 py-2 text-right">Đơn giá</th>
                                    <th className="px-3 py-2 text-right">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-black/15">
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
                                        className={isHighlighted ? "bg-primary/20" : undefined}
                                      >
                                        <td className="px-3 py-2 font-bold text-black">
                                          {line.productName}
                                          {isHighlighted && (
                                            <span className="ml-1.5 border border-black bg-primary px-1.5 py-0.2 text-[9px] font-black uppercase text-black">
                                              Đang truy xuất
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-text-muted">
                                          {CATEGORY_LABELS[line.category] ?? line.category}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold tabular-nums text-black">
                                          {line.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                                          {formatVnd(line.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-black tabular-nums text-primary-ink">
                                          {formatVnd(line.subtotal)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Totals footer */}
                            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 px-1 text-text-muted tabular-nums">
                              <span>
                                Tạm tính: <strong className="font-bold text-black">{formatVnd(detail.subtotal)}</strong>
                              </span>
                              <span>
                                Phí giao hàng:{" "}
                                <strong className="font-bold text-black">{formatVnd(detail.shippingFee)}</strong>
                              </span>
                              <span className="text-sm font-black text-primary-ink">
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
