"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, CheckCircle, Circle, Clock, MapPin, Package, Truck, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import type { OrderStatus } from "@/features/order/types";

const STATUS_LABEL: Record<OrderStatus, string> = { Pending: "Chờ xử lý", Confirmed: "Đã xác nhận", Shipping: "Đang giao", Delivered: "Đã giao", Cancelled: "Đã hủy" };
const STATUS_CLASS: Record<OrderStatus, string> = { Pending: "bg-amber-100 text-amber-700 border-amber-400", Confirmed: "bg-blue-100 text-blue-700 border-blue-400", Shipping: "bg-green-100 text-green-700 border-green-400", Delivered: "bg-gray-100 text-gray-600 border-gray-400", Cancelled: "bg-red-100 text-red-700 border-red-400" };

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const { orders } = useOrders();
  const order = orders.find((entry) => entry.id === orderId && entry.customer.userId === user?.userId);

  if (!order) return <><Header /><main className="flex-1 grid place-items-center py-24"><div className="text-center"><p className="mb-4 text-2xl font-black">Không tìm thấy đơn hàng</p><Link href="/profile/orders" className="btn-primary">← Về lịch sử đơn hàng</Link></div></main><Footer /></>;

  const steps: { label: string; done: boolean }[] = [
    { label: "Đặt hàng", done: true },
    { label: "Đã xác nhận", done: ["Confirmed", "Shipping", "Delivered"].includes(order.status) },
    { label: "Đang giao", done: ["Shipping", "Delivered"].includes(order.status) },
    { label: "Đã giao", done: order.status === "Delivered" },
  ];

  return <><Header /><main className="flex-1 bg-background py-10"><div className="container mx-auto max-w-4xl px-4">
    <Link href="/profile/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold hover:text-primary-dark"><ArrowLeft size={15} /> Lịch sử đơn hàng</Link>
    <div className="mb-6 flex items-start justify-between gap-3 flex-wrap"><div><h1 className="text-2xl font-black uppercase">Đơn hàng #{order.id}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"><Clock size={13} /> {new Date(order.createdAt).toLocaleDateString("vi-VN")}</p></div><span className={`border px-3 py-1.5 text-sm font-black rounded-sm ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span></div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-5 lg:col-span-3">
        <section className="neo-box-no-hover bg-white p-6"><div className="mb-5 flex items-center gap-2"><Truck size={17} /><h2 className="font-black uppercase">Trạng thái đơn hàng</h2></div><div className="flex flex-col gap-5">{steps.map((step) => <div key={step.label} className="flex items-center gap-3 text-sm font-bold"><span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-black ${step.done ? "bg-primary" : "bg-white"}`}>{step.done ? <CheckCircle size={12} /> : <Circle size={12} className="text-gray-300" />}</span><span className={!step.done ? "text-gray-400" : ""}>{step.label}</span></div>)}</div></section>
        <section className="neo-box-no-hover bg-white p-6"><div className="mb-4 flex items-center gap-2 border-b-2 border-black pb-3"><Package size={17} /><h2 className="font-black uppercase">Sản phẩm đã đặt</h2></div>{order.items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"><div><p className="font-bold">{item.name}</p><p className="text-xs text-text-muted">Số lượng: {item.quantity}</p></div><p className="font-black">${(item.price * item.quantity).toFixed(2)}</p></div>)}</section>
      </div>
      <div className="flex flex-col gap-5 lg:col-span-2">
        <section className="neo-box-no-hover bg-white p-5"><h2 className="mb-4 border-b-2 border-black pb-2 font-black uppercase">Tóm tắt</h2><div className="flex flex-col gap-2 text-sm font-bold"><div className="flex justify-between"><span className="text-text-muted">Tạm tính</span><span>${order.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-text-muted">Vận chuyển</span><span>${order.shipping.toFixed(2)}</span></div><div className="mt-1 flex justify-between border-t-2 border-dashed border-black pt-2 text-lg"><span>Tổng cộng</span><span className="text-primary-dark">${order.total.toFixed(2)}</span></div></div><p className="mt-3 border-2 border-black bg-gray-50 px-3 py-2 text-xs font-semibold">Thanh toán: {order.paymentMethod} · {order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</p></section>
        <section className="neo-box-no-hover bg-white p-5"><div className="mb-3 flex items-center gap-2 border-b-2 border-black pb-2"><MapPin size={17} /><h2 className="font-black uppercase">Địa chỉ giao hàng</h2></div><p className="font-bold">{order.address.fullName}</p><p className="text-sm text-text-muted">{order.address.phoneNumber}</p><p className="mt-1 text-sm">{order.address.fullAddress}</p></section>
      </div>
    </div>
  </div></main><Footer /></>;
}
