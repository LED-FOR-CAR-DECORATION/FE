"use client";

import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { formatPrice } from "@/lib/currency";
import {
  CheckCircle,
  Eye,
  HelpCircle,
  Loader2,
  Package,
  QrCode,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CancelOrderDialog, ConfirmReceivedDialog } from "@/features/order/components/OrderActionDialogs";

type ShopeeTabKey =
  | "ALL"
  | "PENDING_PAYMENT"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELED"
  | "RETURN_REFUND";

const SHOPEE_TABS: Array<{ key: ShopeeTabKey; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { key: "PROCESSING", label: "Chờ đóng hàng" },
  { key: "SHIPPING", label: "Vận chuyển" },
  { key: "DELIVERED", label: "Chờ giao hàng" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELED", label: "Đã hủy" },
  { key: "RETURN_REFUND", label: "Trả hàng/Hoàn tiền" },
];

function normalizeStatusToTab(order: MockOrder): ShopeeTabKey {
  if (isCharacterOnlyOrder(order) && order.paymentStatus === "Paid") {
    return "COMPLETED";
  }

  switch (order.status) {
    case "PENDING_PAYMENT":
    case "PendingPayment":
    case "Pending":
      return "PENDING_PAYMENT";
    case "PROCESSING":
    case "PARTIALLY_FULFILLED":
    case "Preparing":
    case "Confirmed":
    case "HandedOver":
      return "PROCESSING";
    case "SHIPPING":
    case "Shipping":
      return "SHIPPING";
    case "DELIVERED":
    case "Delivered":
      return "DELIVERED";
    case "COMPLETED":
    case "Completed":
      return "COMPLETED";
    case "CANCELED":
    case "Cancelled":
      return "CANCELED";
    case "REFUNDED":
    case "DELIVERY_FAILED":
      return "RETURN_REFUND";
    default:
      return "ALL";
  }
}

function getHeaderStatusInfo(order: MockOrder): {
  deliveryText: string;
  statusText: string;
  statusColor: string;
  isSuccessDelivery: boolean;
} {
  if (isCharacterOnlyOrder(order) && order.paymentStatus === "Paid") {
    return {
      deliveryText: "Đã cấp nhân vật vào thư viện",
      statusText: "HOÀN THÀNH",
      statusColor: "text-[#155e59]",
      isSuccessDelivery: true,
    };
  }

  const map: Record<
    OrderStatus,
    { deliveryText: string; statusText: string; statusColor: string; isSuccessDelivery?: boolean }
  > = {
    PENDING_PAYMENT: {
      deliveryText: "Chờ khách hàng thanh toán",
      statusText: "CHỜ THANH TOÁN",
      statusColor: "text-amber-600",
    },
    PROCESSING: {
      deliveryText: "Người bán đang chuẩn bị hàng",
      statusText: "CHỜ ĐÓNG HÀNG",
      statusColor: "text-blue-600",
    },
    PARTIALLY_FULFILLED: {
      deliveryText: "Đã cấp nhân vật · Chờ đóng gói hàng",
      statusText: "CHỜ ĐÓNG HÀNG",
      statusColor: "text-blue-600",
    },
    SHIPPING: {
      deliveryText: "Đơn hàng đang trên đường giao đến bạn",
      statusText: "ĐANG VẬN CHUYỂN",
      statusColor: "text-indigo-600",
    },
    DELIVERED: {
      deliveryText: "Giao hàng thành công",
      statusText: "ĐÃ GIAO HÀNG",
      statusColor: "text-emerald-600",
      isSuccessDelivery: true,
    },
    COMPLETED: {
      deliveryText: "Giao hàng thành công",
      statusText: "HOÀN THÀNH",
      statusColor: "text-[#155e59]",
      isSuccessDelivery: true,
    },
    DELIVERY_FAILED: {
      deliveryText: "Giao hàng không thành công",
      statusText: "GIAO THẤT BẠI",
      statusColor: "text-orange-600",
    },
    REFUNDED: {
      deliveryText: "Đơn hàng đã được hoàn tiền",
      statusText: "ĐÃ HOÀN TIỀN",
      statusColor: "text-gray-600",
    },
    CANCELED: {
      deliveryText: "Đơn hàng đã bị hủy",
      statusText: "ĐÃ HỦY",
      statusColor: "text-red-600",
    },
    PendingPayment: {
      deliveryText: "Chờ khách hàng thanh toán",
      statusText: "CHỜ THANH TOÁN",
      statusColor: "text-amber-600",
    },
    Pending: {
      deliveryText: "Chờ khách hàng thanh toán",
      statusText: "CHỜ THANH TOÁN",
      statusColor: "text-amber-600",
    },
    Preparing: {
      deliveryText: "Người bán đang chuẩn bị hàng",
      statusText: "CHỜ ĐÓNG HÀNG",
      statusColor: "text-blue-600",
    },
    Confirmed: {
      deliveryText: "Người bán đang chuẩn bị hàng",
      statusText: "CHỜ ĐÓNG HÀNG",
      statusColor: "text-blue-600",
    },
    HandedOver: {
      deliveryText: "Đã cấp nhân vật · Chờ đóng gói hàng",
      statusText: "CHỜ ĐÓNG HÀNG",
      statusColor: "text-blue-600",
    },
    Shipping: {
      deliveryText: "Đơn hàng đang trên đường giao đến bạn",
      statusText: "ĐANG VẬN CHUYỂN",
      statusColor: "text-indigo-600",
    },
    Delivered: {
      deliveryText: "Giao hàng thành công",
      statusText: "ĐÃ GIAO HÀNG",
      statusColor: "text-emerald-600",
      isSuccessDelivery: true,
    },
    Completed: {
      deliveryText: "Giao hàng thành công",
      statusText: "HOÀN THÀNH",
      statusColor: "text-[#155e59]",
      isSuccessDelivery: true,
    },
    Cancelled: {
      deliveryText: "Đơn hàng đã bị hủy",
      statusText: "ĐÃ HỦY",
      statusColor: "text-red-600",
    },
  };

  const info = map[order.status] ?? {
    deliveryText: "Đang cập nhật",
    statusText: String(order.status),
    statusColor: "text-gray-700",
  };

  return {
    deliveryText: info.deliveryText,
    statusText: info.statusText,
    statusColor: info.statusColor,
    isSuccessDelivery: Boolean(info.isSuccessDelivery),
  };
}

function getFooterHint(order: MockOrder): string {
  if (isCharacterOnlyOrder(order) && order.paymentStatus === "Paid") {
    return "Nhân vật kỹ thuật số đã được mở khóa trong Thư viện của bạn.";
  }
  switch (order.status) {
    case "PENDING_PAYMENT":
    case "PendingPayment":
    case "Pending":
      return "Vui lòng hoàn tất thanh toán để đơn hàng được xác nhận và xử lý.";
    case "PROCESSING":
    case "PARTIALLY_FULFILLED":
    case "Preparing":
    case "Confirmed":
      return "Cửa hàng đang kiểm tra và đóng gói sản phẩm để bàn giao đơn vị vận chuyển.";
    case "SHIPPING":
    case "Shipping":
      return "Theo dõi hành trình giao hàng trong trang chi tiết đơn hàng.";
    case "DELIVERED":
    case "Delivered":
      return "Vui lòng bấm \"Đã nhận hàng\" nếu bạn đã kiểm tra và hài lòng với sản phẩm.";
    case "COMPLETED":
    case "Completed":
      return "Cảm ơn bạn đã mua sắm tại LUMINTRA!";
    case "CANCELED":
    case "Cancelled":
      return "Đơn hàng đã được hủy và tồn kho đã được hoàn lại.";
    case "REFUNDED":
      return "Đơn hàng đã hủy và chuyển sang trạng thái hoàn tiền.";
    default:
      return "";
  }
}

function getProductTypeLabel(productType: string): string {
  switch (productType) {
    case "CHARACTER":
      return "Nhân vật kỹ thuật số";
    case "BUNDLE":
      return "Bộ sản phẩm (Bundle)";
    case "LED_MODEL":
    default:
      return "Bảng LED vật lý";
  }
}

function canCancelOrder(order: MockOrder): boolean {
  const cancellableStatus =
    order.status === "PENDING_PAYMENT" ||
    order.status === "PROCESSING" ||
    order.status === "PendingPayment" ||
    order.status === "Pending" ||
    order.status === "Preparing" ||
    order.status === "Confirmed";
  return cancellableStatus && !(isCharacterOnlyOrder(order) && order.paymentStatus === "Paid");
}

export default function OrderHistoryPage() {
  const { orders, isLoading, confirmOrderDelivery, cancelCustomerOrder } = useOrders();
  const [activeTab, setActiveTab] = useState<ShopeeTabKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [cancelTargetOrder, setCancelTargetOrder] = useState<MockOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const tabCounts = useMemo(() => {
    const counts: Record<ShopeeTabKey, number> = {
      ALL: orders.length,
      PENDING_PAYMENT: 0,
      PROCESSING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      COMPLETED: 0,
      CANCELED: 0,
      RETURN_REFUND: 0,
    };
    for (const order of orders) {
      const tab = normalizeStatusToTab(order);
      if (tab !== "ALL") {
        counts[tab] += 1;
      }
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (activeTab !== "ALL" && normalizeStatusToTab(order) !== activeTab) {
        return false;
      }
      if (q) {
        const idMatch = order.id.toLowerCase().includes(q) || `#${order.id}`.toLowerCase().includes(q);
        const itemMatch = order.items.some((item) => item.name.toLowerCase().includes(q));
        if (!idMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const handleConfirmOrder = async (orderId: string) => {
    setConfirmingId(orderId);
    setConfirmError("");
    try {
      await confirmOrderDelivery(orderId);
      setConfirmTargetId(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Xác nhận nhận hàng thất bại.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelCustomerOrder(cancelTargetOrder.id, cancelReason);
      setCancelTargetOrder(null);
      setCancelReason("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Hủy đơn hàng thất bại.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />

          {/* Right Main Purchase Section */}
          <section className="min-w-0 flex-1 space-y-3.5">
            {/* Horizontal Underline Status Tabs */}
            <div className="overflow-hidden rounded-xs bg-white shadow-xs">
              <div className="flex items-center overflow-x-auto border-b border-gray-100 no-scrollbar">
                {SHOPEE_TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const count = tabCounts[tab.key];
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm transition-colors sm:flex-1 ${
                        isActive
                          ? "border-[#155e59] font-bold text-[#155e59]"
                          : "border-transparent font-medium text-gray-700 hover:text-[#155e59]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                            isActive ? "bg-[#155e59]/10 text-[#155e59]" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shopee Search Input Bar */}
            <div className="relative flex items-center rounded-xs bg-[#eaeaea] px-3.5 py-2.5 shadow-xs">
              <Search size={17} className="shrink-0 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bạn có thể tìm kiếm theo ID đơn hàng hoặc Tên Sản phẩm"
                className="w-full bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-300/60 hover:text-gray-800"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Orders List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-xs bg-white py-20 text-gray-500 shadow-xs">
                <Loader2 size={28} className="animate-spin text-[#155e59]" />
                <p className="mt-3 text-sm font-medium">Đang tải đơn hàng của bạn...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xs bg-white py-20 text-center shadow-xs">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Package size={36} />
                </div>
                <p className="mt-4 text-base font-bold text-gray-800">Chưa có đơn hàng</p>
                <p className="mt-1 text-xs text-gray-500">
                  {searchQuery
                    ? "Không tìm thấy đơn hàng khớp với từ khóa của bạn."
                    : "Chưa có đơn hàng nào trong mục này."}
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xs bg-[#155e59] px-5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  <Store size={14} /> Khám phá cửa hàng
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredOrders.map((order) => {
                  const statusInfo = getHeaderStatusInfo(order);
                  const footerHint = getFooterHint(order);
                  const isPendingPayment =
                    (order.status === "PENDING_PAYMENT" ||
                      order.status === "PendingPayment" ||
                      order.status === "Pending") &&
                    order.paymentStatus !== "Paid";
                  const isDelivered = order.status === "DELIVERED" || order.status === "Delivered";
                  const canCancel = canCancelOrder(order);

                  return (
                    <article
                      key={order.id}
                      className="overflow-hidden rounded-xs bg-white shadow-xs transition-shadow hover:shadow-sm"
                    >
                      {/* Card Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-xs bg-[#155e59] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            LUMINTRA
                          </span>
                          <span className="text-sm font-bold text-gray-900">Đơn hàng #{order.id}</span>
                          <Link
                            href="/"
                            className="inline-flex items-center gap-1 rounded-xs border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                          >
                            <Store size={11} /> Xem Shop
                          </Link>
                          <span className="text-xs text-gray-400">
                            · {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${
                              statusInfo.isSuccessDelivery ? "text-[#26aa99]" : "text-gray-500"
                            }`}
                          >
                            <Truck size={14} />
                            <span>{statusInfo.deliveryText}</span>
                            <HelpCircle size={13} className="text-gray-400" />
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className={`font-bold uppercase tracking-wide ${statusInfo.statusColor}`}>
                            {statusInfo.statusText}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Product Items */}
                      <Link
                        href={`/profile/orders/${order.id}`}
                        className="block divide-y divide-gray-100 px-5 transition-colors hover:bg-gray-50/40"
                      >
                        {order.items.map((item, idx) => (
                          <div
                            key={`${order.id}-${item.id}-${idx}`}
                            className="flex items-start justify-between gap-4 py-4"
                          >
                            <div className="flex min-w-0 items-start gap-3.5">
                              {item.previewUrl ? (
                                <img
                                  src={item.previewUrl}
                                  alt={item.name}
                                  className="h-20 w-20 shrink-0 rounded-xs border border-gray-200 bg-gray-50 object-cover"
                                />
                              ) : (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xs border border-gray-200 bg-gray-100 text-gray-400">
                                  <Package size={26} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Phân loại hàng: {getProductTypeLabel(item.productType)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-gray-700">
                                  x{item.quantity}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-[#155e59] tabular-nums">
                                {formatPrice(item.price)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="mt-0.5 text-[11px] text-gray-400 tabular-nums">
                                  Tạm tính: {formatPrice(item.price * item.quantity)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </Link>

                      {/* Card Footer: Total + Actions */}
                      <div className="border-t border-dashed border-gray-200 bg-[#fffefb] px-5 py-4">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className="text-xs font-medium text-gray-600">Thành tiền:</span>
                          <span className="text-xl font-black text-[#155e59] tabular-nums">
                            {formatPrice(order.total)}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                          <p className="text-xs text-gray-500">{footerHint}</p>

                          <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                            {isDelivered && (
                              <button
                                type="button"
                                disabled={confirmingId === order.id}
                                onClick={() => {
                                  setConfirmError("");
                                  setConfirmTargetId(order.id);
                                }}
                                className="inline-flex min-w-[130px] items-center justify-center gap-1.5 rounded-xs bg-[#155e59] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                              >
                                {confirmingId === order.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={13} />
                                )}
                                Đã nhận hàng
                              </button>
                            )}

                            {isPendingPayment && (
                              <Link
                                href={`/profile/orders/${order.id}#sepay-payment`}
                                className="inline-flex min-w-[130px] items-center justify-center gap-1.5 rounded-xs bg-[#155e59] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                              >
                                <QrCode size={13} /> Thanh toán ngay
                              </Link>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelError("");
                                  setCancelReason("");
                                  setCancelTargetOrder(order);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xs border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-500 hover:bg-red-50"
                              >
                                <X size={13} /> Hủy đơn
                              </button>
                            )}

                            <Link
                              href={`/profile/orders/${order.id}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xs border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                            >
                              <Eye size={13} /> Xem chi tiết
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {cancelTargetOrder && (
        <CancelOrderDialog
          orderId={cancelTargetOrder.id}
          isPaid={
            cancelTargetOrder.status === "PROCESSING" ||
            cancelTargetOrder.status === "Preparing" ||
            cancelTargetOrder.status === "Confirmed"
          }
          reason={cancelReason}
          onReasonChange={setCancelReason}
          error={cancelError}
          busy={isCancelling}
          onClose={() => setCancelTargetOrder(null)}
          onConfirm={() => void handleConfirmCancelOrder()}
        />
      )}
      {confirmTargetId && (
        <ConfirmReceivedDialog
          orderId={confirmTargetId}
          error={confirmError}
          busy={confirmingId === confirmTargetId}
          onClose={() => setConfirmTargetId(null)}
          onConfirm={() => void handleConfirmOrder(confirmTargetId)}
        />
      )}
      <Footer />
    </>
  );
}
