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
  Pencil,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import EditOrderDeliveryAddressModal from "@/components/ui/EditOrderDeliveryAddressModal";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderKind } from "@/features/order/fulfillment";
import type { OrderKind } from "@/features/order/types";
import {
  fetchLedInstances,
  fetchManagedLedModels,
  LedInstanceFilterRequest,
  LedInstanceItem,
} from "@/lib/api/ledInstances";
import { fetchStoreProductDetail } from "@/lib/api/products";
import {
  apiLinkOrderFulfillmentDevice,
  apiUnlinkOrderFulfillmentDevice,
  fetchStaffOrderDetail,
  type BackendStaffOrderDetail,
  type LinkOrderFulfillmentDeviceResponse,
  type UpdateStaffDeliveryAddressRequest,
} from "@/lib/api/orders";
import { fetchAllPages } from "@/lib/api/paging";

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
    id: "SGN-EXPRESS",
    name: "SGN-EXPRESS — Giao hỏa tốc nội thành TP.HCM (Lấy & giao ngay)",
  },
  {
    id: "SGN-SAMEDAY",
    name: "SGN-SAMEDAY — Giao trong ngày nội thành TP.HCM (Tiết kiệm)",
  },
  {
    id: "SGN-SUPER",
    name: "SGN-SUPER — Siêu tốc TP.HCM (Ưu tiên tài xế gần nhất)",
  },
  {
    id: "SGN-BULKY",
    name: "SGN-BULKY — Xe máy chở hàng cồng kềnh TP.HCM (Nhiều bảng LED)",
  },
  {
    id: "SGN-VAN-500",
    name: "SGN-VAN-500 — Xe Van 500kg (Nội thành không cấm tải)",
  },
  {
    id: "SGN-TRUCK-500",
    name: "SGN-TRUCK-500 — Xe tải 500kg (Đơn sỉ số lượng lớn)",
  },
  {
    id: "SGN-TRUCK-1000",
    name: "SGN-TRUCK-1000 — Xe tải 1 tấn (Đơn đại lý / sự kiện)",
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
    id: "HAN-BIKE",
    name: "HAN-BIKE — Xe máy nội thành Hà Nội",
  },
  {
    id: "HAN-EXPRESS",
    name: "HAN-EXPRESS — Giao hỏa tốc nội thành Hà Nội",
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
  PENDING_PAYMENT: { label: "CHỜ THANH TOÁN", bg: "bg-[#fef08a]", text: "text-black" },
  PROCESSING: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-[#e0f2fe]", text: "text-black" },
  PARTIALLY_FULFILLED: { label: "ĐÃ CẤP NV & CHỜ ĐÓNG HÀNG", bg: "bg-[#ede9fe]", text: "text-black" },
  SHIPPING: { label: "ĐANG VẬN CHUYỂN", bg: "bg-[#e0f2fe]", text: "text-black" },
  DELIVERED: { label: "ĐÃ GIAO", bg: "bg-primary/50", text: "text-black" },
  COMPLETED: { label: "ĐÃ HOÀN THÀNH", bg: "bg-primary", text: "text-black" },
  DELIVERY_FAILED: { label: "VẬN CHUYỂN THẤT BẠI", bg: "bg-[#fed7aa]", text: "text-black" },
  REFUNDED: { label: "ĐÃ HOÀN TIỀN", bg: "bg-gray-200", text: "text-black" },
  CANCELED: { label: "ĐÃ HỦY", bg: "bg-[#fecaca]", text: "text-black" },
  PendingPayment: { label: "CHỜ THANH TOÁN", bg: "bg-[#fef08a]", text: "text-black" },
  Preparing: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-[#e0f2fe]", text: "text-black" },
  HandedOver: { label: "ĐÃ CẤP NV & CHỜ ĐÓNG HÀNG", bg: "bg-[#ede9fe]", text: "text-black" },
  Shipping: { label: "ĐANG VẬN CHUYỂN", bg: "bg-[#e0f2fe]", text: "text-black" },
  Delivered: { label: "ĐÃ GIAO", bg: "bg-primary/50", text: "text-black" },
  Completed: { label: "ĐÃ HOÀN THÀNH", bg: "bg-primary", text: "text-black" },
  Cancelled: { label: "ĐÃ HỦY", bg: "bg-[#fecaca]", text: "text-black" },
  Pending: { label: "CHỜ THANH TOÁN", bg: "bg-[#fef08a]", text: "text-black" },
  Confirmed: { label: "CHỜ ĐÓNG HÀNG", bg: "bg-[#e0f2fe]", text: "text-black" },
};

const ORDER_KIND_BADGE: Record<OrderKind, { label: string; className: string }> = {
  PHYSICAL: { label: "Physical", className: "border border-black bg-[#e0f2fe] text-black" },
  MIXED: { label: "Mixed", className: "border border-black bg-[#ede9fe] text-black" },
  DIGITAL: { label: "Character", className: "border border-black bg-primary/40 text-black" },
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
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
  const { orders, refreshOrders, updateOrderStatus, updateOrderDeliveryAddress, dispatchOrder } = useOrders();

  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isEditAddressModalOpen, setIsEditAddressModalOpen] = useState(false);
  const [actionSuccessBanner, setActionSuccessBanner] = useState("");
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
  const [inStockByModelId, setInStockByModelId] = useState<Record<number, LedInstanceItem[]>>({});
  const [itemModelIdsMap, setItemModelIdsMap] = useState<Record<number, number[]>>({});
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
      const [detailRes, modelsRes] = await Promise.allSettled([
        fetchStaffOrderDetail(numericOrderId),
        fetchManagedLedModels(),
      ]);

      const detail = detailRes.status === "fulfilled" ? detailRes.value : null;
      if (detail) {
        setStaffDetail(detail);
      }

      const managedModels = modelsRes.status === "fulfilled" ? modelsRes.value : [];
      const modelIdByProductId = new Map<number, number>();
      const modelIdByName = new Map<string, number>();
      for (const m of managedModels) {
        if (m.productId != null && m.modelId != null) {
          modelIdByProductId.set(Number(m.productId), Number(m.modelId));
        }
        if (m.modelName && m.modelId != null) {
          modelIdByName.set(m.modelName.trim().toLowerCase(), Number(m.modelId));
        }
      }

      const nextItemModelIds: Record<number, number[]> = {};
      const physicalDetailItems = (detail?.items ?? []).filter(
        (item) => item.productType !== "CHARACTER" && item.productType !== "SUBSCRIPTION",
      );

      await Promise.all(
        physicalDetailItems.map(async (item) => {
          const typeUpper = (item.productType ?? "LED").toUpperCase();
          if (typeUpper === "BUNDLE") {
            const productDetail = await fetchStoreProductDetail(item.productId).catch(() => null);
            const bundleModelIds = Array.from(
              new Set(
                (productDetail?.bundleDetails?.items ?? [])
                  .filter((bi) => bi.itemType === "LED" && bi.modelId != null)
                  .map((bi) => Number(bi.modelId)),
              ),
            );
            nextItemModelIds[item.orderItemId] = bundleModelIds;
          } else {
            const resolvedModelId =
              modelIdByProductId.get(Number(item.productId)) ??
              modelIdByName.get(item.productName.trim().toLowerCase());
            nextItemModelIds[item.orderItemId] =
              resolvedModelId != null ? [resolvedModelId] : [];
          }
        }),
      );

      setItemModelIdsMap(nextItemModelIds);

      const uniqueModelIds = Array.from(
        new Set(Object.values(nextItemModelIds).flat()),
      );

      if (uniqueModelIds.length > 0) {
        const [inStockEntries, allModelEntries] = await Promise.all([
          Promise.all(
            uniqueModelIds.map(async (modelId) => {
              const items = await fetchAllPages(async (page) => {
                const res = await fetchLedInstances({
                  page,
                  size: 100,
                  modelId,
                  status: LedInstanceFilterRequest.status.IN_STOCK,
                });
                return { items: res.items, totalPages: res.meta.totalPages };
              }).catch(() => [] as LedInstanceItem[]);
              return [modelId, items] as const;
            }),
          ),
          Promise.all(
            uniqueModelIds.map((modelId) =>
              fetchAllPages(async (page) => {
                const res = await fetchLedInstances({ page, size: 100, modelId });
                return { items: res.items, totalPages: res.meta.totalPages };
              }).catch(() => [] as LedInstanceItem[]),
            ),
          ),
        ]);

        const nextInStockByModel: Record<number, LedInstanceItem[]> = {};
        for (const [mId, list] of inStockEntries) {
          nextInStockByModel[mId] = list;
        }
        setInStockByModelId(nextInStockByModel);

        const dedupedInstances = new Map<number, LedInstanceItem>();
        for (const list of allModelEntries) {
          for (const inst of list) {
            dedupedInstances.set(inst.instanceId, inst);
          }
        }
        setWarehouseInstances(Array.from(dedupedInstances.values()));
      } else {
        setInStockByModelId({});
        const fallbackRes = await fetchLedInstances({ page: 0, size: 100 }).catch(() => ({
          items: [] as LedInstanceItem[],
        }));
        setWarehouseInstances(fallbackRes.items);
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
      <div className="manager-neo-dashboard mx-auto flex w-full max-w-4xl flex-col items-center justify-center py-20 text-center font-sans">
        <div className="neo-box-no-hover bg-white p-8">
          <h2 className="mb-2 text-2xl font-black uppercase text-black">Không tìm thấy đơn hàng #{orderId}</h2>
          <p className="mb-6 text-sm font-medium text-text-muted">
            Đơn hàng không tồn tại hoặc đã bị xóa khỏi hệ thống.
          </p>
          <Link
            href="/staff/orders"
            className="btn-primary inline-flex items-center gap-2 px-5! py-2.5! text-xs font-black uppercase"
          >
            <ArrowLeft size={15} /> Quay lại danh sách đơn hàng
          </Link>
        </div>
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

  const isDeliveryFailedOrder = order.status === "DELIVERY_FAILED";
  const deliveryAttemptCount =
    staffDetail?.delivery?.deliveryAttemptCount ?? order.delivery?.attemptCount ?? 0;
  const maxDeliveryAttempts =
    staffDetail?.delivery?.maxDeliveryAttempts ?? order.delivery?.maxAttempts ?? 3;
  const maxRedeliveryAttempts = Math.max(0, maxDeliveryAttempts - 1);
  const remainingRedeliveries = Math.max(0, maxDeliveryAttempts - deliveryAttemptCount);
  const canRedeliver = isDeliveryFailedOrder && remainingRedeliveries > 0;
  const deliveryFailureReason =
    staffDetail?.delivery?.failureReason || order.delivery?.failureReason || null;
  const canStaffCancelUnpaid =
    order.status === "PENDING_PAYMENT" ||
    order.status === "PendingPayment" ||
    order.status === "Pending";
  const canEditDeliveryAddress =
    hasPhysicalItem &&
    isDeliveryNotDispatched &&
    (canStaffCancelUnpaid || isReadyStatus || isDeliveryFailedOrder);

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
  const inStockByItemMap = new Map<number, LedInstanceItem[]>();
  for (const line of physicalLineItems) {
    const modelIds = itemModelIdsMap[line.orderItemId] ?? [];
    const seen = new Set<number>();
    const matching: LedInstanceItem[] = [];
    for (const mId of modelIds) {
      for (const inst of inStockByModelId[mId] ?? []) {
        if (inst.status === LedInstanceItem.status.IN_STOCK && !seen.has(inst.instanceId)) {
          seen.add(inst.instanceId);
          matching.push(inst);
        }
      }
    }
    inStockByItemMap.set(line.orderItemId, matching);
  }
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
      await updateOrderStatus(order.id, "CANCELED");
      await loadFulfillmentData();
      setIsCancelModalOpen(false);
      setActionSuccessBanner("Đã hủy đơn hàng chưa thanh toán và hoàn lại tồn kho LED.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Hủy đơn hàng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrepareRedelivery = async () => {
    if (isSubmitting || !canRedeliver) return;
    setIsSubmitting(true);
    setErrorMessage("");
    setActionSuccessBanner("");
    try {
      await updateOrderStatus(order.id, "PROCESSING");
      await loadFulfillmentData();
      setActionSuccessBanner(
        "Đã chuyển đơn sang Chờ đóng hàng để giao lại. Bạn có thể kiểm tra thiết bị LED và bấm \"Chuẩn bị hàng\" để tạo vận đơn AhaMove mới.",
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Không thể chuyển đơn sang trạng thái giao lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");
    setActionSuccessBanner("");
    try {
      await updateOrderStatus(order.id, "REFUNDED", refundReason.trim() || undefined);
      await loadFulfillmentData();
      setIsRefundModalOpen(false);
      setRefundReason("");
      setActionSuccessBanner(
        "Đã chuyển đơn sang Hoàn tiền (REFUNDED), nhập lại tồn kho & thiết bị LED về kho và thu hồi nhân vật đi kèm (nếu có).",
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Hoàn tiền đơn hàng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditAddressModal = () => {
    setErrorMessage("");
    setIsEditAddressModalOpen(true);
  };

  const handleSaveDeliveryAddress = async (payload: UpdateStaffDeliveryAddressRequest) => {
    await updateOrderDeliveryAddress(order.id, payload);
    await loadFulfillmentData();
    setActionSuccessBanner("Đã cập nhật thông tin người nhận, địa chỉ và tọa độ giao hàng.");
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
    <div className="manager-neo-dashboard mx-auto flex w-full max-w-[1400px] flex-col gap-5 font-sans text-black">
      {/* Top Navigation & Stepper Bar */}
      <div className="neo-box-no-hover bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-3">
          <Link
            href="/staff/orders"
            className="btn-secondary inline-flex items-center gap-1.5 px-3! py-1.5! text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
          >
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            Tiến trình xử lý đơn hàng
          </h2>
          <div className="hidden w-12 md:block" />
        </div>

        {/* Stepper */}
        <div className="relative mt-3 flex items-center justify-between overflow-x-auto py-1.5">
          {orderSteps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  {isDone ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black bg-primary text-black">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="whitespace-pre-line text-center text-xs font-black text-primary-ink">
                        {step.label}
                      </span>
                    </div>
                  ) : isCurrent ? (
                    <div className="flex items-center gap-1.5 border-2 border-black bg-primary px-3 py-1 text-xs font-black text-black shadow-[2px_2px_0_0_#000]">
                      <Truck size={14} className="animate-pulse" />
                      <span>{step.label.toUpperCase().replace("\n", " ")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-black/30 bg-gray-100 text-gray-400">
                        <Circle size={10} />
                      </div>
                      <span className="whitespace-pre-line text-center text-xs font-bold text-text-muted">
                        {step.label}
                      </span>
                    </div>
                  )}
                </div>

                {idx < orderSteps.length - 1 && (
                  <div className="mx-2 flex-1">
                    {idx < currentStepIndex ? (
                      <div className="h-0.5 w-full bg-black" />
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
          className="neo-box-no-hover flex flex-wrap items-center justify-between gap-3 border-l-8 border-l-[#2d6a4f] bg-primary/25 px-4 py-3 text-xs font-bold text-black sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-primary-ink" />
            <span>
              Đóng gói và bàn giao AhaMove thành công! Mã vận đơn:{" "}
              <strong className="font-mono">#{dispatchSuccessBanner.trackingNumber}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dispatchSuccessBanner.trackingUrl && (
              <a
                href={dispatchSuccessBanner.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink underline"
              >
                <ExternalLink size={13} /> Theo dõi hành trình tài xế
              </a>
            )}
            <button
              type="button"
              onClick={() => setDispatchSuccessBanner(null)}
              className="btn-secondary p-1!"
              aria-label="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Action Success Notification Banner */}
      {actionSuccessBanner && (
        <div
          role="status"
          className="neo-box-no-hover flex flex-wrap items-center justify-between gap-3 border-l-8 border-l-[#2d6a4f] bg-primary/25 px-4 py-3 text-xs font-bold text-black sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-primary-ink" />
            <span>{actionSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessBanner("")}
            className="btn-secondary p-1!"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Delivery Failed Alert & Action Panel */}
      {isDeliveryFailedOrder && (
        <div
          role="alert"
          className="neo-box-no-hover border-l-8 border-l-orange-500 bg-[#fff7ed] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-orange-700" />
              <div className="space-y-1 text-sm text-black">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black uppercase">Đơn hàng giao thất bại — Cần nhân viên xử lý</p>
                  <span className="border border-black bg-[#fed7aa] px-2 py-0.5 text-[11px] font-black text-black">
                    Số lần giao: {deliveryAttemptCount}/{maxDeliveryAttempts}
                    {remainingRedeliveries > 0
                      ? ` (Còn ${remainingRedeliveries}/${maxRedeliveryAttempts} lần giao lại)`
                      : " (Đã hết lượt giao lại)"}
                  </span>
                </div>
                {deliveryFailureReason && (
                  <p className="text-xs font-medium text-black">
                    <strong>Lý do từ đơn vị vận chuyển:</strong> {deliveryFailureReason}
                  </p>
                )}
                <p className="text-xs font-medium text-text-muted">
                  {canRedeliver
                    ? "Bạn có thể sửa thông tin người nhận (nếu cần) rồi chọn \"Chuẩn bị giao lại\" để tạo vận đơn AhaMove mới, hoặc chọn \"Hoàn hàng & Hoàn tiền\" nếu khách không nhận nữa."
                    : `Đơn hàng đã đạt giới hạn tối đa ${maxRedeliveryAttempts} lần giao lại. Vui lòng thực hiện \"Hoàn hàng & Hoàn tiền\" để nhập lại kho thiết bị LED và thu hồi nhân vật số đi kèm.`}
                </p>
                {errorMessage && !isRefundModalOpen && !isEditAddressModalOpen && (
                  <p className="pt-1 text-xs font-bold text-red-700">{errorMessage}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handlePrepareRedelivery()}
                disabled={isSubmitting || !canRedeliver}
                title={
                  canRedeliver
                    ? "Chuyển đơn về Chờ đóng hàng để tạo vận đơn giao lại"
                    : `Đã đạt tối đa ${maxRedeliveryAttempts} lần giao lại`
                }
                className="btn-primary inline-flex items-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase"
              >
                <RefreshCw size={13} className={isSubmitting ? "animate-spin" : ""} />
                Chuẩn bị giao lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setRefundReason(deliveryFailureReason || "");
                  setIsRefundModalOpen(true);
                }}
                disabled={isSubmitting}
                className="btn-danger inline-flex items-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase"
              >
                <RotateCcw size={13} /> Hoàn hàng &amp; Hoàn tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Header: ID, Badge, Date & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-black border-l-8 border-l-primary bg-white px-5 py-4 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-mono text-xl font-black uppercase tracking-tight text-black sm:text-2xl">
            Đơn hàng #ORD-{order.id}
          </h1>
          <span
            className={`border border-black px-2.5 py-0.5 text-[11px] font-black uppercase shadow-[1px_1px_0_0_#000] ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
          <span className={`px-2 py-0.5 text-[11px] font-black uppercase ${kindBadge.className}`}>
            Loại: {kindBadge.label}
          </span>
          <span className="font-mono text-xs font-semibold text-text-muted">
            Ngày tạo: {formatDate(order.createdAt)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
          >
            <Printer size={14} /> In hóa đơn
          </button>

          {canPrepareOrder && (
            <button
              type="button"
              onClick={handleOpenPrepareModal}
              className="btn-primary inline-flex items-center gap-1.5 px-4! py-1.5! text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              <Package size={14} /> Chuẩn bị hàng
            </button>
          )}

          {canStaffCancelUnpaid && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setIsCancelModalOpen(true);
              }}
              className="btn-danger inline-flex items-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              <XCircle size={14} /> Hủy đơn
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
        {/* Left Column: Danh sách sản phẩm & Quét/Gán thiết bị LED */}
        <div className="flex flex-col gap-5">
        <div className="neo-box-no-hover bg-white p-5">
          <h2 className="mb-4 border-b-2 border-black pb-2.5 text-sm font-black uppercase tracking-wider text-black">
            Danh sách sản phẩm
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] border-collapse text-left text-xs text-black">
              <thead>
                <tr className="border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <th className="px-3 py-2.5 text-left">Ảnh</th>
                  <th className="px-3 py-2.5 text-left">Tên</th>
                  <th className="px-3 py-2.5 text-left">Phân loại</th>
                  <th className="px-3 py-2.5 text-right">Đơn giá</th>
                  <th className="px-3 py-2.5 text-center">SL</th>
                  <th className="px-3 py-2.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {order.items.map((item, index) => {
                  const isCharacter = item.productType === "CHARACTER";
                  const isLed = item.productType === "LED_MODEL";

                  return (
                    <tr key={`${item.id}-${index}`} className="hover:bg-[#f3faf5]">
                      <td className="px-3 py-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden border-2 border-black bg-gray-100">
                          {item.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-lg">🦊</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-black text-black">{item.name}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-text-muted">
                          {isCharacter
                            ? "Đã cấp trực tiếp"
                            : isLed
                            ? "Thiết bị phần cứng"
                            : "Sản phẩm hệ thống"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {isCharacter ? (
                          <span className="inline-block whitespace-nowrap border border-black bg-[#ede9fe] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            Vật phẩm ảo (Digital)
                          </span>
                        ) : isLed ? (
                          <span className="inline-block whitespace-nowrap border border-black bg-[#e0f2fe] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            Bảng LED (Vật lý)
                          </span>
                        ) : (
                          <span className="inline-block whitespace-nowrap border border-black bg-primary/40 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            Gói combo (Bundle)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-black">
                        {formatMoney(item.price)}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-black text-black">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-black">
                        {formatMoney(item.price * item.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Block */}
          <div className="mt-5 flex flex-col items-end gap-1.5 border-t-2 border-black pt-4 text-xs">
            <div className="flex w-64 justify-between font-semibold text-text-muted">
              <span>Tạm tính:</span>
              <span className="font-mono font-bold text-black">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex w-64 justify-between font-semibold text-text-muted">
              <span>Phí vận chuyển:</span>
              <span className="font-mono font-bold text-black">{formatMoney(order.shipping)}</span>
            </div>
            <div className="flex w-64 justify-between font-semibold text-text-muted">
              <span>Giảm giá:</span>
              <span className="font-mono font-bold text-black">{formatMoney(0)}</span>
            </div>
            <div className="mt-1 flex w-64 justify-between border-t-2 border-dashed border-gray-300 pt-2 text-sm font-black uppercase text-black">
              <span>Tổng cộng:</span>
              <span className="font-mono">{formatMoney(order.total)}</span>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 border border-black bg-[#e9f5ed] px-2.5 py-1 text-xs font-black text-primary-ink">
              <CheckCircle2 size={14} />
              <span>
                {order.paymentStatus === "Paid"
                  ? `Đã thanh toán (SePay - ${formatDate(order.paidAt || order.createdAt)})`
                  : "Chờ thanh toán (SePay)"}
              </span>
            </div>
          </div>
        </div>
        </div>

        {/* Right Column: 2 Cards */}
        <div className="flex flex-col gap-5">
          {/* Card 1: Thông tin giao hàng */}
          <div className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-2 border-b-2 border-black pb-2.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-black">
                Thông tin giao hàng
              </h2>
              {canEditDeliveryAddress && (
                <button
                  type="button"
                  onClick={handleOpenEditAddressModal}
                  className="btn-secondary inline-flex items-center gap-1.5 px-2.5! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  <Pencil size={12} /> Cập nhật địa chỉ
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <p>
                <strong className="font-black uppercase text-black">Khách hàng: </strong>
                <span className="font-semibold text-black">
                  {staffDetail?.delivery?.recipientName || order.address.fullName || order.customer.fullName}
                </span>
              </p>
              <p>
                <strong className="font-black uppercase text-black">Điện thoại: </strong>
                <span className="font-mono font-semibold text-black">
                  {staffDetail?.delivery?.recipientPhone || order.address.phoneNumber || "—"}
                </span>
              </p>
              <p>
                <strong className="font-black uppercase text-black">Địa chỉ: </strong>
                <span className="font-medium text-black">
                  {staffDetail?.delivery?.fullAddress || order.address.fullAddress}
                </span>
              </p>
              <p>
                <strong className="font-black uppercase text-black">Ghi chú: </strong>
                <span className="font-medium text-text-muted">Giao giờ hành chính, gọi trước khi giao.</span>
              </p>

              <div className="mt-2 border-2 border-black bg-[#f7fbf8] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-text-muted">Đơn vị giao hàng:</span>
                  <span className="text-xs font-black text-black">AhaMove (Hỏa tốc)</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-text-muted">Mã vận đơn:</span>
                  <span className="font-mono text-xs font-black text-primary-ink">
                    {isJourneyActive
                      ? order.delivery?.orderId || `DEL-${order.id}`
                      : "Chưa tạo vận đơn"}
                  </span>
                </div>
                {hasPhysicalItem && (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-text-muted">Lượt giao hàng:</span>
                    <span className="font-mono text-xs font-black text-black">
                      {deliveryAttemptCount}/{maxDeliveryAttempts} (tối đa {maxRedeliveryAttempts} lần giao lại)
                    </span>
                  </div>
                )}
                {deliveryFailureReason && (
                  <div className="mt-2 border border-black bg-[#fed7aa] px-2.5 py-1.5 text-xs font-medium text-black">
                    <strong>Ghi chú sự cố:</strong> {deliveryFailureReason}
                  </div>
                )}
                {typeof order.delivery?.carrierFee === "number" && (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-text-muted">Cước AhaMove:</span>
                    <span className="font-mono text-xs font-black text-black">
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
                      className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink underline"
                    >
                      <ExternalLink size={12} /> Theo dõi lộ trình trên AhaMove
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Hành trình vận chuyển */}
          <div className="neo-box-no-hover bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-black">
                Hành trình vận chuyển
              </h2>
              {isJourneyActive ? (
                <span className="inline-flex items-center gap-1.5 border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  <span className="h-1.5 w-1.5 animate-ping bg-black" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center border border-black bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-text-muted">
                  Chưa kích hoạt
                </span>
              )}
            </div>

            {!isJourneyActive && (
              <div className="mb-4 border-2 border-dashed border-black/30 bg-[#f7fbf8] px-3 py-2 text-xs font-medium text-text-muted">
                Hành trình sẽ tự động kích hoạt sau khi bạn bấm{" "}
                <strong className="font-black text-black">Chuẩn bị hàng</strong> ➔{" "}
                <strong className="font-black text-black">Đóng gói hàng</strong> để bàn giao cho AhaMove.
              </div>
            )}

            <div className="relative flex flex-col gap-3.5 pl-2">
              {timelineMilestones.map((milestone, idx) => {
                const isLast = idx === timelineMilestones.length - 1;

                return (
                  <div key={milestone.title} className="relative flex items-start gap-3">
                    {!isLast && (
                      <div
                        className={`absolute left-[7px] top-[18px] bottom-[-14px] w-0.5 ${
                          milestone.status === "done" ? "bg-black" : "bg-gray-200"
                        }`}
                      />
                    )}

                    <div className="relative z-10 shrink-0">
                      {milestone.status === "done" ? (
                        <div className="flex h-4 w-4 items-center justify-center border border-black bg-primary text-black">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      ) : milestone.status === "current" ? (
                        <div className="flex h-4 w-4 items-center justify-center border-2 border-black bg-[#fef08a]">
                          <div className="h-1.5 w-1.5 bg-black" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 border-2 border-gray-300 bg-white" />
                      )}
                    </div>

                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {milestone.time && (
                          <span className="font-mono text-[11px] font-bold text-text-muted">
                            {milestone.time} -
                          </span>
                        )}
                        <span
                          className={`text-xs font-black ${
                            milestone.status === "done"
                              ? "text-primary-ink"
                              : milestone.status === "current"
                              ? "text-black"
                              : "text-gray-400"
                          }`}
                        >
                          {milestone.title}
                        </span>
                      </div>
                      {milestone.status !== "pending" && milestone.subTitle && (
                        <p className="mt-0.5 text-[11px] font-medium text-text-muted">{milestone.subTitle}</p>
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
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
          >
            {/* Header Pop-up */}
            <div className="flex items-center justify-between border-b-2 border-black bg-[#f7fbf8] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
                  <Package size={18} />
                </div>
                <div>
                  <h3 id="prepare-order-title" className="text-sm font-black uppercase text-black sm:text-base">
                    Chuẩn bị hàng &amp; Bàn giao vận chuyển AhaMove
                  </h3>
                  <p className="text-xs font-medium text-text-muted">
                    Đơn hàng #ORD-{order.id} · Truy xuất thông tin khách hàng &amp; kiện hàng trước khi xuất kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrepareModalOpen(false)}
                disabled={isSubmitting}
                className="btn-secondary p-1.5!"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Pop-up (Scrollable, 2-column spacious layout) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* Cột trái: Thông tin nhận hàng + Quét/Gán thiết bị LED */}
                <div className="flex flex-col gap-5 lg:col-span-7">
                  {/* 1. Thông tin khách hàng & Địa chỉ giao hàng truy xuất từ đơn hàng */}
                  <section className="border-2 border-black bg-[#f7fbf8] p-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                      <User size={14} /> Thông tin khách hàng nhận hàng
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-gray-500">Người nhận:</span>
                        <p className="mt-0.5 font-bold text-gray-900">
                          {staffDetail?.delivery?.recipientName || order.address.fullName || order.customer.fullName}
                        </p>
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Phone size={11} /> Số điện thoại:
                        </span>
                        <p className="mt-0.5 font-bold text-gray-900">
                          {staffDetail?.delivery?.recipientPhone || order.address.phoneNumber || "Chưa có số điện thoại"}
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
                        <p className="mt-0.5 font-bold text-gray-900">
                          {staffDetail?.delivery?.fullAddress || order.address.fullAddress}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 2b. Quét QR / Gán Serial Number thiết bị LED thực tế */}
                  {hasPhysicalItem && (
                    <FulfillmentDevicesPanel
                      compact
                      orderId={order.id}
                      physicalLineItems={physicalLineItems}
                      linkedByItemMap={linkedByItemMap}
                      inStockByItemMap={inStockByItemMap}
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

                {/* Cột phải: Sản phẩm cần đóng gói + Thông số AhaMove */}
                <div className="flex flex-col gap-5 lg:col-span-5">
                  {/* 2. Danh sách sản phẩm trong đơn hàng cần đóng gói */}
                  <section className="border-2 border-black bg-white p-4">
                    <div className="mb-3 flex items-center justify-between border-b-2 border-black pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-black">
                        Sản phẩm cần đóng gói ({order.items.length} mặt hàng)
                      </h4>
                      <span className="font-mono text-xs font-black text-primary-ink">
                        Tổng giá trị: {formatMoney(order.total)}
                      </span>
                    </div>
                    <div className="divide-y-2 divide-black/10">
                      {order.items.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="flex items-center justify-between gap-3 py-2 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="h-9 w-9 shrink-0 overflow-hidden border-2 border-black bg-gray-100">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
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
                              <p className="truncate font-black text-black">{item.name}</p>
                              <p className="text-[11px] font-medium text-text-muted">
                                {item.productType === "CHARACTER"
                                  ? "Vật phẩm ảo (Đã cấp trực tiếp)"
                                  : item.productType === "LED_MODEL"
                                  ? "Bảng LED (Cần đóng gói vật lý)"
                                  : "Gói Combo"}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono font-black text-black">× {item.quantity}</p>
                            <p className="font-mono text-[11px] font-semibold text-text-muted">
                              {formatMoney(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 3. Thông số bàn giao AhaMove */}
                  <section className="flex flex-col gap-3 border-2 border-black bg-[#e9f5ed] p-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                      <Truck size={14} /> Thông số điều phối AhaMove
                    </h4>

                    <div>
                      <label htmlFor="dispatch-service-id" className="text-xs font-black uppercase text-black">
                        Gói dịch vụ vận chuyển (serviceId) <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="dispatch-service-id"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black outline-none"
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
                        <label htmlFor="dispatch-weight" className="text-xs font-black uppercase text-black">
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
                          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold text-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-black">Đơn vị giao vận</label>
                        <input
                          readOnly
                          value="AhaMove Partner v3"
                          className="mt-1 w-full border-2 border-black bg-gray-100 px-3 py-2 text-xs font-bold text-text-muted"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dispatch-remarks" className="text-xs font-black uppercase text-black">
                        Ghi chú dặn dò tài xế (remarks)
                      </label>
                      <textarea
                        id="dispatch-remarks"
                        rows={3}
                        maxLength={500}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Ví dụ: Linh kiện LED dễ vỡ, gọi trước khi giao..."
                        className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-xs font-medium text-black outline-none"
                      />
                    </div>
                  </section>
                </div>
              </div>

              {errorMessage && !isEditAddressModalOpen && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-red-800"
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Footer Pop-up với nút "Đóng gói hàng" */}
            <div className="flex items-center justify-end gap-2.5 border-t-2 border-black bg-[#f7fbf8] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsPrepareModalOpen(false)}
                disabled={isSubmitting}
                className="btn-secondary px-4! py-2! text-xs font-black uppercase"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex items-center gap-2 px-5! py-2! text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={20} />
              <h3 className="text-base font-black uppercase text-black">Xác nhận hủy đơn hàng</h3>
            </div>
            <p className="mt-2 text-xs font-medium text-text-muted">
              Bạn có chắc chắn muốn hủy đơn hàng <strong className="text-black">#ORD-{order.id}</strong> không? Hành động này sẽ
              đổi trạng thái đơn thành <strong className="font-mono text-black">CANCELED</strong>.
            </p>

            {errorMessage && (
              <p className="mt-3 text-xs font-bold text-red-700">{errorMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isSubmitting}
                className="btn-secondary px-4! py-2! text-xs font-black uppercase"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isSubmitting}
                className="btn-danger px-4! py-2! text-xs font-black uppercase"
              >
                {isSubmitting ? "Đang hủy..." : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Hoàn hàng & Hoàn tiền (DELIVERY_FAILED -> REFUNDED) */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
            <div className="flex items-center gap-2 text-red-700">
              <RotateCcw size={20} />
              <h3 className="text-base font-black uppercase text-black">
                Xác nhận hoàn hàng &amp; hoàn tiền
              </h3>
            </div>
            <p className="mt-2 text-xs font-medium text-text-muted">
              Đơn hàng <strong className="text-black">#ORD-{order.id}</strong> sẽ được chuyển sang trạng thái{" "}
              <strong className="font-mono text-black">REFUNDED (Đã hoàn tiền)</strong>. Hệ thống sẽ tự động thực hiện:
            </p>
            <ul className="mt-2.5 list-disc space-y-1 pl-5 text-xs font-medium text-black">
              <li>Cộng trả lại tồn kho <strong>mẫu LED</strong> trong hệ thống.</li>
              <li>Gỡ liên kết serial thiết bị LED đã đóng gói và trả về trạng thái <strong>Trong kho (IN_STOCK)</strong>.</li>
              <li>Thu hồi toàn bộ <strong>quyền sở hữu nhân vật số</strong> đi kèm đơn hàng này (nếu là đơn kết hợp).</li>
              <li>Chuyển trạng thái vận đơn sang <strong>Hoàn hàng (RETURNED)</strong>.</li>
            </ul>

            <div className="mt-4">
              <label htmlFor="refund-reason-input" className="text-xs font-black uppercase text-black">
                Lý do hoàn hàng / hoàn tiền
              </label>
              <textarea
                id="refund-reason-input"
                rows={3}
                maxLength={500}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ví dụ: Khách từ chối nhận hàng sau 2 lần giao lại, xác nhận nhập kho và hoàn tiền..."
                className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-xs font-medium text-black outline-none"
              />
            </div>

            {errorMessage && (
              <p className="mt-3 text-xs font-bold text-red-700">{errorMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                disabled={isSubmitting}
                className="btn-secondary px-4! py-2! text-xs font-black uppercase"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRefund()}
                disabled={isSubmitting}
                className="btn-danger inline-flex items-center gap-1.5 px-4! py-2! text-xs font-black uppercase"
              >
                <RotateCcw size={14} />
                {isSubmitting ? "Đang xử lý hoàn tiền..." : "Xác nhận hoàn tiền"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cập nhật địa chỉ giao hàng (trình bày đồng bộ với Customer Address + Goong Map) */}
      <EditOrderDeliveryAddressModal
        isOpen={isEditAddressModalOpen}
        orderId={order.id}
        initialData={{
          recipientName:
            staffDetail?.delivery?.recipientName || order.address.fullName || order.customer.fullName || "",
          recipientPhone: staffDetail?.delivery?.recipientPhone || order.address.phoneNumber || "",
          fullAddress: staffDetail?.delivery?.fullAddress || order.address.fullAddress || "",
          latitude: staffDetail?.delivery?.latitude ?? order.delivery?.latitude,
          longitude: staffDetail?.delivery?.longitude ?? order.delivery?.longitude,
        }}
        onClose={() => setIsEditAddressModalOpen(false)}
        onSave={handleSaveDeliveryAddress}
      />
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
  inStockByItemMap: Map<number, LedInstanceItem[]>;
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
  inStockByItemMap,
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
          ? "border-2 border-black bg-[#f7fbf8] p-4"
          : "neo-box-no-hover bg-white p-5"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-[#e0f2fe] text-black shadow-[2px_2px_0_0_#000]">
            <QrCode size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-black sm:text-sm">
              Quét QR &amp; Gán thiết bị LED đóng hàng
            </h2>
            <p className="text-[11px] font-medium text-text-muted">
              Gán Serial Number thiết bị trong kho cho từng sản phẩm trước khi bàn giao vận chuyển
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center border border-black px-2 py-0.5 font-mono text-[11px] font-black ${
              isComplete
                ? "bg-primary text-black"
                : "bg-[#fef08a] text-black"
            }`}
          >
            Đã gán {totalLinked} / {totalRequired} thiết bị LED
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách thiết bị"
            className="btn-secondary p-1.5!"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 border-2 border-black bg-[#fee2e2] px-3 py-2 text-xs font-bold text-red-800"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 border-2 border-black bg-primary/25 px-3 py-2 text-xs font-bold text-black"
        >
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary-ink" />
          <span>{successMessage}</span>
        </div>
      )}

      {physicalLineItems.length === 0 ? (
        <p className="border-2 border-dashed border-black/30 bg-[#f7fbf8] px-3 py-4 text-center text-xs font-medium text-text-muted">
          {isLoading
            ? "Đang tải chi tiết Order Item từ hệ thống..."
            : "Không có mục LED / Bundle cần gán thiết bị hoặc thiếu orderItemId."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {physicalLineItems.map((line) => {
            const linkedList = linkedByItemMap.get(line.orderItemId) ?? [];
            const matchingInStock = inStockByItemMap.get(line.orderItemId) ?? [];
            const currentSerial = serialByItem[line.orderItemId] ?? "";
            const isLinkingThis = linkingItemId === line.orderItemId;

            return (
              <div
                key={line.orderItemId}
                className="border-2 border-black bg-[#f7fbf8] p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-black bg-primary px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                        Item #{line.orderItemId}
                      </span>
                      <span className="text-xs font-black text-black">
                        {line.productName}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-text-muted">
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
                        className="flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Cpu size={14} className="text-primary-ink" />
                          <span className="font-mono font-black text-black">
                            {inst.serialNumber}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-text-muted">
                            MAC: {inst.macAddress}
                          </span>
                          <span className="border border-black bg-[#e0f2fe] px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                            {inst.status}
                          </span>
                        </div>
                        {canLink && (
                          <button
                            type="button"
                            disabled={unlinkingInstanceId === inst.instanceId}
                            onClick={() => onUnlink(inst)}
                            className="btn-danger inline-flex items-center gap-1 px-2! py-1! text-[10px] font-black uppercase"
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
                    {matchingInStock.length > 0 ? (
                      <select
                        aria-label={`Chọn nhanh thiết bị trong kho cho mục ${line.orderItemId}`}
                        value={
                          matchingInStock.some(
                            (inst) => inst.serialNumber === currentSerial,
                          )
                            ? currentSerial
                            : ""
                        }
                        onChange={(e) =>
                          onSerialChange(line.orderItemId, e.target.value)
                        }
                        className="w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold text-black outline-none"
                      >
                        <option value="">
                          -- Chọn nhanh thiết bị IN_STOCK của mẫu này ({matchingInStock.length}) --
                        </option>
                        {matchingInStock.map((inst) => (
                          <option key={inst.instanceId} value={inst.serialNumber}>
                            {inst.serialNumber} — {inst.modelName || `Model #${inst.modelId}`} (MAC: {inst.macAddress})
                          </option>
                        ))}
                      </select>
                    ) : (
                      !isLoading && (
                        <p className="border-2 border-dashed border-black/40 bg-[#fef08a] px-3 py-1.5 text-[11px] font-bold text-black">
                          Không còn thiết bị IN_STOCK thuộc mẫu LED này trong kho.
                        </p>
                      )
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
                        className="flex-1 border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-bold text-black outline-none"
                      />
                      <button
                        type="button"
                        disabled={isLinkingThis}
                        onClick={() => onLink(line.orderItemId)}
                        className="btn-primary inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5! py-1.5! text-xs font-black uppercase"
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
                  <p className="mt-2 text-[11px] font-medium italic text-text-muted">
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
