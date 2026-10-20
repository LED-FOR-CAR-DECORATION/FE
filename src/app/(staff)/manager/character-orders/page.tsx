"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle, Eye, Image as ImageIcon, Package, RotateCcw, Search, WalletCards } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import { getCharacterOrderComposition, getCharacterRevenue, getCharacterSaleItems, type CharacterOrderComposition } from "@/features/order/character-orders";
import type { PaymentStatus } from "@/features/order/types";

const PAYMENT_LABEL: Record<PaymentStatus, string> = { Pending: "Chưa thanh toán", Paid: "Đã thanh toán", Failed: "Thanh toán thất bại", Cancelled: "Đã hủy" };
const PAYMENT_CLASS: Record<PaymentStatus, string> = { Pending: "border-amber-300 bg-amber-50 text-amber-700", Paid: "border-green-300 bg-green-50 text-green-700", Failed: "border-red-300 bg-red-50 text-red-700", Cancelled: "border-gray-300 bg-gray-100 text-gray-600" };

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${className}`}>{children}</span>;
}

function isInDateRange(createdAt: string, from: string, to: string) {
  const date = createdAt.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}

export default function CharacterOrdersPage() {
  const { orders } = useOrders();
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState<PaymentStatus | "All">("All");
  const [compositionFilter, setCompositionFilter] = useState<CharacterOrderComposition | "All">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => orders.map((order) => ({
    order,
    characters: getCharacterSaleItems(order),
    composition: getCharacterOrderComposition(order),
    revenue: getCharacterRevenue(order),
  })).filter(({ order, characters, composition }) => {
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [order.id, order.customer.fullName, order.customer.email, ...characters.map((item) => item.name)].some((value) => value.toLowerCase().includes(normalized));
    return matchesQuery && (payment === "All" || order.paymentStatus === payment) && (compositionFilter === "All" || composition === compositionFilter) && isInDateRange(order.createdAt, from, to);
  }), [compositionFilter, from, orders, payment, query, to]);
  const characterOrders = rows.filter(({ characters }) => characters.length);
  const totalCharacters = characterOrders.reduce((sum, row) => sum + row.characters.reduce((count, item) => count + item.quantity, 0), 0);
  const revenue = characterOrders.reduce<number | null>((sum, row) => sum === null || row.revenue === null ? null : sum + row.revenue, 0);
  const reset = () => { setQuery(""); setPayment("All"); setCompositionFilter("All"); setFrom(""); setTo(""); };

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-black">Quản lý đơn Character</h1><p className="mt-1 text-sm font-medium text-text-muted">Theo dõi đơn hàng, doanh thu và tình trạng thanh toán Character</p></div><label className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-bold"><CalendarDays size={15} /> Khoảng ngày<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><span>–</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3"><SummaryCard icon={<Package size={19} />} label="Tổng đơn hàng" value={characterOrders.length} /><SummaryCard icon={<ImageIcon size={19} />} label="Character đã bán" value={totalCharacters} /><SummaryCard icon={<WalletCards size={19} />} label="Doanh thu Character" value={revenue === null ? "Chưa phân bổ" : `$${revenue.toFixed(2)}`} /></div>
    <section className="neo-box-no-hover bg-white p-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"><label className="flex items-center gap-2 border-2 border-gray-200 px-3 py-2 text-sm lg:col-span-2"><Search size={15} className="text-text-muted" /><input className="w-full outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã đơn, khách hàng, Character..." /></label><select className="border-2 border-gray-200 px-3 py-2 text-sm" value={payment} onChange={(event) => setPayment(event.target.value as PaymentStatus | "All")}><option value="All">Tất cả thanh toán</option>{Object.entries(PAYMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="border-2 border-gray-200 px-3 py-2 text-sm" value={compositionFilter} onChange={(event) => setCompositionFilter(event.target.value as CharacterOrderComposition | "All")}><option value="All">Tất cả loại đơn</option><option value="Character-only">Character-only</option><option value="Mixed order">Mixed order</option><option value="Bundle">Bundle</option></select><button type="button" onClick={reset} className="inline-flex items-center justify-center gap-1 border-2 border-black px-3 py-2 text-xs font-bold hover:bg-primary/20"><RotateCcw size={14} /> Đặt lại</button></div></section>
    <section className="neo-box-no-hover overflow-hidden bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[930px] text-sm"><thead className="border-b-2 border-black bg-gray-50"><tr>{["Mã đơn hàng", "Thời gian", "Khách hàng", "Character", "Loại đơn", "Giá trị Character", "Thanh toán", "Chi tiết"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase">{heading}</th>)}</tr></thead><tbody>{characterOrders.map(({ order, characters, composition, revenue }) => <tr key={order.id} className="border-b border-gray-100 hover:bg-green-50/60"><td className="px-4 py-3 font-black text-primary-dark">#{order.id}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{new Date(order.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3"><p className="font-bold">{order.customer.fullName}</p><p className="text-xs text-text-muted">{order.customer.email}</p></td><td className="px-4 py-3"><div className="flex max-w-[240px] items-center gap-2">{characters.slice(0, 2).map((item) => <div key={item.id} title={`${item.name} × ${item.quantity}`} className="flex min-w-0 items-center gap-1"><span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden border border-black bg-primary/10">{item.previewUrl ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={13} />}</span><span className="truncate text-xs font-bold">{item.name} ×{item.quantity}</span></div>)}{characters.length > 2 && <span className="text-xs font-bold text-text-muted">+{characters.length - 2} thêm</span>}</div></td><td className="px-4 py-3 text-xs font-bold">{composition === "Character-only" ? "Character-only" : composition === "Mixed order" ? "Đơn hỗn hợp" : "Bundle"}</td><td className="px-4 py-3 font-black">{revenue === null ? <span className="text-xs text-text-muted">Chưa phân bổ</span> : `$${revenue.toFixed(2)}`}</td><td className="px-4 py-3"><Badge className={PAYMENT_CLASS[order.paymentStatus]}>{order.paymentStatus === "Paid" ? <CheckCircle size={12} /> : "•"} {PAYMENT_LABEL[order.paymentStatus]}</Badge></td><td className="px-4 py-3"><Link href={`/manager/character-orders/${order.id}`} className="inline-flex items-center gap-1 border-2 border-black px-2 py-1 text-xs font-bold hover:bg-primary/20"><Eye size={13} /> Chi tiết</Link></td></tr>)}{characterOrders.length === 0 && <tr><td colSpan={8} className="px-4 py-14 text-center font-semibold text-text-muted">Không có đơn Character phù hợp.</td></tr>}</tbody></table></div></section>
  </div>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div className="neo-box-no-hover flex flex-col gap-2 bg-white p-4"><div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-primary/20">{icon}</div><p className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</p><p className="text-2xl font-black">{value}</p></div>;
}
