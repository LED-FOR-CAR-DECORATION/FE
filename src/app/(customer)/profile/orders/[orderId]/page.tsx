"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, CheckCircle, CheckCircle2, Circle, Clock, Loader2, MapPin, Package, Truck, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useGallery } from "@/features/character/context/GalleryContext";
import SePayOrderPaymentCard from "@/features/order/components/SePayOrderPaymentCard";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment } from "@/features/order/fulfillment";
import type { OrderStatus, PaymentStatus } from "@/features/order/types";
import { formatPrice } from "@/lib/currency";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Chờ đóng hàng",
  PARTIALLY_FULFILLED: "Đã cấp nhân vật và chờ đóng hàng",
  SHIPPING: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  COMPLETED: "Đã hoàn thành",
  DELIVERY_FAILED: "Vận chuyển thất bại",
  REFUNDED: "Đã hoàn tiền",
  CANCELED: "Đã hủy",
  // Aliases for compatibility
  PendingPayment: "Chờ thanh toán",
  Preparing: "Chờ đóng hàng",
  HandedOver: "Đã cấp nhân vật và chờ đóng hàng",
  Shipping: "Đang vận chuyển",
  Delivered: "Đã giao",
  Completed: "Đã hoàn thành",
  Cancelled: "Đã hủy",
  Pending: "Chờ thanh toán",
  Confirmed: "Chờ đóng hàng",
};
const STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-400",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-400",
  PARTIALLY_FULFILLED: "bg-purple-100 text-purple-700 border-purple-400",
  SHIPPING: "bg-cyan-100 text-cyan-700 border-cyan-400",
  DELIVERED: "bg-teal-100 text-teal-700 border-teal-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-400",
  DELIVERY_FAILED: "bg-orange-100 text-orange-700 border-orange-400",
  REFUNDED: "bg-gray-100 text-gray-700 border-gray-400",
  CANCELED: "bg-red-100 text-red-700 border-red-400",
  // Aliases for compatibility
  PendingPayment: "bg-amber-100 text-amber-700 border-amber-400",
  Preparing: "bg-blue-100 text-blue-700 border-blue-400",
  HandedOver: "bg-purple-100 text-purple-700 border-purple-400",
  Shipping: "bg-cyan-100 text-cyan-700 border-cyan-400",
  Delivered: "bg-teal-100 text-teal-700 border-teal-400",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-400",
  Cancelled: "bg-red-100 text-red-700 border-red-400",
  Pending: "bg-amber-100 text-amber-700 border-amber-400",
  Confirmed: "bg-blue-100 text-blue-700 border-blue-400",
};
const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  Pending: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Failed: "Thanh toán thất bại",
  Cancelled: "Thanh toán đã hủy",
};

function DeliveryProgress({ status }: { status: OrderStatus }) {
  const steps = [
    { label: "Chờ thanh toán", done: true },
    { label: "Chờ đóng hàng", done: !["PENDING_PAYMENT", "PendingPayment", "Pending"].includes(status) },
    { label: "Đã cấp nhân vật và chờ đóng hàng", done: ["PARTIALLY_FULFILLED", "SHIPPING", "DELIVERED", "COMPLETED", "HandedOver", "Shipping", "Delivered", "Completed"].includes(status) },
    { label: "Đang vận chuyển", done: ["SHIPPING", "DELIVERED", "COMPLETED", "Shipping", "Delivered", "Completed"].includes(status) },
    { label: "Đã giao", done: ["DELIVERED", "COMPLETED", "Delivered", "Completed"].includes(status) },
    { label: "Đã hoàn thành", done: ["COMPLETED", "Completed"].includes(status) },
  ];
  return (
    <section className="neo-box-no-hover bg-white p-6">
      <div className="mb-5 flex items-center gap-2"><Truck size={17} /><h2 className="font-black uppercase">Trạng thái giao hàng</h2></div>
      <div className="flex flex-col gap-5">{steps.map((step) => <div key={step.label} className="flex items-center gap-3 text-sm font-bold"><span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-black ${step.done ? "bg-primary" : "bg-white"}`}>{step.done ? <CheckCircle size={12} /> : <Circle size={12} className="text-gray-300" />}</span><span className={!step.done ? "text-gray-400" : ""}>{step.label}</span></div>)}</div>
    </section>
  );
}

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { orders, refreshOrders, confirmOrderDelivery } = useOrders();
  const { entitlements } = useGallery();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const order = orders.find((entry) => entry.id === orderId);

  if (!order) return <><Header /><main className="flex-1 grid place-items-center py-24"><div className="text-center"><p className="mb-4 text-2xl font-black">Không tìm thấy đơn hàng</p><Link href="/profile/orders" className="btn-primary">← Về lịch sử đơn hàng</Link></div></main><Footer /></>;

  const isPendingPayment =
    (order.status === "PENDING_PAYMENT" || order.status === "PendingPayment" || order.status === "Pending") &&
    order.paymentStatus !== "Paid";

  const isDelivered = order.status === "DELIVERED" || order.status === "Delivered";

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

  const fulfillment = getOrderFulfillment(order);
  const grantedCharacterIds = new Set(entitlements.filter((item) => item.sourceReferenceId === order.id).map((item) => item.characterId));
  const entitlementComplete = order.paymentStatus === "Paid" && fulfillment.characterIds.every((id) => grantedCharacterIds.has(id));
  const entitlementMessage = order.paymentStatus !== "Paid"
    ? "Character sẽ được thêm vào Gallery sau khi thanh toán thành công."
    : entitlementComplete
      ? "Character đã được thêm vào Gallery của bạn."
      : "Đã thanh toán. Character đang được cấp vào Gallery.";

  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-4xl px-4">
    <Link href="/profile/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold hover:text-primary-dark"><ArrowLeft size={15} /> Lịch sử đơn hàng</Link>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black uppercase">Đơn hàng #{order.id}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Clock size={13} /> {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
      </div>
      <div className="flex items-center gap-2.5">
        {isDelivered && (
          <button
            type="button"
            onClick={() => {
              setConfirmError("");
              setIsConfirmModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-black bg-emerald-500 px-4 py-1.5 text-sm font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 hover:bg-emerald-400"
          >
            <CheckCircle size={15} /> Đã nhận hàng
          </button>
        )}
        <span className={`rounded-sm border px-3 py-1.5 text-sm font-black ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
      </div>
    </div>

    {confirmSuccess && (
      <div className="mb-6 flex items-center gap-2 border-2 border-emerald-600 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 rounded-sm">
        <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
        <p>Xác nhận đã nhận hàng thành công! Đơn hàng đã được hoàn tất.</p>
      </div>
    )}

    {isPendingPayment && (
      <div className="mb-6">
        <SePayOrderPaymentCard
          orderId={order.id}
          initialPaymentCode={order.paymentCode}
          redirectOnSuccess
          onPaymentSuccess={() => {
            void refreshOrders();
          }}
        />
      </div>
    )}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-5 lg:col-span-3">
        {fulfillment.requiresCharacterEntitlement && <section className="neo-box-no-hover bg-white p-6"><div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3"><Package size={17} /><h2 className="font-black uppercase">Character kỹ thuật số</h2></div><div className={`flex items-start gap-3 border-2 p-3 text-sm font-bold ${entitlementComplete ? "border-green-600 bg-green-50 text-green-800" : "border-amber-500 bg-amber-50 text-amber-800"}`}>{entitlementComplete ? <CheckCircle size={18} /> : <Clock size={18} />}<p>{entitlementMessage}</p></div>{entitlementComplete && <Link href="/profile/gallery" className="btn-primary mt-4 inline-block">Mở Gallery</Link>}</section>}
        {fulfillment.requiresDelivery && (
          <>
            {isDelivered && (
              <section className="border-2 border-emerald-600 bg-emerald-50 p-4 text-emerald-900 rounded-sm">
                <div className="flex items-center gap-2 font-black text-sm">
                  <CheckCircle size={18} className="text-emerald-700 shrink-0" />
                  <span>Đơn hàng đã được giao đến bạn!</span>
                </div>
                <p className="mt-1 text-xs text-emerald-800">
                  Nếu bạn đã nhận và kiểm tra kiện hàng, hãy bấm nút xác nhận dưới đây để hoàn tất đơn hàng.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmError("");
                    setIsConfirmModalOpen(true);
                  }}
                  className="btn-primary mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
                >
                  <CheckCircle size={14} /> Xác nhận đã nhận hàng
                </button>
              </section>
            )}
            <DeliveryProgress status={order.status} />
          </>
        )}
        <section className="neo-box-no-hover bg-white p-6"><div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3"><Package size={17} /><h2 className="font-black uppercase">Sản phẩm đã đặt</h2></div>{order.items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"><div><p className="font-bold">{item.name}</p><p className="text-xs text-text-muted">Số lượng: {item.quantity}</p></div><p className="font-black">{formatPrice(item.price * item.quantity)}</p></div>)}</section>
      </div>
      <div className="flex flex-col gap-5 lg:col-span-2">
        <section className="neo-box-no-hover bg-white p-5">
          <h2 className="mb-4 border-b-2 border-black pb-2 font-black uppercase">Tóm tắt</h2>
          <div className="flex flex-col gap-2 text-sm font-bold">
            <div className="flex justify-between"><span className="text-text-muted">Tạm tính</span><span>{formatPrice(order.subtotal)}</span></div>
            {(fulfillment.requiresDelivery || order.shipping > 0) && <div className="flex justify-between"><span className="text-text-muted">Vận chuyển</span><span>{order.shipping === 0 ? "Miễn phí" : formatPrice(order.shipping)}</span></div>}
            <div className="mt-1 flex justify-between border-t-2 border-dashed border-black pt-2 text-lg"><span>Tổng cộng</span><span className="text-primary-dark">{formatPrice(order.total)}</span></div>
          </div>
          <div className="mt-3 space-y-1 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-semibold">
            <p>Thanh toán: {order.paymentMethod} · {PAYMENT_LABEL[order.paymentStatus]}</p>
            {order.bankReferenceCode && (
              <p className="font-mono text-gray-700">Mã giao dịch: {order.bankReferenceCode}</p>
            )}
            {order.paidAt && (
              <p className="text-emerald-700">
                Xác nhận lúc: {new Date(order.paidAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </section>
        {fulfillment.requiresDelivery && <section className="neo-box-no-hover bg-white p-5"><div className="mb-3 flex items-center gap-2 border-b-2 border-black pb-2"><MapPin size={17} /><h2 className="font-black uppercase">Giao hàng</h2></div>{order.delivery && <p className="mb-3 text-sm font-bold">Đơn vị: {order.delivery.provider} · Mã vận đơn: {order.delivery.orderId}<br /><span className="text-text-muted">Trạng thái: {order.delivery.status}</span></p>}<p className="font-bold">{order.address.fullName}</p><p className="text-sm text-text-muted">{order.address.phoneNumber}</p><p className="mt-1 text-sm">{order.address.fullAddress}</p></section>}
      </div>
    </div>
  </div></main>

  {/* Confirm Delivery Modal */}
  {isConfirmModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="neo-box-no-hover w-full max-w-md bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2 font-black uppercase text-base">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>Xác nhận đã nhận hàng</span>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmModalOpen(false)}
            className="text-gray-500 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-700">
          Bạn xác nhận đã nhận đầy đủ sản phẩm cho đơn hàng <strong className="font-bold text-black">#{order.id}</strong>?
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Sau khi xác nhận, đơn hàng sẽ được chuyển sang trạng thái <strong>Đã hoàn thành</strong>.
        </p>

        {confirmError && (
          <p className="mt-3 border-2 border-red-500 bg-red-50 p-2 text-xs font-bold text-red-700">
            {confirmError}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => setIsConfirmModalOpen(false)}
            className="btn-secondary text-xs"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirmDelivery}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            {isConfirming ? "Đang xử lý..." : "Xác nhận nhận hàng"}
          </button>
        </div>
      </div>
    </div>
  )}

  <Footer /></>;
}
