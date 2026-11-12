"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Layers, Package, ShoppingCart, Truck } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import type { MockOrder, OrderStatus } from "@/features/order/types";
import { getAvailableStock, getInventoryStatus, LED_INVENTORY } from "@/features/product/inventory";

const STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: "Đã tạo đơn",
  Confirmed: "Đã nhận hàng",
  Shipping: "Đang giao",
  Delivered: "Đã giao hàng",
  Cancelled: "Đã hủy",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-blue-50 text-blue-700",
  Shipping: "bg-[#e3f2e9] text-[#155e59]",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function StatCard({ label, value, helper, icon, href, tone = "default" }: { label: string; value: number; helper: string; icon: React.ReactNode; href?: string; tone?: "default" | "warning" }) {
  const content = <div className={`rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm transition ${href ? "hover:-translate-y-0.5 hover:border-[#8fc7a0] hover:shadow-md" : ""}`}>
    <div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-lg ${tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-[#e3f2e9] text-[#155e59]"}`}>{icon}</div>{href && <ArrowRight size={16} className="text-[#66736b]" />}</div>
    <p className="mt-4 text-sm font-semibold text-[#66736b]">{label}</p>
    <p className="mt-1 text-3xl font-black text-[#26352f]">{value.toLocaleString("vi-VN")}</p>
    <p className="mt-1 text-xs text-[#66736b]">{helper}</p>
  </div>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

export default function StaffDashboard() {
  const { orders } = useOrders();
  const days = getLastSevenDays();
  const pendingOrders = orders.filter((order) => order.status === "Pending").length;
  const shippingOrders = orders.filter((order) => order.status === "Shipping").length;
  const lowStockItems = LED_INVENTORY.filter((item) => getInventoryStatus(item) !== "In stock");
  const recentOrders = [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const orderCounts = days.map((day) => orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created.getFullYear() === day.getFullYear() && created.getMonth() === day.getMonth() && created.getDate() === day.getDate();
  }).length);
  const maxOrders = Math.max(1, ...orderCounts);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#155e59]">Tổng quan nhân viên</p><h1 className="mt-1 text-3xl font-black text-[#26352f]">Chào buổi sáng, Quản lý!</h1><p className="mt-1 text-sm text-[#66736b]">Tổng quan hoạt động của cửa hàng.</p></div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#e2e4db] bg-white px-3 py-2 text-sm font-semibold text-[#26352f] shadow-sm"><CalendarDays size={16} className="text-[#155e59]" /> 7 ngày gần nhất</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Đơn chờ xử lý" value={pendingOrders} helper="Cần tiếp nhận" icon={<Package size={20} />} href="/staff/orders" />
        <StatCard label="Chờ giao" value={shippingOrders} helper="Đang trong luồng giao hàng" icon={<Truck size={20} />} href="/staff/deliveries" />
        <StatCard label="Tồn kho LED" value={LED_INVENTORY.reduce((sum, item) => sum + getAvailableStock(item), 0)} helper="Số lượng khả dụng" icon={<Layers size={20} />} href="/staff/inventory" />
        <StatCard label="Sắp hết hàng" value={lowStockItems.length} helper="Model cần kiểm tra" icon={<AlertTriangle size={20} />} href="/staff/inventory" tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
        <section className="rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BarChart3 size={18} className="text-[#155e59]" /><h2 className="text-lg font-black text-[#26352f]">Tổng quan đơn hàng</h2></div><p className="mt-1 text-sm text-[#66736b]">Số đơn được tạo trong 7 ngày gần nhất.</p></div><span className="rounded-full bg-[#e3f2e9] px-3 py-1 text-xs font-bold text-[#155e59]">{orders.length} tổng đơn</span></div>
          <div className="mt-8 flex h-48 items-end gap-3 border-b border-[#e2e4db] px-2">{orderCounts.map((count, index) => <div key={days[index].toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-[#66736b]">{count}</span><div className="w-full max-w-10 rounded-t-md bg-[#8fc7a0] transition-all hover:bg-[#155e59]" style={{ height: `${Math.max(count ? 12 : 3, (count / maxOrders) * 100)}%` }} /><span className="text-[11px] text-[#66736b]">{days[index].toLocaleDateString("vi-VN", { weekday: "short" })}</span></div>)}</div>
        </section>
        <section className="rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Layers size={18} className="text-[#155e59]" /><h2 className="text-lg font-black text-[#26352f]">Trạng thái kho LED</h2></div><Link href="/staff/inventory" className="text-xs font-bold text-[#155e59] hover:underline">Xem tất cả <ArrowRight size={13} className="inline" /></Link></div>
          <div className="mt-3 divide-y divide-[#e2e4db]">{LED_INVENTORY.slice().sort((a, b) => getAvailableStock(a) - getAvailableStock(b)).slice(0, 4).map((item) => { const inventoryStatus = getInventoryStatus(item); return <div key={item.productId} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f8f7ef] text-[#155e59]"><Layers size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#26352f]">{item.name}</p><div className="mt-1 h-1.5 rounded-full bg-[#edf0ea]"><div className={`h-full rounded-full ${inventoryStatus === "In stock" ? "bg-[#8fc7a0]" : "bg-amber-400"}`} style={{ width: `${Math.min(100, (getAvailableStock(item) / Math.max(item.minimumStock * 4, 1)) * 100)}%` }} /></div></div><span className="text-xs font-bold text-[#66736b]">{getAvailableStock(item)}</span></div>; })}</div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
        <section className="rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingCart size={18} className="text-[#155e59]" /><h2 className="text-lg font-black text-[#26352f]">Đơn hàng gần đây</h2></div><Link href="/staff/orders" className="text-xs font-bold text-[#155e59] hover:underline">Xem tất cả <ArrowRight size={13} className="inline" /></Link></div>{recentOrders.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-[#e2e4db] text-left text-xs uppercase text-[#66736b]"><th className="pb-3">Mã đơn</th><th className="pb-3">Khách hàng</th><th className="pb-3">Tổng tiền</th><th className="pb-3">Trạng thái</th><th className="pb-3">Ngày</th></tr></thead><tbody>{recentOrders.map((order: MockOrder) => <tr key={order.id} className="border-b border-[#f0f2ed] last:border-0"><td className="py-3 font-bold text-[#155e59]">#{order.id}</td><td className="py-3"><p className="font-semibold">{order.customer.fullName}</p><p className="text-xs text-[#66736b]">{order.customer.email}</p></td><td className="py-3 font-bold">{formatMoney(order.total)}</td><td className="py-3"><StatusBadge status={order.status} /></td><td className="py-3 text-xs text-[#66736b]">{formatDate(order.createdAt)}</td></tr>)}</tbody></table></div> : <div className="mt-4 rounded-lg bg-[#f8f7ef] p-8 text-center text-sm text-[#66736b]"><CheckCircle2 className="mx-auto mb-2 text-[#8fc7a0]" />Chưa có đơn hàng nào được ghi nhận.</div>}</section>
        <section className="rounded-xl border border-[#e2e4db] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ClipboardList size={18} className="text-[#155e59]" /><h2 className="text-lg font-black text-[#26352f]">Việc cần làm</h2></div><div className="mt-4 space-y-2"><Link href="/staff/orders" className="flex items-center gap-3 rounded-lg border border-[#e2e4db] p-3 transition hover:border-[#8fc7a0] hover:bg-[#f8f7ef]"><ShoppingCart size={17} className="text-[#155e59]" /><span className="flex-1 text-sm font-semibold">Tiếp nhận đơn đã tạo</span><strong className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{pendingOrders}</strong></Link><Link href="/staff/inventory" className="flex items-center gap-3 rounded-lg border border-[#e2e4db] p-3 transition hover:border-[#8fc7a0] hover:bg-[#f8f7ef]"><AlertTriangle size={17} className="text-amber-600" /><span className="flex-1 text-sm font-semibold">Kiểm tra hàng sắp hết</span><strong className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{lowStockItems.length}</strong></Link><Link href="/staff/deliveries" className="flex items-center gap-3 rounded-lg border border-[#e2e4db] p-3 transition hover:border-[#8fc7a0] hover:bg-[#f8f7ef]"><Truck size={17} className="text-[#155e59]" /><span className="flex-1 text-sm font-semibold">Theo dõi đơn đang giao</span><strong className="rounded-full bg-[#e3f2e9] px-2 py-1 text-xs text-[#155e59]">{shippingOrders}</strong></Link></div></section>
      </div>
    </div>
  );
}
