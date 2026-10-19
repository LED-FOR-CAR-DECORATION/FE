"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart2, CalendarDays, ChevronDown, ClipboardCheck, Layers, Package, ShieldCheck, ShoppingCart, Truck, TrendingDown, TrendingUp, Zap } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { Pending: "Đã tạo đơn", Confirmed: "Đã nhận hàng", Shipping: "Đang giao", Delivered: "Đã giao hàng" };
const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-400",
  Confirmed: "bg-blue-100 text-blue-700 border-blue-400",
  Shipping: "bg-primary/30 text-primary-dark border-primary",
  Delivered: "bg-green-100 text-green-700 border-green-400",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`border px-2 py-0.5 text-[10px] font-bold rounded-sm ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function StatCard({ label, value, delta, icon }: { label: string; value: number; delta: number; icon: React.ReactNode }) {
  const positive = delta >= 0;
  return (
    <div className="neo-box-no-hover bg-white p-4 flex flex-col gap-2">
      <div className="w-10 h-10 bg-primary/20 border-2 border-black flex items-center justify-center">{icon}</div>
      <p className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-black leading-none">{value}</p>
      <p className={`text-xs font-bold flex items-center gap-1 ${positive ? "text-primary-dark" : "text-red-500"}`}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{positive ? "+" : ""}{delta}% <span className="text-text-muted font-medium">so với 7 ngày trước</span>
      </p>
    </div>
  );
}

export default function ManagerDashboard() {
  const recentOrders: string[][] = [];
  const todos = [
    ["Tiếp nhận đơn đã tạo", 6, <ShoppingCart size={14} />],
    ["Tạo đơn vận chuyển", 12, <Truck size={14} />],
    ["Kiểm tra hàng sắp hết", 3, <AlertTriangle size={14} />],
    ["Xem yêu cầu bảo hành", 4, <ShieldCheck size={14} />],
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1280px]">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div><h1 className="text-3xl font-black">Chào buổi sáng, Quản lý!</h1><p className="text-text-muted font-medium mt-1">Tổng quan hoạt động của cửa hàng.</p></div>
        <button className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 font-semibold text-sm"><CalendarDays size={16} /> 01/10/2024 – 08/10/2024 <ChevronDown size={14} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Đơn chờ xử lý" value={18} delta={12} icon={<Package size={20} />} />
        <StatCard label="Chờ giao" value={12} delta={-8} icon={<Truck size={20} />} />
        <StatCard label="Tồn kho LED" value={146} delta={5} icon={<Layers size={20} />} />
        <StatCard label="Sắp hết hàng" value={3} delta={-25} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 neo-box-no-hover bg-white p-5">
          <div className="flex items-center gap-2 mb-1"><BarChart2 size={18} /><h2 className="font-black text-lg">Tổng quan đơn hàng</h2></div>
          <p className="text-xs text-text-muted font-medium mb-4">Tổng số đơn hàng và doanh thu trong thời gian đã chọn.</p>
          <div className="h-40 flex items-end gap-3 border-b-2 border-black px-3">{[45, 70, 58, 88, 76, 62, 52].map((height, index) => <div key={index} className="flex-1 bg-primary border-2 border-black" style={{ height: `${height}%` }} />)}</div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2"><span>02/10</span><span>04/10</span><span>06/10</span><span>08/10</span></div>
        </div>
        <div className="lg:col-span-5 neo-box-no-hover bg-white p-5">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Layers size={18} /><h2 className="font-black text-lg">Trạng thái kho LED</h2></div><Link href="/staff/inventory" className="text-xs font-bold text-primary-dark hover:underline">Xem tất cả <ArrowRight size={13} className="inline" /></Link></div>
          {[['64 × 64 Matrix', 3, 'Sắp hết'], ['32 × 32 Matrix', 86, 'Còn hàng'], ['16 × 16 Matrix', 42, 'Còn hàng'], ['8 × 8 Matrix', 15, 'Sắp hết']].map(([name, count, status]) => <div key={String(name)} className="flex items-center gap-3 py-3 border-b-2 border-gray-100 last:border-0"><div className="w-9 h-9 bg-gray-200 border-2 border-black" /><div className="flex-1"><p className="text-sm font-bold">{name}</p><div className="h-2 bg-gray-200 border border-black"><div className="h-full bg-primary" style={{ width: `${Number(count)}%` }} /></div></div><span className="text-xs font-bold text-text-muted">{count}</span><span className="text-[10px] font-bold border border-primary text-primary-dark bg-primary/10 px-2 py-0.5">{status}</span></div>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 neo-box-no-hover bg-white p-5"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><ShoppingCart size={17} /><h2 className="font-black text-base">Đơn hàng gần đây</h2></div><Link href="/staff/orders" className="text-xs font-bold text-primary-dark hover:underline">Xem tất cả <ArrowRight size={13} className="inline" /></Link></div><table className="w-full text-xs"><thead><tr className="border-b-2 border-black text-left">{["Mã đơn", "Khách hàng", "Số tiền", "Trạng thái", "Ngày"].map((heading) => <th key={heading} className="pb-2 font-black uppercase">{heading}</th>)}</tr></thead><tbody>{recentOrders.map(([id, customer, amount, status, date]) => <tr key={id} className="border-b border-gray-100"><td className="py-2 font-bold">{id}</td><td className="py-2">{customer}</td><td className="py-2 font-bold">{amount}</td><td className="py-2"><StatusBadge status={status} /></td><td className="py-2 text-text-muted">{date}</td></tr>)}</tbody></table></div>
        <div className="lg:col-span-4 neo-box-no-hover bg-white p-5"><div className="flex items-center gap-2 mb-4"><ClipboardCheck size={17} /><h2 className="font-black text-base">Việc cần làm</h2></div><div className="flex flex-col gap-2">{todos.map(([label, count, icon]) => <button key={String(label)} className="flex items-center gap-3 p-2.5 border-2 border-black text-left w-full"><div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center">{icon}</div><span className="text-sm font-semibold flex-1">{label}</span><span className="w-6 h-6 bg-black text-white text-xs font-black flex items-center justify-center">{count}</span></button>)}</div></div>
        <div className="lg:col-span-3 neo-box-no-hover bg-white p-5"><div className="flex items-center gap-2 mb-4"><Zap size={17} /><h2 className="font-black text-base">Thao tác nhanh</h2></div><div className="grid grid-cols-2 gap-3">{[["Xem đơn hàng", "/staff/orders", <ShoppingCart size={22} />], ["Quản lý kho LED", "/staff/inventory", <Layers size={22} />], ["Cập nhật giá", "/staff/pricing", <Package size={22} />], ["Đơn giao hàng", "/staff/deliveries", <Truck size={22} />]].map(([label, href, icon]) => <Link key={String(label)} href={String(href)} className="flex flex-col items-center justify-center gap-2 p-3 border-2 border-black text-center text-xs font-bold hover:bg-primary/20">{icon}<span>{label}</span></Link>)}</div></div>
      </div>
    </div>
  );
}
