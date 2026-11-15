"use client";

import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { useGallery } from "@/features/character/context/GalleryContext";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment, getOrderKind, isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { OrderKind, OrderStatus, PaymentStatus } from "@/features/order/types";
import { formatPrice } from "@/lib/currency";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Phone,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

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

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-orange-100 text-orange-800 border-orange-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  PARTIALLY_FULFILLED: "bg-purple-100 text-purple-800 border-purple-200",
  SHIPPING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-teal-100 text-teal-800 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DELIVERY_FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-800 border-gray-200",
  CANCELED: "bg-red-100 text-red-800 border-red-200",
  PendingPayment: "bg-orange-100 text-orange-800 border-orange-200",
  Preparing: "bg-blue-100 text-blue-800 border-blue-200",
  HandedOver: "bg-purple-100 text-purple-800 border-purple-200",
  Shipping: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Delivered: "bg-teal-100 text-teal-800 border-teal-200",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Cancelled: "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-orange-100 text-orange-800 border-orange-200",
  Confirmed: "bg-blue-100 text-blue-800 border-blue-200",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  Pending: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Failed: "Thanh toán thất bại",
  Cancelled: "Đã hủy / Hoàn tiền",
};

function getOrderSteps(orderKind: OrderKind) {
  if (orderKind === "DIGITAL") {
    return [
      { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
      { key: "COMPLETED", label: "Đã cấp nhân vật & Hoàn thành" },
    ];
  }
  if (orderKind === "MIXED") {
    return [
      { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
      { key: "PARTIALLY_FULFILLED", label: "Đã cấp nhân vật & Chờ đóng hàng" },
      { key: "SHIPPING", label: "Đang vận chuyển" },
      { key: "DELIVERED", label: "Đã giao" },
      { key: "COMPLETED", label: "Đã hoàn thành" },
    ];
  }
  return [
    { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
    { key: "PROCESSING", label: "Chờ đóng hàng" },
    { key: "SHIPPING", label: "Đang vận chuyển" },
    { key: "DELIVERED", label: "Đã giao" },
    { key: "COMPLETED", label: "Đã hoàn thành" },
  ];
}

function getActiveStepIndex(status: OrderStatus, orderKind: OrderKind): number {
  if (orderKind === "DIGITAL") {
    if (status === "COMPLETED" || status === "Completed") return 1;
    return 0;
  }

  switch (status) {
    case "PENDING_PAYMENT":
    case "PendingPayment":
    case "Pending":
      return 0;
    case "PROCESSING":
    case "Preparing":
    case "Confirmed":
    case "PARTIALLY_FULFILLED":
    case "HandedOver":
      return 1;
    case "SHIPPING":
    case "Shipping":
      return 2;
    case "DELIVERED":
    case "Delivered":
      return 3;
    case "COMPLETED":
    case "Completed":
      return 4;
    default:
      return 0;
  }
}

function OrderStatusStepper({ status, orderKind }: { status: OrderStatus; orderKind: OrderKind }) {
  const isTerminalNegative =
    status === "CANCELED" ||
    status === "Cancelled" ||
    status === "REFUNDED" ||
    status === "DELIVERY_FAILED";

  const steps = getOrderSteps(orderKind);
  const currentIdx = getActiveStepIndex(status, orderKind);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-[#155e59]" />
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
            Trạng thái đơn hàng
          </h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {isTerminalNegative ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold">
              {status === "REFUNDED"
                ? "Đơn hàng đã được hủy và chuyển sang trạng thái hoàn tiền."
                : status === "DELIVERY_FAILED"
                  ? "Đơn hàng gặp sự cố khi giao hàng. Vui lòng liên hệ bộ phận hỗ trợ."
                  : "Đơn hàng này đã bị hủy."}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Nếu bạn cần hỗ trợ thêm, hãy nhắn tin trực tiếp qua mục Chat ngay.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <div className="flex min-w-[540px] items-start justify-between gap-2">
            {steps.map((step, idx) => {
              const isCompletedAll = status === "COMPLETED" || status === "Completed";
              const isDone = isCompletedAll ? idx <= currentIdx : idx < currentIdx;
              const isCurrent = !isCompletedAll && idx === currentIdx;

              return (
                <div key={step.key} className="flex flex-1 items-start">
                  <div className="flex w-full flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      {idx > 0 ? (
                        <div
                          className={`h-0.5 flex-1 transition-colors ${
                            idx <= currentIdx ? "bg-[#155e59]" : "border-t border-dashed border-gray-300"
                          }`}
                        />
                      ) : (
                        <div className="flex-1" />
                      )}

                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isDone
                            ? "border-[#155e59] bg-[#155e59] text-white"
                            : isCurrent
                              ? "border-[#155e59] bg-[#155e59]/10 text-[#155e59] ring-4 ring-[#155e59]/10"
                              : "border-gray-300 bg-white text-gray-400"
                        }`}
                      >
                        {isDone ? (
                          <Check size={15} strokeWidth={3} />
                        ) : isCurrent ? (
                          <Truck size={14} className="animate-pulse" />
                        ) : (
                          <Circle size={10} />
                        )}
                      </div>

                      {idx < steps.length - 1 ? (
                        <div
                          className={`h-0.5 flex-1 transition-colors ${
                            idx < currentIdx ? "bg-[#155e59]" : "border-t border-dashed border-gray-300"
                          }`}
                        />
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>

                    <p
                      className={`mt-2.5 max-w-[120px] text-xs leading-snug ${
                        isDone
                          ? "font-bold text-[#155e59]"
                          : isCurrent
                            ? "font-extrabold text-gray-900"
                            : "font-medium text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function getProductBadge(productType: string) {
  switch (productType) {
    case "CHARACTER":
      return {
        label: "Nhân vật kỹ thuật số",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "BUNDLE":
      return {
        label: "Bộ sản phẩm (Bundle)",
        className: "bg-teal-50 text-teal-700 border-teal-200",
      };
    case "LED_MODEL":
    default:
      return {
        label: "Bảng LED vật lý",
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
  }
}

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { orders, refreshOrders, confirmOrderDelivery, cancelCustomerOrder } = useOrders();
  const { entitlements } = useGallery();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const order = orders.find((entry) => entry.id === orderId);

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#f5f5f5] py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
            <CustomerSidebar />
            <div className="flex-1 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-xs">
              <p className="text-xl font-black text-gray-900">Không tìm thấy đơn hàng #{orderId}</p>
              <p className="mt-2 text-sm text-gray-500">
                Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.
              </p>
              <Link
                href="/profile/orders"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#155e59] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                <ArrowLeft size={15} /> Về lịch sử đơn hàng
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isPendingPayment =
    (order.status === "PENDING_PAYMENT" || order.status === "PendingPayment" || order.status === "Pending") &&
    order.paymentStatus !== "Paid";

  const isDelivered = order.status === "DELIVERED" || order.status === "Delivered";

  const canCancel =
    (order.status === "PENDING_PAYMENT" ||
      order.status === "PROCESSING" ||
      order.status === "PendingPayment" ||
      order.status === "Pending" ||
      order.status === "Preparing" ||
      order.status === "Confirmed") &&
    !(isCharacterOnlyOrder(order) && order.paymentStatus === "Paid");

  const handleConfirmDelivery = async () => {
    setIsConfirming(true);
    setConfirmError("");
    try {
      await confirmOrderDelivery(order.id);
      setConfirmSuccess(true);
      setIsConfirmModalOpen(false);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Xác nhận nhận hàng thất bại.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError("");
    try {
      const res = await cancelCustomerOrder(order.id, cancelReason);
      setCancelSuccessMessage(
        res.status === "REFUNDED"
          ? "Đã hủy đơn hàng thành công! Đơn hàng đã chuyển sang trạng thái Đã hoàn tiền."
          : "Đã hủy đơn hàng thành công! Tồn kho sản phẩm đã được hoàn lại.",
      );
      setIsCancelModalOpen(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Hủy đơn hàng thất bại.");
    } finally {
      setIsCancelling(false);
    }
  };

  const orderKind = getOrderKind(order);
  const fulfillment = getOrderFulfillment(order);
  const grantedCharacterIds = new Set(
    entitlements.filter((item) => item.sourceReferenceId === order.id).map((item) => item.characterId),
  );
  const entitlementComplete =
    order.paymentStatus === "Paid" && fulfillment.characterIds.every((id) => grantedCharacterIds.has(id));
  const entitlementMessage =
    order.paymentStatus !== "Paid"
      ? "Nhân vật sẽ được tự động thêm vào Thư viện sau khi thanh toán thành công."
      : entitlementComplete
        ? "Nhân vật đã được cấp vào Thư viện nhân vật của bạn."
        : "Đã thanh toán. Hệ thống đang cấp nhân vật vào Thư viện của bạn.";

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />

          <div className="min-w-0 flex-1 space-y-5">
            {/* Top Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-xs">
              <div className="flex items-center gap-3">
                <Link
                  href="/profile/orders"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                >
                  <ArrowLeft size={14} /> Trở lại
                </Link>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-black uppercase tracking-tight text-gray-900 sm:text-xl">
                      Đơn hàng #{order.id}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={12} /> Đặt lúc{" "}
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError("");
                      setCancelReason("");
                      setIsCancelModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                  >
                    <X size={14} /> Hủy đơn
                  </button>
                )}
                {isDelivered && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError("");
                      setIsConfirmModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#155e59] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-90"
                  >
                    <CheckCircle size={14} /> Đã nhận hàng
                  </button>
                )}
              </div>
            </div>

            {/* Notification Banners */}
            {cancelSuccessMessage && (
              <div className="flex items-center gap-2.5 rounded-xl border border-gray-300 bg-white p-4 text-sm font-semibold text-gray-900 shadow-xs">
                <CheckCircle2 size={18} className="shrink-0 text-gray-700" />
                <p>{cancelSuccessMessage}</p>
              </div>
            )}

            {confirmSuccess && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-xs">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <p>Xác nhận đã nhận hàng thành công! Đơn hàng đã được hoàn tất.</p>
              </div>
            )}

            {isDelivered && (
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      Đơn hàng đã được giao đến bạn!
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Nếu bạn đã nhận và kiểm tra kiện hàng, hãy bấm xác nhận để hoàn tất đơn hàng.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmError("");
                    setIsConfirmModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#155e59] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                >
                  <CheckCircle size={14} /> Xác nhận đã nhận hàng
                </button>
              </section>
            )}

            {/* Full-width Horizontal Order Status Stepper */}
            <OrderStatusStepper status={order.status} orderKind={orderKind} />

            {/* SePay Payment Section if still pending payment */}
            {isPendingPayment && (
              <SePayOrderPaymentCard
                orderId={order.id}
                initialPaymentCode={order.paymentCode}
                redirectOnSuccess
                onPaymentSuccess={() => {
                  void refreshOrders();
                }}
              />
            )}

            {/* 2-Column Main Detail Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left Column (7/12): Products & Payment Summary */}
              <div className="space-y-5 lg:col-span-7">
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Package size={17} className="text-[#155e59]" />
                      <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        Sản phẩm đã đặt ({order.items.length})
                      </h2>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 px-5">
                    {order.items.map((item, idx) => {
                      const productBadge = getProductBadge(item.productType);
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className="flex items-start justify-between gap-4 py-4"
                        >
                          <div className="flex min-w-0 items-start gap-3.5">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400">
                                <Package size={22} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900">{item.name}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${productBadge.className}`}
                                >
                                  {productBadge.label}
                                </span>
                                <span className="text-xs font-medium text-gray-500">
                                  Số lượng: ×{item.quantity}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900 tabular-nums">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="mt-0.5 text-[11px] text-gray-400 tabular-nums">
                                {formatPrice(item.price)} / sp
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Integrated Pricing & Payment Breakdown */}
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Tạm tính</span>
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {formatPrice(order.subtotal)}
                        </span>
                      </div>
                      {(fulfillment.requiresDelivery || order.shipping > 0) && (
                        <div className="flex justify-between text-gray-600">
                          <span>Phí vận chuyển</span>
                          <span className="font-semibold text-gray-900 tabular-nums">
                            {order.shipping === 0 ? "Miễn phí" : formatPrice(order.shipping)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2.5">
                        <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-xl font-black text-[#155e59] tabular-nums">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 rounded-lg border border-gray-200 bg-white p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-600">
                          <CreditCard size={13} className="text-[#155e59]" />
                          Thanh toán ({order.paymentMethod})
                        </span>
                        <span
                          className={`font-bold ${
                            order.paymentStatus === "Paid"
                              ? "text-emerald-600"
                              : order.paymentStatus === "Cancelled"
                                ? "text-red-600"
                                : "text-amber-600"
                          }`}
                        >
                          {PAYMENT_LABEL[order.paymentStatus]}
                        </span>
                      </div>
                      {order.bankReferenceCode && (
                        <p className="mt-1.5 font-mono text-[11px] text-gray-600">
                          Mã giao dịch: {order.bankReferenceCode}
                        </p>
                      )}
                      {order.paidAt && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-700">
                          Xác nhận lúc: {new Date(order.paidAt).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column (5/12): Delivery Address, Carrier Info & Digital Entitlements */}
              <div className="space-y-5 lg:col-span-5">
                {fulfillment.requiresDelivery && (
                  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <MapPin size={17} className="text-[#155e59]" />
                      <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        Địa chỉ & Vận chuyển
                      </h2>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-start gap-2.5">
                        <User size={15} className="mt-0.5 shrink-0 text-gray-400" />
                        <p className="font-bold text-gray-900">{order.address.fullName}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Phone size={15} className="mt-0.5 shrink-0 text-gray-400" />
                        <p className="text-gray-600">{order.address.phoneNumber || "—"}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
                        <p className="leading-relaxed text-gray-600">{order.address.fullAddress}</p>
                      </div>
                    </div>

                    {order.delivery && (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Đơn vị vận chuyển</span>
                          <span className="font-bold text-gray-900">{order.delivery.provider}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-gray-500">Mã vận đơn</span>
                          <span className="font-mono font-bold text-[#155e59]">
                            {order.delivery.orderId}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-gray-500">Trạng thái vận chuyển</span>
                          <span className="font-semibold text-gray-800">
                            {order.delivery.rawStatus || order.delivery.status}
                          </span>
                        </div>
                        {order.delivery.trackingUrl && (
                          <a
                            href={order.delivery.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#155e59]/30 bg-white py-1.5 font-bold text-[#155e59] transition hover:bg-[#155e59]/5"
                          >
                            <ExternalLink size={12} /> Theo dõi lộ trình AhaMove
                          </a>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {fulfillment.requiresCharacterEntitlement && (
                  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
                    <div className="mb-3.5 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Sparkles size={17} className="text-[#155e59]" />
                      <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
                        Character kỹ thuật số
                      </h2>
                    </div>
                    <div
                      className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-xs font-semibold ${
                        entitlementComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      {entitlementComplete ? (
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Clock size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      )}
                      <p className="leading-relaxed">{entitlementMessage}</p>
                    </div>
                    {entitlementComplete && (
                      <Link
                        href="/profile/gallery"
                        className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#155e59] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                      >
                        Mở Thư viện nhân vật
                      </Link>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Delivery Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-base font-black uppercase text-gray-900">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>Xác nhận đã nhận hàng</span>
              </div>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setIsConfirmModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-700">
              Bạn xác nhận đã nhận đầy đủ sản phẩm cho đơn hàng{" "}
              <strong className="font-bold text-gray-900">#{order.id}</strong>?
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Sau khi xác nhận, đơn hàng sẽ được chuyển sang trạng thái{" "}
              <strong className="text-gray-700">Đã hoàn thành</strong>.
            </p>

            {confirmError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                {confirmError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setIsConfirmModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmDelivery}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#155e59] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                {isConfirming ? "Đang xử lý..." : "Xác nhận nhận hàng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-base font-black uppercase text-red-600">
                <X size={20} />
                <span>Hủy đơn hàng #{order.id}</span>
              </div>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-700">
              {order.status === "PROCESSING" || order.status === "Preparing" || order.status === "Confirmed"
                ? "Đơn hàng đã thanh toán và đang chờ đóng gói. Khi hủy, trạng thái đơn sẽ chuyển sang Đã hoàn tiền và tồn kho sẽ được hoàn lại."
                : "Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho sản phẩm sẽ được hoàn lại."}
            </p>

            <div className="mt-4">
              <label htmlFor="cancel-reason-detail" className="block text-xs font-bold uppercase text-gray-700">
                Lý do hủy đơn (tùy chọn)
              </label>
              <textarea
                id="cancel-reason-detail"
                rows={3}
                maxLength={500}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Đổi ý, muốn chọn sản phẩm khác hoặc cập nhật địa chỉ giao hàng..."
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#155e59] focus:outline-none focus:ring-1 focus:ring-[#155e59]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Đổi ý trước khi giao hàng", "Muốn đổi sản phẩm / số lượng", "Thay đổi địa chỉ nhận hàng"].map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelReason(preset)}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-[#155e59] hover:bg-gray-100"
                    >
                      {preset}
                    </button>
                  ),
                )}
              </div>
            </div>

            {cancelError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                {cancelError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isCancelling ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                {isCancelling ? "Đang hủy đơn..." : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
