"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Eye, Filter, Search, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useOrders } from "@/features/order/context/OrderContext";
import { isCharacterOnlyOrder } from "@/features/order/fulfillment";
import type { MockOrder, OrderStatus } from "@/features/order/types";

type DisplayStatus = OrderStatus | "Paid";
type FilterStatus = DisplayStatus | "All";

const STATUS_CONFIG: Record<DisplayStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Pending: { label: "Đã tạo đơn", className: "bg-amber-50 text-amber-700", icon: <Circle size={12} /> },
  Confirmed: { label: "Đã nhận hàng", className: "bg-blue-50 text-blue-700", icon: <CheckCircle2 size={12} /> },
  Shipping: { label: "Đang giao", className: "bg-[#e3f2e9] text-[#155e59]", icon: <Truck size={12} /> },
  Delivered: { label: "Đã giao hàng", className: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={12} /> },
  Paid: { label: "Đã thanh toán", className: "bg-[#e3f2e9] text-[#155e59]", icon: <CheckCircle2 size={12} /> },
  Cancelled: { label: "Đã hủy", className: "bg-red-50 text-red-700", icon: <X size={12} /> },
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export default function OrdersPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("All");
  const [payment, setPayment] = useState<"All" | MockOrder["paymentStatus"]>("All");

  const displayStatus = (order: MockOrder): DisplayStatus => isCharacterOnlyOrder(order) && order.paymentStatus === "Paid" ? "Paid" : order.status;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...orders].filter((order) => {
      const matchesSearch = !query || [order.id, order.customer.fullName, order.customer.email].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (status === "All" || displayStatus(order) === status) && (payment === "All" || order.paymentStatus === payment);
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [orders, payment, search, status]);

  const filterItems: FilterStatus[] = ["All", "Pending", "Confirmed", "Shipping", "Delivered", "Paid"];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#155e59]">Vận hành cửa hàng</p><h1 className="mt-1 text-3xl font-black text-[#26352f]">Quản lý đơn hàng</h1><p className="mt-1 text-sm text-[#66736b]">Theo dõi trạng thái, thanh toán và thông tin giao hàng của khách.</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{filterItems.map((item) => { const count = item === "All" ? orders.length : orders.filter((order) => displayStatus(order) === item).length; return <button key={item} onClick={() => setStatus(item)} className={`rounded-xl border p-4 text-left shadow-sm transition ${status === item ? "border-[#155e59] bg-[#e3f2e9]" : "border-[#e2e4db] bg-white hover:border-[#8fc7a0]"}`}><p className="text-xs font-bold text-[#66736b]">{item === "All" ? "Tất cả" : STATUS_CONFIG[item].label}</p><p className="mt-1 text-2xl font-black text-[#26352f]">{count}</p></button>; })}</div>
      <div className="flex flex-col gap-3 rounded-xl border border-[#e2e4db] bg-white p-4 shadow-sm lg:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e2e4db] px-3 focus-within:border-[#155e59]"><Search size={16} className="text-[#66736b]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã đơn, tên hoặc email..." className="w-full bg-transparent py-2 text-sm outline-none" /></div>
        <div className="flex items-center gap-2"><Filter size={16} className="text-[#66736b]" /><label className="sr-only" htmlFor="payment-filter">Thanh toán</label><select id="payment-filter" value={payment} onChange={(event) => setPayment(event.target.value as typeof payment)} className="rounded-lg border border-[#e2e4db] bg-white px-3 py-2 text-sm font-semibold text-[#26352f] outline-none focus:border-[#155e59]"><option value="All">Tất cả thanh toán</option><option value="Pending">Chưa thanh toán</option><option value="Paid">Đã thanh toán</option><option value="Failed">Thanh toán lỗi</option><option value="Cancelled">Đã hủy thanh toán</option></select></div>
        {(search || status !== "All" || payment !== "All") && <button onClick={() => { setSearch(""); setStatus("All"); setPayment("All"); }} className="rounded-lg px-3 py-2 text-sm font-bold text-[#155e59] hover:bg-[#e3f2e9]">Xóa bộ lọc</button>}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e2e4db] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="border-b border-[#e2e4db] bg-[#f8f7ef]"><tr>{["Mã đơn", "Khách hàng", "Hàng hóa", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày tạo", ""].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#66736b]">{heading}</th>)}</tr></thead><tbody>{filtered.map((order) => { const currentStatus = displayStatus(order); return <tr key={order.id} className="border-b border-[#f0f2ed] last:border-0 hover:bg-[#f8f7ef]"><td className="px-4 py-4 font-black text-[#155e59]">#{order.id}</td><td className="px-4 py-4"><p className="font-bold text-[#26352f]">{order.customer.fullName}</p><p className="text-xs text-[#66736b]">{order.customer.email}</p></td><td className="max-w-[230px] px-4 py-4 text-xs text-[#66736b]">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</td><td className="px-4 py-4 font-black text-[#26352f]">{formatMoney(order.total)}</td><td className="px-4 py-4 text-xs text-[#66736b]">{order.paymentMethod}<br /><span className={order.paymentStatus === "Paid" ? "font-bold text-emerald-700" : "font-semibold text-amber-700"}>{order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</span></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CONFIG[currentStatus].className}`}>{STATUS_CONFIG[currentStatus].icon}{STATUS_CONFIG[currentStatus].label}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs text-[#66736b]">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td><td className="px-4 py-4"><Link href={`/staff/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-lg border border-[#e2e4db] px-2.5 py-1.5 text-xs font-bold text-[#155e59] hover:border-[#8fc7a0] hover:bg-[#e3f2e9]"><Eye size={13} /> Chi tiết</Link></td></tr>; })}{filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-16 text-center"><Search size={24} className="mx-auto mb-2 text-[#8fc7a0]" /><p className="font-semibold text-[#66736b]">Không tìm thấy đơn hàng phù hợp.</p><p className="mt-1 text-xs text-[#66736b]">Thử thay đổi từ khóa hoặc bộ lọc.</p></td></tr>}</tbody></table></div></div>
    </div>
  );
}
