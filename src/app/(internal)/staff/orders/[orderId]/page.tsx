"use client";

import Link from "next/link";
import { use, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Printer,
  RefreshCw,
  Truck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import type { OrderStatus } from "@/features/order/types";

const ORDER_STEPS = [
  { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { key: "PROCESSING", label: "Chờ đóng hàng" },
  { key: "PARTIALLY_FULFILLED", label: "Đã cấp nhân vật &\nchờ đóng hàng" },
  { key: "SHIPPING", label: "Đang vận chuyển" },
  { key: "DELIVERED", label: "Đã giao" },
  { key: "COMPLETED", label: "Đã hoàn thành" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PendingPayment":
    case "Pending":
      return 0;
    case "PROCESSING":
    case "Preparing":
    case "Confirmed":
      return 1;
    case "PARTIALLY_FULFILLED":
    case "HandedOver":
      return 2;
    case "SHIPPING":
    case "Shipping":
      return 3;
    case "DELIVERED":
    case "Delivered":
      return 4;
    case "COMPLETED":
    case "Completed":
      return 5;
    default:
      return 1;
  }
}

const BADGE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  PENDING_PAYMENT: { label: "CHỜ THANH TOÁN", bg: "bg-amber-600", text: "text-white" },
  PROCESSING: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-blue-600", text: "text-white" },
  PARTIALLY_FULFILLED: { label: "ĐÃ CẤP NV & CHỜ ĐÓNG HÀNG", bg: "bg-purple-700", text: "text-white" },
  SHIPPING: { label: "ĐANG VẬN CHUYỂN", bg: "bg-[#1E293B]", text: "text-white" },
  DELIVERED: { label: "ĐÃ GIAO", bg: "bg-teal-600", text: "text-white" },
  COMPLETED: { label: "ĐÃ HOÀN THÀNH", bg: "bg-emerald-700", text: "text-white" },
  DELIVERY_FAILED: { label: "VẬN CHUYỂN THẤT BẠI", bg: "bg-orange-600", text: "text-white" },
  REFUNDED: { label: "ĐÃ HOÀN TIỀN", bg: "bg-gray-600", text: "text-white" },
  CANCELED: { label: "ĐÃ HỦY", bg: "bg-red-600", text: "text-white" },
  PendingPayment: { label: "CHỜ THANH TOÁN", bg: "bg-amber-600", text: "text-white" },
  Preparing: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-blue-600", text: "text-white" },
  HandedOver: { label: "ĐÃ CẤP NV & CHỜ ĐÓNG HÀNG", bg: "bg-purple-700", text: "text-white" },
  Shipping: { label: "ĐANG VẬN CHUYỂN", bg: "bg-[#1E293B]", text: "text-white" },
  Delivered: { label: "ĐÃ GIAO", bg: "bg-teal-600", text: "text-white" },
  Completed: { label: "ĐÃ HOÀN THÀNH", bg: "bg-emerald-700", text: "text-white" },
  Cancelled: { label: "ĐÃ HỦY", bg: "bg-red-600", text: "text-white" },
  Pending: { label: "CHỜ THANH TOÁN", bg: "bg-amber-600", text: "text-white" },
  Confirmed: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-blue-600", text: "text-white" },
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function formatDate(isoDate?: string) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatShortTime(isoDate?: string, addMinutes = 0) {
  const d = isoDate ? new Date(isoDate) : new Date();
  if (isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + addMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { orders, updateOrderStatus } = useOrders();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("PROCESSING");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const order = orders.find((entry) => String(entry.id) === String(orderId));

  if (!order) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center py-20 text-center">
        <h2 className="mb-3 text-2xl font-black text-gray-800">Không tìm thấy đơn hàng #{orderId}</h2>
        <p className="mb-6 text-sm text-gray-500">Đơn hàng không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <Link
          href="/staff/orders"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0F5B38] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0c4a2d]"
        >
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(order.status);
  const badge = BADGE_CONFIG[order.status] || {
    label: order.status,
    bg: "bg-gray-700",
    text: "text-white",
  };

  const handlePrintInvoice = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleStatusChange = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await updateOrderStatus(order.id, selectedStatus);
      setIsUpdateModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await updateOrderStatus(order.id, "CANCELED");
      setIsCancelModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Hủy đơn hàng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timeline AhaMove computation
  const getTimelineMilestones = () => {
    const rawDeliveryStatus = order.delivery?.rawStatus || "";
    const isCompleted = order.status === "COMPLETED" || order.status === "DELIVERED" || rawDeliveryStatus === "DELIVERED";
    const isShipping = order.status === "SHIPPING" || rawDeliveryStatus === "SHIPPING" || rawDeliveryStatus === "IN_TRANSIT";
    const isPartially = order.status === "PARTIALLY_FULFILLED" || order.status === "HandedOver";
    const isProcessing = order.status === "PROCESSING" || order.status === "Preparing" || order.status === "Confirmed";
    const isDeliveryFailed = order.status === "DELIVERY_FAILED" || rawDeliveryStatus === "FAILED";
    const isRefunded = order.status === "REFUNDED" || rawDeliveryStatus === "RETURNED";

    let activeTimelineStep = 0;
    if (isRefunded) activeTimelineStep = 6;
    else if (isDeliveryFailed) activeTimelineStep = 5;
    else if (isCompleted) activeTimelineStep = 4;
    else if (isShipping) activeTimelineStep = 3;
    else if (isPartially) activeTimelineStep = 2;
    else if (isProcessing) activeTimelineStep = 1;
    else activeTimelineStep = 0;

    return [
      {
        index: 0,
        title: "Đang chờ",
        subTitle: "Đang chờ xử lý",
        time: formatShortTime(order.createdAt, 15),
      },
      {
        index: 1,
        title: "Đang tìm tài xế",
        subTitle: "Tài xế Nguyễn Văn Tài đã nhận đơn",
        time: formatShortTime(order.createdAt, 60),
      },
      {
        index: 2,
        title: "Đã lấy hàng",
        subTitle: "Đã bàn giao hàng cho tài xế",
        time: formatShortTime(order.createdAt, 105),
      },
      {
        index: 3,
        title: "Đang giao",
        subTitle: "Tài xế đang trên đường giao hàng",
        time: formatShortTime(order.createdAt, 180),
      },
      {
        index: 4,
        title: "Đã giao",
        subTitle: "Đã giao hàng thành công đến khách nhận",
        time: isCompleted ? formatShortTime(order.createdAt, 240) : undefined,
      },
      {
        index: 5,
        title: "Vận chuyển thất bại",
        subTitle: "Không liên lạc được hoặc giao không thành công",
        time: isDeliveryFailed ? formatShortTime(order.createdAt, 260) : undefined,
      },
      {
        index: 6,
        title: "Hoàn hàng",
        subTitle: "Đơn hàng được chuyển hoàn về kho",
        time: isRefunded ? formatShortTime(order.createdAt, 300) : undefined,
      },
    ].map((m) => {
      let status: "done" | "current" | "pending" = "pending";
      if (m.index < activeTimelineStep) status = "done";
      else if (m.index === activeTimelineStep) status = "current";
      return { ...m, status };
    });
  };

  const timelineMilestones = getTimelineMilestones();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-2 md:p-4">
      {/* Top Navigation & Stepper Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/staff/orders"
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
          <h2 className="text-base font-bold text-gray-900">Trạng thái đơn hàng</h2>
          <div className="w-12 md:block hidden" />
        </div>

        {/* Stepper (6 steps) */}
        <div className="relative mt-4 flex items-center justify-between overflow-x-auto py-2">
          {ORDER_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <div key={step.key} className="flex flex-1 items-center">
                {/* Step Item */}
                <div className="flex flex-col items-center gap-1.5">
                  {isDone ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F5B38] text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="whitespace-pre-line text-center text-xs font-bold text-[#0F5B38]">
                        {step.label}
                      </span>
                    </div>
                  ) : isCurrent ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-[#1E293B] px-3.5 py-1.5 text-xs font-black text-white shadow">
                      <Truck size={14} className="animate-pulse" />
                      <span>{step.label.toUpperCase().replace("\n", " ")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-gray-400">
                        <Circle size={10} />
                      </div>
                      <span className="whitespace-pre-line text-center text-xs font-medium text-gray-400">
                        {step.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Connecting Line to next step */}
                {idx < ORDER_STEPS.length - 1 && (
                  <div className="mx-2 flex-1">
                    {idx < currentStepIndex ? (
                      <div className="h-1 w-full bg-[#0F5B38]" />
                    ) : (
                      <div className="h-0.5 w-full border-t-2 border-dashed border-gray-300" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Header: ID, Badge, Date & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-black text-gray-900">Đơn hàng #ORD-{order.id}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <span className="text-xs font-medium text-gray-500">
            Ngày tạo: {formatDate(order.createdAt)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 px-3.5 py-1.5 text-xs font-bold text-gray-800 transition hover:bg-gray-300"
          >
            <Printer size={14} /> In hóa đơn
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(order.status);
              setIsUpdateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#48BB78] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#38A169]"
          >
            <RefreshCw size={14} /> Cập nhật trạng thái
          </button>
          {order.status !== "CANCELED" && order.status !== "Cancelled" && (
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9AE6B4] px-3.5 py-1.5 text-xs font-bold text-[#1A4731] transition hover:bg-[#68D391]"
            >
              <XCircle size={14} /> Hủy đơn
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
        {/* Left Column: Danh sách sản phẩm */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-black text-gray-900">Danh sách sản phẩm</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500">
                  <th className="pb-3 text-left">Ảnh</th>
                  <th className="pb-3 text-left">Tên</th>
                  <th className="pb-3 text-left">Phân loại</th>
                  <th className="pb-3 text-right">Đơn giá</th>
                  <th className="pb-3 text-center">Số lượng</th>
                  <th className="pb-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, index) => {
                  const isCharacter = item.productType === "CHARACTER";
                  const isLed = item.productType === "LED_MODEL";

                  return (
                    <tr key={`${item.id}-${index}`} className="hover:bg-gray-50/50">
                      <td className="py-3.5 pr-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-xl">🦊</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {isCharacter
                            ? "Đã cấp trực tiếp"
                            : isLed
                            ? "Thiết bị phần cứng"
                            : "Sản phẩm hệ thống"}
                        </p>
                      </td>
                      <td className="py-3.5 pr-3">
                        {isCharacter ? (
                          <span className="inline-block rounded-full bg-[#6B21A8] px-3 py-1 text-xs font-bold text-white whitespace-nowrap">
                            Vật phẩm ảo (Digital)
                          </span>
                        ) : isLed ? (
                          <span className="inline-block rounded-full bg-[#1D4ED8] px-3 py-1 text-xs font-bold text-white whitespace-nowrap">
                            Bảng LED (Vật lý)
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold text-white whitespace-nowrap">
                            Gói combo (Bundle)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 text-right font-semibold text-gray-700">
                        {formatMoney(item.price)}
                      </td>
                      <td className="py-3.5 pr-3 text-center font-bold text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 text-right font-black text-gray-900">
                        {formatMoney(item.price * item.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Block */}
          <div className="mt-6 flex flex-col items-end gap-1.5 border-t border-gray-200 pt-4 text-sm">
            <div className="flex w-64 justify-between text-gray-600">
              <span>Tạm tính:</span>
              <span className="font-bold text-gray-900">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex w-64 justify-between text-gray-600">
              <span>Phí vận chuyển:</span>
              <span className="font-bold text-gray-900">{formatMoney(order.shipping)}</span>
            </div>
            <div className="flex w-64 justify-between text-gray-600">
              <span>Giảm giá:</span>
              <span className="font-bold text-gray-900">{formatMoney(0)}</span>
            </div>
            <div className="mt-1 flex w-64 justify-between border-t border-gray-200 pt-2 text-base font-black text-gray-900">
              <span>Tổng cộng:</span>
              <span>{formatMoney(order.total)}</span>
            </div>

            {/* Payment badge note */}
            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#15803D]">
              <CheckCircle2 size={14} />
              <span>
                {order.paymentStatus === "Paid"
                  ? `Đã thanh toán (SePay - ${formatDate(order.paidAt || order.createdAt)})`
                  : `Chờ thanh toán (SePay)`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 2 Cards */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Thông tin giao hàng */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-black text-gray-900">Thông tin giao hàng</h2>
            <div className="flex flex-col gap-2.5 text-sm">
              <p>
                <strong className="text-gray-900">Khách hàng: </strong>
                <span className="text-gray-700">{order.address.fullName || order.customer.fullName}</span>
              </p>
              <p>
                <strong className="text-gray-900">Điện thoại: </strong>
                <span className="text-gray-700">{order.address.phoneNumber || "0901234567"}</span>
              </p>
              <p>
                <strong className="text-gray-900">Địa chỉ: </strong>
                <span className="text-gray-700">{order.address.fullAddress}</span>
              </p>
              <p>
                <strong className="text-gray-900">Ghi chú: </strong>
                <span className="text-gray-700">Giao giờ hành chính, gọi trước khi giao.</span>
              </p>

              <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Đơn vị giao hàng:</span>
                  <span className="text-xs font-black text-gray-900">AhaMove (Hỏa tốc)</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Mã vận đơn:</span>
                  <span className="text-xs font-bold text-blue-600">
                    {order.delivery?.orderId || `DEL-${order.id}`}
                  </span>
                </div>
                {order.delivery?.trackingUrl && (
                  <div className="mt-2 text-right">
                    <a
                      href={order.delivery.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B38] hover:underline"
                    >
                      <ExternalLink size={12} /> Theo dõi lộ trình trên AhaMove
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Hành trình vận chuyển */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-black text-gray-900">Hành trình vận chuyển</h2>
            <div className="relative flex flex-col gap-4 pl-2">
              {timelineMilestones.map((milestone, idx) => {
                const isLast = idx === timelineMilestones.length - 1;

                return (
                  <div key={milestone.title} className="relative flex items-start gap-3">
                    {/* Vertical Connecting Line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[18px] bottom-[-16px] w-0.5 ${
                          milestone.status === "done" ? "bg-[#15803D]" : "bg-gray-200"
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10 shrink-0">
                      {milestone.status === "done" ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#15803D] text-white shadow-sm">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      ) : milestone.status === "current" ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#15803D] bg-white">
                          <div className="h-2 w-2 rounded-full bg-[#15803D]" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300 bg-white" />
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {milestone.time && (
                          <span className="text-xs font-medium text-gray-500">{milestone.time} -</span>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            milestone.status === "done"
                              ? "text-[#15803D]"
                              : milestone.status === "current"
                              ? "text-gray-900"
                              : "text-gray-400"
                          }`}
                        >
                          {milestone.title}
                        </span>
                      </div>
                      {milestone.status !== "pending" && milestone.subTitle && (
                        <p className="mt-0.5 text-xs text-gray-500">{milestone.subTitle}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cập nhật trạng thái */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-gray-900">Cập nhật trạng thái đơn hàng</h3>
            <p className="mt-1 text-xs text-gray-500">
              Chọn trạng thái mới cần áp dụng cho đơn hàng #ORD-{order.id}.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">Trạng thái mới:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-semibold outline-none focus:border-[#0F5B38]"
              >
                <option value="PROCESSING">Chờ đóng hàng (PROCESSING)</option>
                <option value="SHIPPING">Đang vận chuyển (SHIPPING)</option>
                <option value="DELIVERED">Đã giao (DELIVERED)</option>
                <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                <option value="CANCELED">Đã hủy (CANCELED)</option>
              </select>
            </div>

            {errorMessage && (
              <p className="mt-3 text-xs font-semibold text-red-600">{errorMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={isSubmitting}
                className="rounded-lg bg-[#48BB78] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#38A169] disabled:opacity-50"
              >
                {isSubmitting ? "Đang cập nhật..." : "Xác nhận cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy đơn */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              <h3 className="text-lg font-black">Xác nhận hủy đơn hàng</h3>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Bạn có chắc chắn muốn hủy đơn hàng <strong>#ORD-{order.id}</strong> không? Hành động này sẽ
              đổi trạng thái đơn thành <strong>CANCELED</strong>.
            </p>

            {errorMessage && (
              <p className="mt-3 text-xs font-semibold text-red-600">{errorMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Đang hủy..." : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
