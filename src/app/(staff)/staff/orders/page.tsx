"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Circle, Eye, Search, Truck, X } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { OrderStatus } from "@/features/order/types";
import type { MockOrder } from "@/features/order/types";

type DisplayStatus = OrderStatus | "Paid";
const STATUS_CONFIG: Record<DisplayStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Pending: { label: "Đã tạo đơn", className: "bg-amber-100 text-amber-700 border-amber-400", icon: <Circle size={12} /> },
  Confirmed: { label: "Đã nhận hàng", className: "bg-blue-100 text-blue-700 border-blue-400", icon: <CheckCircle size={12} /> },
  Shipping: { label: "Đang giao", className: "bg-green-100 text-green-700 border-green-400", icon: <Truck size={12} /> },
  Delivered: { label: "Đã giao hàng", className: "bg-gray-100 text-gray-600 border-gray-400", icon: <CheckCircle size={12} /> },
  Paid: { label: "Đã thanh toán", className: "bg-green-100 text-green-700 border-green-400", icon: <CheckCircle size={12} /> },
  Cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-700 border-red-400", icon: <X size={12} /> },
};

export default function OrdersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DisplayStatus | "All">("All");
  const displayStatus = (order: MockOrder): DisplayStatus => isCharacterOnlyOrder(order) && order.paymentStatus === "Paid" ? "Paid" : order.status;
  const filtered = orders.filter((order) => {
    const query = search.toLowerCase();
    return (status === "All" || displayStatus(order) === status) && (!query || order.id.toLowerCase().includes(query) || order.customer.fullName.toLowerCase().includes(query) || order.customer.email.toLowerCase().includes(query));
  });

  return <div className="flex max-w-[1280px] flex-col gap-5">
    <div><h1 className="text-2xl font-black uppercase tracking-tight">Quản lý đơn hàng</h1><p className="text-sm font-medium text-text-muted">Quản lý và theo dõi tất cả đơn hàng của khách.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{(["All", "Pending", "Confirmed", "Shipping", "Delivered", "Paid"] as const).map((item) => <button key={item} onClick={() => setStatus(item)} className={`neo-box-no-hover p-3 text-left ${status === item ? "bg-primary" : "bg-white"}`}><p className="text-xs font-bold uppercase text-text-muted">{item === "All" ? "Tất cả" : STATUS_CONFIG[item].label}</p><p className="text-2xl font-black">{item === "All" ? orders.length : orders.filter((order) => displayStatus(order) === item).length}</p></button>)}</div>
    <div className="neo-box-no-hover flex items-center gap-2 bg-white p-4"><Search size={15} className="text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã đơn, tên hoặc email khách hàng..." className="w-full bg-transparent text-sm outline-none" /></div>
    <div className="neo-box-no-hover overflow-hidden bg-white"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b-2 border-black bg-gray-50"><tr>{["Mã đơn", "Khách hàng", "Hàng hóa", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày tạo", ""].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase">{heading}</th>)}</tr></thead><tbody>{filtered.map((order) => { const currentStatus = displayStatus(order); return <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-black text-primary-dark">#{order.id}</td><td className="px-4 py-3"><p className="font-bold">{order.customer.fullName}</p><p className="text-xs text-text-muted">{order.customer.email}</p></td><td className="max-w-[220px] px-4 py-3 text-xs">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</td><td className="px-4 py-3 font-black">${order.total.toFixed(2)}</td><td className="px-4 py-3 text-xs">VNPay · {order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-bold ${STATUS_CONFIG[currentStatus].className}`}>{STATUS_CONFIG[currentStatus].icon} {STATUS_CONFIG[currentStatus].label}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td><td className="px-4 py-3"><Link href={`/staff/orders/${order.id}`} className="inline-flex items-center gap-1 border-2 border-black px-2 py-1 text-xs font-bold hover:bg-primary/20"><Eye size={13} /> Chi tiết</Link></td></tr>; })}{filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center font-semibold text-text-muted">Không tìm thấy đơn hàng nào.</td></tr>}</tbody></table></div></div>
  </div>;
}
