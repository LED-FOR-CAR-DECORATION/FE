"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, CheckCircle, Circle, Clock, MapPin, Package, Truck, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useGallery } from "@/features/character/context/GalleryContext";
import { useOrders } from "@/features/order/context/OrderContext";
import { getOrderFulfillment } from "@/features/order/fulfillment";
import type { OrderStatus, PaymentStatus } from "@/features/order/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: "Đã tạo đơn",
  Confirmed: "Đã nhận hàng",
  Shipping: "Đang giao",
  Delivered: "Đã giao hàng",
  Cancelled: "Đã hủy",
};
const STATUS_CLASS: Record<OrderStatus, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-400",
  Confirmed: "bg-blue-100 text-blue-700 border-blue-400",
  Shipping: "bg-green-100 text-green-700 border-green-400",
  Delivered: "bg-gray-100 text-gray-600 border-gray-400",
  Cancelled: "bg-red-100 text-red-700 border-red-400",
};
const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  Pending: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Failed: "Thanh toán thất bại",
  Cancelled: "Thanh toán đã hủy",
};

function DeliveryProgress({ status }: { status: OrderStatus }) {
  const steps = [
    { label: "Đã tạo đơn", done: true },
    { label: "Đã nhận hàng", done: ["Confirmed", "Shipping", "Delivered"].includes(status) },
    { label: "Đang giao", done: ["Shipping", "Delivered"].includes(status) },
    { label: "Đã giao hàng", done: status === "Delivered" },
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
  const { user } = useAuth();
  const { orders } = useOrders();
  const { entitlements } = useGallery();
  const order = orders.find((entry) => entry.id === orderId && entry.customer.userId === user?.userId);

  if (!order) return <><Header /><main className="flex-1 grid place-items-center py-24"><div className="text-center"><p className="mb-4 text-2xl font-black">Không tìm thấy đơn hàng</p><Link href="/profile/orders" className="btn-primary">← Về lịch sử đơn hàng</Link></div></main><Footer /></>;

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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black uppercase">Đơn hàng #{order.id}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Clock size={13} /> {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p></div><span className={`rounded-sm border px-3 py-1.5 text-sm font-black ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span></div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-5 lg:col-span-3">
        {fulfillment.requiresCharacterEntitlement && <section className="neo-box-no-hover bg-white p-6"><div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3"><Package size={17} /><h2 className="font-black uppercase">Character kỹ thuật số</h2></div><div className={`flex items-start gap-3 border-2 p-3 text-sm font-bold ${entitlementComplete ? "border-green-600 bg-green-50 text-green-800" : "border-amber-500 bg-amber-50 text-amber-800"}`}>{entitlementComplete ? <CheckCircle size={18} /> : <Clock size={18} />}<p>{entitlementMessage}</p></div>{entitlementComplete && <Link href="/profile/gallery" className="btn-primary mt-4 inline-block">Mở Gallery</Link>}</section>}
        {fulfillment.requiresDelivery && <DeliveryProgress status={order.status} />}
        <section className="neo-box-no-hover bg-white p-6"><div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3"><Package size={17} /><h2 className="font-black uppercase">Sản phẩm đã đặt</h2></div>{order.items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"><div><p className="font-bold">{item.name}</p><p className="text-xs text-text-muted">Số lượng: {item.quantity}</p></div><p className="font-black">${(item.price * item.quantity).toFixed(2)}</p></div>)}</section>
      </div>
      <div className="flex flex-col gap-5 lg:col-span-2">
        <section className="neo-box-no-hover bg-white p-5"><h2 className="mb-4 border-b-2 border-black pb-2 font-black uppercase">Tóm tắt</h2><div className="flex flex-col gap-2 text-sm font-bold"><div className="flex justify-between"><span className="text-text-muted">Tạm tính</span><span>${order.subtotal.toFixed(2)}</span></div>{(fulfillment.requiresDelivery || order.shipping > 0) && <div className="flex justify-between"><span className="text-text-muted">Vận chuyển</span><span>${order.shipping.toFixed(2)}</span></div>}<div className="mt-1 flex justify-between border-t-2 border-dashed border-black pt-2 text-lg"><span>Tổng cộng</span><span className="text-primary-dark">${order.total.toFixed(2)}</span></div></div><p className="mt-3 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-semibold">Thanh toán: {order.paymentMethod} · {PAYMENT_LABEL[order.paymentStatus]}</p></section>
        {fulfillment.requiresDelivery && <section className="neo-box-no-hover bg-white p-5"><div className="mb-3 flex items-center gap-2 border-b-2 border-black pb-2"><MapPin size={17} /><h2 className="font-black uppercase">Giao hàng</h2></div>{order.delivery && <p className="mb-3 text-sm font-bold">Đơn vị: {order.delivery.provider} · Mã vận đơn: {order.delivery.orderId}<br /><span className="text-text-muted">Trạng thái: {order.delivery.status}</span></p>}<p className="font-bold">{order.address.fullName}</p><p className="text-sm text-text-muted">{order.address.phoneNumber}</p><p className="mt-1 text-sm">{order.address.fullAddress}</p></section>}
      </div>
    </div>
  </div></main><Footer /></>;
}
