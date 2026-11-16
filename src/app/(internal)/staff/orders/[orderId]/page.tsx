"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Cpu,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderKind } from "@/features/order/fulfillment";
import type { OrderKind } from "@/features/order/types";
import { fetchLedInstances, LedInstanceItem } from "@/lib/api/ledInstances";
import {
  apiLinkOrderFulfillmentDevice,
  apiUnlinkOrderFulfillmentDevice,
  fetchStaffOrderDetail,
  type BackendStaffOrderDetail,
  type LinkOrderFulfillmentDeviceResponse,
} from "@/lib/api/orders";

function getOrderSteps(orderKind: OrderKind, status: string) {
  if (orderKind === "DIGITAL") {
    return [
      { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
      { key: "COMPLETED", label: "Đã cấp nhân vật &\nHoàn thành" },
    ];
  }

  const packingStep =
    orderKind === "MIXED" ||
    status === "PARTIALLY_FULFILLED" ||
    status === "HandedOver"
      ? { key: "PARTIALLY_FULFILLED", label: "Đã cấp nhân vật &\nchờ đóng hàng" }
      : { key: "PROCESSING", label: "Chờ đóng hàng" };

  return [
    { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
    packingStep,
    { key: "SHIPPING", label: "Đang vận chuyển" },
    { key: "DELIVERED", label: "Đã giao" },
    { key: "COMPLETED", label: "Đã hoàn thành" },
  ];
}

const AHAMOVE_SERVICES = [
  {
    id: "SGN-BIKE",
    name: "SGN-BIKE — Xe máy nội thành TP.HCM (Khuyên dùng cho đơn LED lẻ)",
  },
  {
    id: "BIKE",
    name: "BIKE — Xe máy tiêu chuẩn ngoại thành / tỉnh lân cận",
  },
  {
    id: "2H",
    name: "2H — Giao hàng siêu tốc trong 2 giờ",
  },
  {
    id: "SGN-TRUCK-500",
    name: "SGN-TRUCK-500 — Xe tải 500kg (Đơn sỉ số lượng lớn)",
  },
];

function getStepIndex(status: string, orderKind: OrderKind): number {
  if (orderKind === "DIGITAL") {
    switch (status) {
      case "COMPLETED":
      case "Completed":
        return 1;
      default:
        return 0;
    }
  }

  switch (status) {
    case "PENDING_PAYMENT":
    case "PendingPayment":
    case "Pending":
      return 0;
    case "PROCESSING":
    case "PARTIALLY_FULFILLED":
    case "Preparing":
    case "Confirmed":
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

const ORDER_KIND_BADGE: Record<OrderKind, { label: string; className: string }> = {
  PHYSICAL: { label: "Physical", className: "border border-sky-300 bg-sky-100 text-sky-800" },
  MIXED: { label: "Mixed", className: "border border-purple-300 bg-purple-100 text-purple-800" },
  DIGITAL: { label: "Character", className: "border border-emerald-300 bg-emerald-100 text-emerald-800" },
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
  const { orders, refreshOrders, updateOrderStatus, dispatchOrder } = useOrders();

  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [serviceId, setServiceId] = useState("SGN-BIKE");
  const [weight, setWeight] = useState("1.5");
  const [remarks, setRemarks] = useState("Handle fragile LED package with care");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dispatchSuccessBanner, setDispatchSuccessBanner] = useState<{
    trackingNumber: string;
    trackingUrl?: string | null;
  } | null>(null);

  // Fulfillment LED device scanning/linking state
  const [staffDetail, setStaffDetail] = useState<BackendStaffOrderDetail | null>(null);
  const [warehouseInstances, setWarehouseInstances] = useState<LedInstanceItem[]>([]);
  const [loadingFulfillment, setLoadingFulfillment] = useState(false);
  const [serialByItem, setSerialByItem] = useState<Record<number, string>>({});
  const [linkingItemId, setLinkingItemId] = useState<number | null>(null);
  const [unlinkingInstanceId, setUnlinkingInstanceId] = useState<number | null>(null);
  const [fulfillmentError, setFulfillmentError] = useState("");
  const [fulfillmentSuccess, setFulfillmentSuccess] = useState("");
  const [lastLinkResult, setLastLinkResult] =
    useState<LinkOrderFulfillmentDeviceResponse | null>(null);

  const loadFulfillmentData = useCallback(async () => {
    const numericOrderId = Number(orderId);
    if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) return;

    setLoadingFulfillment(true);
    try {
      const [detailRes, instancesRes] = await Promise.allSettled([
        fetchStaffOrderDetail(numericOrderId),
        fetchLedInstances({ page: 0, size: 100 }),
      ]);
      if (detailRes.status === "fulfilled" && detailRes.value) {
        setStaffDetail(detailRes.value);
      }
      if (instancesRes.status === "fulfilled") {
        setWarehouseInstances(instancesRes.value.items);
      }
    } finally {
      setLoadingFulfillment(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadFulfillmentData();
  }, [loadFulfillmentData]);

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

  const orderKind = getOrderKind(order);
  const kindBadge = ORDER_KIND_BADGE[orderKind];
  const orderSteps = getOrderSteps(orderKind, order.status);
  const currentStepIndex = getStepIndex(order.status, orderKind);
  const badge = BADGE_CONFIG[order.status] || {
    label: order.status,
    bg: "bg-gray-700",
    text: "text-white",
  };

  // Điều kiện được phép bấm "Chuẩn bị hàng" -> Dispatch sang AhaMove
  const isReadyStatus =
    order.status === "PROCESSING" ||
    order.status === "PARTIALLY_FULFILLED" ||
    order.status === "Preparing" ||
    order.status === "HandedOver" ||
    order.status === "Confirmed";

  const hasPhysicalItem = orderKind !== "DIGITAL";
  const rawDeliveryStatus = order.delivery?.rawStatus || "";
  const isDeliveryNotDispatched =
    !rawDeliveryStatus || ["PENDING", "FAILED", "RETURNED"].includes(rawDeliveryStatus.toUpperCase());

  const canPrepareOrder = isReadyStatus && hasPhysicalItem && isDeliveryNotDispatched;

  const canLinkDevices =
    hasPhysicalItem &&
    (order.status === "PROCESSING" ||
      order.status === "PARTIALLY_FULFILLED" ||
      order.status === "Preparing" ||
      order.status === "HandedOver");

  const physicalLineItems = (
    staffDetail?.items?.length
      ? staffDetail.items.map((item) => ({
          orderItemId: item.orderItemId,
          productName: item.productName,
          productType: item.productType ?? "LED",
          quantity: item.quantity,
        }))
      : order.items
          .filter((item) => typeof item.orderItemId === "number")
          .map((item) => ({
            orderItemId: item.orderItemId as number,
            productName: item.name,
            productType: item.productType,
            quantity: item.quantity,
          }))
  ).filter(
    (item) =>
      item.productType !== "CHARACTER" && item.productType !== "SUBSCRIPTION",
  );

  const numericOrderId = Number(order.id);
  const linkedInstancesForOrder = warehouseInstances.filter(
    (inst) => inst.fulfillment?.orderId === numericOrderId,
  );
  const inStockInstances = warehouseInstances.filter(
    (inst) => inst.status === LedInstanceItem.status.IN_STOCK,
  );
  const linkedByItemMap = new Map<number, LedInstanceItem[]>();
  for (const inst of linkedInstancesForOrder) {
    const itemId = inst.fulfillment?.orderItemId;
    if (!itemId) continue;
    const list = linkedByItemMap.get(itemId) ?? [];
    list.push(inst);
    linkedByItemMap.set(itemId, list);
  }

  const totalRequiredLedUnits =
    lastLinkResult?.progress?.orderRequiredCount ??
    physicalLineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalLinkedLedUnits = Math.max(
    linkedInstancesForOrder.length,
    lastLinkResult?.progress?.orderFulfilledCount ?? 0,
  );

  const handleLinkDevice = async (orderItemId: number) => {
    if (linkingItemId !== null || unlinkingInstanceId !== null) return;
    const rawSerial = serialByItem[orderItemId] ?? "";
    const trimmedSerial = rawSerial.trim();
    if (!trimmedSerial) {
      setFulfillmentError("Vui lòng nhập hoặc chọn Serial Number thiết bị LED.");
      setFulfillmentSuccess("");
      return;
    }

    setLinkingItemId(orderItemId);
    setFulfillmentError("");
    setFulfillmentSuccess("");
    try {
      const res = await apiLinkOrderFulfillmentDevice(order.id, {
        orderItemId,
        serialNumber: trimmedSerial,
      });
      setLastLinkResult(res);
      setSerialByItem((prev) => ({ ...prev, [orderItemId]: "" }));
      setFulfillmentSuccess(
        `Đã gán thiết bị ${res.serialNumber} (${res.modelName}) vào mục #${res.orderItemId}. Tiến độ đơn: ${res.progress.orderFulfilledCount}/${res.progress.orderRequiredCount}.`,
      );
      await Promise.allSettled([loadFulfillmentData(), refreshOrders()]);
    } catch (err) {
      setFulfillmentError(
        err instanceof Error ? err.message : "Gán thiết bị LED thất bại.",
      );
    } finally {
      setLinkingItemId(null);
    }
  };

  const handleUnlinkDevice = async (instance: LedInstanceItem) => {
    if (linkingItemId !== null || unlinkingInstanceId !== null) return;
    setUnlinkingInstanceId(instance.instanceId);
    setFulfillmentError("");
    setFulfillmentSuccess("");
    try {
      await apiUnlinkOrderFulfillmentDevice(order.id, instance.instanceId);
      setLastLinkResult(null);
      setFulfillmentSuccess(
        `Đã gỡ thiết bị ${instance.serialNumber} khỏi đơn hàng (trả về trạng thái Trong kho).`,
      );
      await Promise.allSettled([loadFulfillmentData(), refreshOrders()]);
    } catch (err) {
      setFulfillmentError(
        err instanceof Error ? err.message : "Gỡ thiết bị LED thất bại.",
      );
    } finally {
      setUnlinkingInstanceId(null);
    }
  };

  // Hành trình vận chuyển chỉ bắt đầu hoạt động khi đơn đã được đóng gói & bàn giao AhaMove
  const isJourneyActive =
    order.status === "SHIPPING" ||
    order.status === "Shipping" ||
    order.status === "DELIVERED" ||
    order.status === "Delivered" ||
    order.status === "COMPLETED" ||
    order.status === "Completed" ||
    order.status === "DELIVERY_FAILED" ||
    order.status === "REFUNDED" ||
    Boolean(rawDeliveryStatus && rawDeliveryStatus.toUpperCase() !== "PENDING");

  const handleOpenPrepareModal = () => {
    const physicalQty = order.items
      .filter((i) => i.productType !== "CHARACTER" && i.productType !== "SUBSCRIPTION")
      .reduce((sum, i) => sum + i.quantity, 0);
    setServiceId("SGN-BIKE");
    setWeight(String(Math.max(0.5, Number((physicalQty * 0.8).toFixed(1)) || 1.5)));
    setRemarks("Linh kiện LED dán kính xe dễ vỡ, vui lòng liên hệ trước khi giao.");
    setErrorMessage("");
    setIsPrepareModalOpen(true);
  };

  const handlePrintInvoice = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDispatchPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const numericWeight = Number(weight);
    if (!serviceId.trim()) {
      setErrorMessage("Vui lòng chọn gói dịch vụ vận chuyển AhaMove.");
      return;
    }
    if (weight.trim() && (!Number.isFinite(numericWeight) || numericWeight <= 0 || numericWeight > 10000)) {
      setErrorMessage("Khối lượng kiện hàng phải lớn hơn 0 và không vượt quá 10.000 kg.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await dispatchOrder(order.id, {
        serviceId: serviceId.trim(),
        remarks: remarks.trim() || null,
        weight: weight.trim() ? numericWeight : null,
      });
      setIsPrepareModalOpen(false);
      setDispatchSuccessBanner({
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể bàn giao đơn hàng sang AhaMove."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await updateOrderStatus(order.id, "Cancelled");
      setIsCancelModalOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Hủy đơn hàng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimelineMilestones = () => {
    const upperDelivery = rawDeliveryStatus.toUpperCase();
    const isCompleted =
      order.status === "COMPLETED" ||
      order.status === "Completed" ||
      order.status === "DELIVERED" ||
      order.status === "Delivered" ||
      upperDelivery === "DELIVERED";
    const isDeliveryFailed = order.status === "DELIVERY_FAILED" || upperDelivery === "FAILED";
    const isRefunded = order.status === "REFUNDED" || upperDelivery === "RETURNED";
    const isPickedUp = upperDelivery === "PICKED_UP" || upperDelivery === "PICKING_UP";
    const isInTransit = upperDelivery === "SHIPPING" || upperDelivery === "IN_TRANSIT" || upperDelivery === "DRIVING";
    const isAssigned = upperDelivery === "ASSIGNED" || upperDelivery === "ASSIGNING_DRIVER";

    let activeTimelineStep = -1;
    if (isJourneyActive) {
      if (isRefunded) activeTimelineStep = 6;
      else if (isDeliveryFailed) activeTimelineStep = 5;
      else if (isCompleted) activeTimelineStep = 4;
      else if (isInTransit) activeTimelineStep = 3;
      else if (isPickedUp) activeTimelineStep = 2;
      else if (isAssigned || order.status === "SHIPPING" || order.status === "Shipping") activeTimelineStep = 1;
      else activeTimelineStep = 0;
    }

    const baseTime = order.delivery?.createdAt || order.createdAt;

    return [
      {
        index: 0,
        title: "Đang chờ",
        subTitle: "Đơn vận chuyển đã được tạo trên AhaMove",
        time: formatShortTime(baseTime, 0),
      },
      {
        index: 1,
        title: "Đang tìm tài xế",
        subTitle: "Hệ thống AhaMove đang điều phối tài xế nhận đơn",
        time: formatShortTime(baseTime, 2),
      },
      {
        index: 2,
        title: "Đã lấy hàng",
        subTitle: "Đã bàn giao kiện hàng cho tài xế",
        time: formatShortTime(baseTime, 20),
      },
      {
        index: 3,
        title: "Đang giao",
        subTitle: "Tài xế đang trên đường giao hàng đến khách",
        time: formatShortTime(baseTime, 45),
      },
      {
        index: 4,
        title: "Đã giao",
        subTitle: "Đã giao hàng thành công đến khách nhận",
        time: isCompleted ? formatShortTime(baseTime, 75) : undefined,
      },
      {
        index: 5,
        title: "Vận chuyển thất bại",
        subTitle: "Không liên lạc được hoặc giao không thành công",
        time: isDeliveryFailed ? formatShortTime(baseTime, 90) : undefined,
      },
      {
        index: 6,
        title: "Hoàn hàng",
        subTitle: "Đơn hàng được chuyển hoàn về kho",
        time: isRefunded ? formatShortTime(baseTime, 120) : undefined,
      },
    ].map((m) => {
      if (!isJourneyActive) {
        return { ...m, time: undefined, status: "pending" as const };
      }
      let status: "done" | "current" | "pending" = "pending";
      if (isCompleted && m.index <= 4) {
        status = "done";
      } else if (m.index < activeTimelineStep) {
        status = "done";
      } else if (m.index === activeTimelineStep) {
        status = "current";
      }
      return {
        ...m,
        time: status === "pending" ? undefined : m.time,
        status,
      };
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
          <div className="hidden w-12 md:block" />
        </div>

        {/* Stepper */}
        <div className="relative mt-4 flex items-center justify-between overflow-x-auto py-2">
          {orderSteps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-1 items-center">
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

                {idx < orderSteps.length - 1 && (
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

      {/* Dispatch Success Notification Banner */}
      {dispatchSuccessBanner && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>
              Đóng gói và bàn giao AhaMove thành công! Mã vận đơn:{" "}
              <strong>#{dispatchSuccessBanner.trackingNumber}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dispatchSuccessBanner.trackingUrl && (
              <a
                href={dispatchSuccessBanner.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B38] underline"
              >
                <ExternalLink size={13} /> Theo dõi hành trình tài xế
              </a>
            )}
            <button
              type="button"
              onClick={() => setDispatchSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-950"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Order Header: ID, Badge, Date & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-black text-gray-900">Đơn hàng #ORD-{order.id}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${kindBadge.className}`}>
            Loại: {kindBadge.label}
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

          {canPrepareOrder && (
            <button
              type="button"
              onClick={handleOpenPrepareModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#48BB78] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#38A169]"
            >
              <Package size={14} /> Chuẩn bị hàng
            </button>
          )}

          {order.status !== "CANCELED" &&
            order.status !== "Cancelled" &&
            order.status !== "COMPLETED" &&
            order.status !== "Completed" && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsCancelModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9AE6B4] px-3.5 py-1.5 text-xs font-bold text-[#1A4731] transition hover:bg-[#68D391]"
              >
                <XCircle size={14} /> Hủy đơn
              </button>
            )}
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
        {/* Left Column: Danh sách sản phẩm & Quét/Gán thiết bị LED */}
        <div className="flex flex-col gap-6">
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
                          <span className="inline-block whitespace-nowrap rounded-full bg-[#6B21A8] px-3 py-1 text-xs font-bold text-white">
                            Vật phẩm ảo (Digital)
                          </span>
                        ) : isLed ? (
                          <span className="inline-block whitespace-nowrap rounded-full bg-[#1D4ED8] px-3 py-1 text-xs font-bold text-white">
                            Bảng LED (Vật lý)
                          </span>
                        ) : (
                          <span className="inline-block whitespace-nowrap rounded-full bg-[#0F766E] px-3 py-1 text-xs font-bold text-white">
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

            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#15803D]">
              <CheckCircle2 size={14} />
              <span>
                {order.paymentStatus === "Paid"
                  ? `Đã thanh toán (SePay - ${formatDate(order.paidAt || order.createdAt)})`
                  : "Chờ thanh toán (SePay)"}
              </span>
            </div>
          </div>
        </div>

        {hasPhysicalItem && (
          <FulfillmentDevicesPanel
            orderId={order.id}
            physicalLineItems={physicalLineItems}
            linkedByItemMap={linkedByItemMap}
            inStockInstances={inStockInstances}
            totalLinked={totalLinkedLedUnits}
            totalRequired={totalRequiredLedUnits}
            canLink={canLinkDevices}
            isLoading={loadingFulfillment}
            serialByItem={serialByItem}
            onSerialChange={(itemId, value) =>
              setSerialByItem((prev) => ({ ...prev, [itemId]: value }))
            }
            linkingItemId={linkingItemId}
            unlinkingInstanceId={unlinkingInstanceId}
            errorMessage={fulfillmentError}
            successMessage={fulfillmentSuccess}
            onRefresh={() => void loadFulfillmentData()}
            onLink={(itemId) => void handleLinkDevice(itemId)}
            onUnlink={(instance) => void handleUnlinkDevice(instance)}
          />
        )}
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
                <span className="text-gray-700">{order.address.phoneNumber || "—"}</span>
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
                    {isJourneyActive
                      ? order.delivery?.orderId || `DEL-${order.id}`
                      : "Chưa tạo vận đơn"}
                  </span>
                </div>
                {typeof order.delivery?.carrierFee === "number" && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Cước AhaMove:</span>
                    <span className="text-xs font-bold text-gray-900">
                      {formatMoney(order.delivery.carrierFee)}
                    </span>
                  </div>
                )}
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-black text-gray-900">Hành trình vận chuyển</h2>
              {isJourneyActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500">
                  Chưa kích hoạt
                </span>
              )}
            </div>

            {!isJourneyActive && (
              <div className="mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Hành trình sẽ tự động kích hoạt sau khi bạn bấm{" "}
                <strong className="text-gray-700">Chuẩn bị hàng</strong> ➔{" "}
                <strong className="text-gray-700">Đóng gói hàng</strong> để bàn giao cho AhaMove.
              </div>
            )}

            <div className="relative flex flex-col gap-4 pl-2">
              {timelineMilestones.map((milestone, idx) => {
                const isLast = idx === timelineMilestones.length - 1;

                return (
                  <div key={milestone.title} className="relative flex items-start gap-3">
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[18px] bottom-[-16px] w-0.5 ${
                          milestone.status === "done" ? "bg-[#15803D]" : "bg-gray-200"
                        }`}
                      />
                    )}

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

      {/* Pop-up Chuẩn bị hàng & Đóng gói hàng (POST /api/management/staff/orders/{id}/dispatch) */}
      {isPrepareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prepare-order-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleDispatchPackage}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header Pop-up */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#f8faf9] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F5B38] text-white">
                  <Package size={18} />
                </div>
                <div>
                  <h3 id="prepare-order-title" className="text-base font-black text-gray-900">
                    Chuẩn bị hàng & Bàn giao vận chuyển AhaMove
                  </h3>
                  <p className="text-xs text-gray-500">
                    Đơn hàng #ORD-{order.id} · Truy xuất thông tin khách hàng & kiện hàng trước khi xuất kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrepareModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Pop-up (Scrollable) */}
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* 1. Thông tin khách hàng & Địa chỉ giao hàng truy xuất từ đơn hàng */}
              <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F5B38]">
                  <User size={14} /> Thông tin khách hàng nhận hàng
                </h4>
                <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500">Người nhận:</span>
                    <p className="mt-0.5 font-bold text-gray-900">
                      {order.address.fullName || order.customer.fullName}
                    </p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Phone size={11} /> Số điện thoại:
                    </span>
                    <p className="mt-0.5 font-bold text-gray-900">
                      {order.address.phoneNumber || "Chưa có số điện thoại"}
                    </p>
                  </div>
                  {order.customer.email && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500">Email khách hàng:</span>
                      <p className="mt-0.5 font-semibold text-gray-800">{order.customer.email}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <span className="flex items-center gap-1 text-gray-500">
                      <MapPin size={11} /> Địa chỉ giao hàng:
                    </span>
                    <p className="mt-0.5 font-bold text-gray-900">{order.address.fullAddress}</p>
                  </div>
                </div>
              </section>

              {/* 2. Danh sách sản phẩm trong đơn hàng cần đóng gói */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Sản phẩm cần đóng gói ({order.items.length} mặt hàng)
                  </h4>
                  <span className="text-xs font-black text-[#0F5B38]">
                    Tổng giá trị: {formatMoney(order.total)}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-sm">📦</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900">{item.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {item.productType === "CHARACTER"
                              ? "Vật phẩm ảo (Đã cấp trực tiếp)"
                              : item.productType === "LED_MODEL"
                              ? "Bảng LED (Cần đóng gói vật lý)"
                              : "Gói Combo"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-gray-900">× {item.quantity}</p>
                        <p className="text-[11px] text-gray-500">
                          {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2b. Quét QR / Gán Serial Number thiết bị LED thực tế */}
              {hasPhysicalItem && (
                <FulfillmentDevicesPanel
                  compact
                  orderId={order.id}
                  physicalLineItems={physicalLineItems}
                  linkedByItemMap={linkedByItemMap}
                  inStockInstances={inStockInstances}
                  totalLinked={totalLinkedLedUnits}
                  totalRequired={totalRequiredLedUnits}
                  canLink={canLinkDevices}
                  isLoading={loadingFulfillment}
                  serialByItem={serialByItem}
                  onSerialChange={(itemId, value) =>
                    setSerialByItem((prev) => ({ ...prev, [itemId]: value }))
                  }
                  linkingItemId={linkingItemId}
                  unlinkingInstanceId={unlinkingInstanceId}
                  errorMessage={fulfillmentError}
                  successMessage={fulfillmentSuccess}
                  onRefresh={() => void loadFulfillmentData()}
                  onLink={(itemId) => void handleLinkDevice(itemId)}
                  onUnlink={(instance) => void handleUnlinkDevice(instance)}
                />
              )}

              {/* 3. Thông số bàn giao AhaMove */}
              <section className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0F5B38]">
                  <Truck size={14} /> Thông số điều phối AhaMove
                </h4>

                <div>
                  <label htmlFor="dispatch-service-id" className="text-xs font-bold text-gray-700">
                    Gói dịch vụ vận chuyển (serviceId) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="dispatch-service-id"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-[#0F5B38]"
                  >
                    {AHAMOVE_SERVICES.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dispatch-weight" className="text-xs font-bold text-gray-700">
                      Khối lượng kiện hàng (kg)
                    </label>
                    <input
                      id="dispatch-weight"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10000"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="1.5"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 outline-none focus:border-[#0F5B38]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Đơn vị giao vận</label>
                    <input
                      readOnly
                      value="AhaMove Partner v3"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dispatch-remarks" className="text-xs font-bold text-gray-700">
                    Ghi chú dặn dò tài xế (remarks)
                  </label>
                  <textarea
                    id="dispatch-remarks"
                    rows={2}
                    maxLength={500}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Ví dụ: Linh kiện LED dễ vỡ, gọi trước khi giao..."
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0F5B38]"
                  />
                </div>
              </section>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-700"
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Footer Pop-up với nút "Đóng gói hàng" */}
            <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsPrepareModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F5B38] px-5 py-2 text-xs font-black text-white shadow transition hover:bg-[#0c4a2d] disabled:opacity-50"
              >
                <Truck size={15} />
                {isSubmitting ? "Đang gửi đơn AhaMove..." : "Đóng gói hàng"}
              </button>
            </div>
          </form>
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

interface FulfillmentDevicesPanelProps {
  compact?: boolean;
  orderId: string;
  physicalLineItems: Array<{
    orderItemId: number;
    productName: string;
    productType: string;
    quantity: number;
  }>;
  linkedByItemMap: Map<number, LedInstanceItem[]>;
  inStockInstances: LedInstanceItem[];
  totalLinked: number;
  totalRequired: number;
  canLink: boolean;
  isLoading: boolean;
  serialByItem: Record<number, string>;
  onSerialChange: (orderItemId: number, value: string) => void;
  linkingItemId: number | null;
  unlinkingInstanceId: number | null;
  errorMessage: string;
  successMessage: string;
  onRefresh: () => void;
  onLink: (orderItemId: number) => void;
  onUnlink: (instance: LedInstanceItem) => void;
}

function FulfillmentDevicesPanel({
  compact = false,
  physicalLineItems,
  linkedByItemMap,
  inStockInstances,
  totalLinked,
  totalRequired,
  canLink,
  isLoading,
  serialByItem,
  onSerialChange,
  linkingItemId,
  unlinkingInstanceId,
  errorMessage,
  successMessage,
  onRefresh,
  onLink,
  onUnlink,
}: FulfillmentDevicesPanelProps) {
  const isComplete = totalRequired > 0 && totalLinked >= totalRequired;

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-blue-200 bg-blue-50/40 p-4"
          : "rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <QrCode size={16} />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900">
              Quét QR &amp; Gán thiết bị LED đóng hàng
            </h2>
            <p className="text-[11px] text-gray-500">
              Gán Serial Number thiết bị trong kho cho từng sản phẩm trước khi bàn giao vận chuyển
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isComplete
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            Đã gán {totalLinked} / {totalRequired} thiết bị LED
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách thiết bị"
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
        >
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {physicalLineItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
          {isLoading
            ? "Đang tải chi tiết Order Item từ hệ thống..."
            : "Không có mục LED / Bundle cần gán thiết bị hoặc thiếu orderItemId."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {physicalLineItems.map((line) => {
            const linkedList = linkedByItemMap.get(line.orderItemId) ?? [];
            const currentSerial = serialByItem[line.orderItemId] ?? "";
            const isLinkingThis = linkingItemId === line.orderItemId;

            return (
              <div
                key={line.orderItemId}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                        Item #{line.orderItemId}
                      </span>
                      <span className="text-xs font-black text-gray-900">
                        {line.productName}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Số lượng đặt: {line.quantity} · Đã gán: {linkedList.length} thiết bị
                    </p>
                  </div>
                </div>

                {/* Linked Devices */}
                {linkedList.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {linkedList.map((inst) => (
                      <div
                        key={inst.instanceId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Cpu size={14} className="text-emerald-600" />
                          <span className="font-mono font-bold text-gray-900">
                            {inst.serialNumber}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            MAC: {inst.macAddress}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {inst.status}
                          </span>
                        </div>
                        {canLink && (
                          <button
                            type="button"
                            disabled={unlinkingInstanceId === inst.instanceId}
                            onClick={() => onUnlink(inst)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {unlinkingInstanceId === inst.instanceId ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                            Gỡ
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Scan / Quick-pick IN_STOCK LED Form */}
                {canLink ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {inStockInstances.length > 0 && (
                      <select
                        aria-label={`Chọn nhanh thiết bị trong kho cho mục ${line.orderItemId}`}
                        value={
                          inStockInstances.some(
                            (inst) => inst.serialNumber === currentSerial,
                          )
                            ? currentSerial
                            : ""
                        }
                        onChange={(e) =>
                          onSerialChange(line.orderItemId, e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 outline-none focus:border-blue-600"
                      >
                        <option value="">
                          -- Chọn nhanh thiết bị IN_STOCK trong kho ({inStockInstances.length}) --
                        </option>
                        {inStockInstances.map((inst) => (
                          <option key={inst.instanceId} value={inst.serialNumber}>
                            {inst.serialNumber} — {inst.modelName || `Model #${inst.modelId}`} (MAC: {inst.macAddress})
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={currentSerial}
                        onChange={(e) =>
                          onSerialChange(line.orderItemId, e.target.value)
                        }
                        placeholder="Nhập hoặc quét Serial Number (VD: LMT-64X64-SEED-0001)"
                        aria-label={`Serial Number cho mục ${line.orderItemId}`}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs text-gray-900 outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        disabled={isLinkingThis}
                        onClick={() => onLink(line.orderItemId)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0F5B38] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#0c4a2d] disabled:opacity-50"
                      >
                        {isLinkingThis ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <QrCode size={13} />
                        )}
                        {isLinkingThis ? "Đang gán..." : "Gán thiết bị LED"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] italic text-gray-500">
                    Đơn hàng không ở trạng thái Chờ đóng hàng (PROCESSING / PARTIALLY_FULFILLED) nên không thể chỉnh sửa gán thiết bị.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
