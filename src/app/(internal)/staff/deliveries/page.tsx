"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ChevronDown, Circle, Clock3, Copy, Eye, Filter, MapPin, Package, RefreshCw, Search, Truck, UserRound, X } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";
import type { OrderStatus } from "@/features/order/types";

type StatusFilter = OrderStatus | "All";
type Delivery = {
  id: string; orderId: string; trackingCode: string; customer: string; phone: string; address: string; service: string;
  createdAt: string; expectedAt: string; cod: number; status: OrderStatus; lastUpdate: string;
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", className: "border-amber-300 bg-amber-50 text-amber-800" },
  PROCESSING: { label: "Chờ đóng hàng", className: "border-blue-300 bg-blue-50 text-blue-800" },
  PARTIALLY_FULFILLED: { label: "Đã cấp nhân vật và chờ đóng hàng", className: "border-purple-300 bg-purple-50 text-purple-800" },
  SHIPPING: { label: "Đang vận chuyển", className: "border-cyan-300 bg-cyan-50 text-cyan-800" },
  DELIVERED: { label: "Đã giao", className: "border-teal-300 bg-teal-50 text-teal-800" },
  COMPLETED: { label: "Đã hoàn thành", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  DELIVERY_FAILED: { label: "Vận chuyển thất bại", className: "border-orange-300 bg-orange-50 text-orange-800" },
  REFUNDED: { label: "Đã hoàn tiền", className: "border-gray-300 bg-gray-50 text-gray-800" },
  CANCELED: { label: "Đã hủy", className: "border-red-300 bg-red-50 text-red-800" },
  // Aliases for compatibility
  PendingPayment: { label: "Chờ thanh toán", className: "border-amber-300 bg-amber-50 text-amber-800" },
  Preparing: { label: "Chờ đóng hàng", className: "border-blue-300 bg-blue-50 text-blue-800" },
  HandedOver: { label: "Đã cấp nhân vật và chờ đóng hàng", className: "border-purple-300 bg-purple-50 text-purple-800" },
  Shipping: { label: "Đang vận chuyển", className: "border-cyan-300 bg-cyan-50 text-cyan-800" },
  Delivered: { label: "Đã giao", className: "border-teal-300 bg-teal-50 text-teal-800" },
  Completed: { label: "Đã hoàn thành", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  Cancelled: { label: "Đã hủy", className: "border-red-300 bg-red-50 text-red-800" },
  Pending: { label: "Chờ thanh toán", className: "border-amber-300 bg-amber-50 text-amber-800" },
  Confirmed: { label: "Chờ đóng hàng", className: "border-blue-300 bg-blue-50 text-blue-800" },
  Created: { label: "Chờ đóng hàng", className: "border-blue-300 bg-blue-50 text-blue-800" },
};

const FILTER_STATUS_KEYS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PROCESSING",
  "PARTIALLY_FULFILLED",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "DELIVERY_FAILED",
  "REFUNDED",
  "CANCELED",
];

const MOCK_DELIVERIES: Delivery[] = [];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "border-gray-200 bg-gray-50 text-gray-700" };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{config.label}</span>;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function ActivityTimeline({ delivery }: { delivery: Delivery }) {
  const steps = [
    { label: "Chờ thanh toán", done: true },
    { label: "Chờ đóng hàng", done: delivery.status !== "PENDING_PAYMENT" },
    { label: "Đã cấp nhân vật và chờ đóng hàng", done: ["PARTIALLY_FULFILLED", "SHIPPING", "DELIVERED", "COMPLETED"].includes(delivery.status) },
    { label: "Đang vận chuyển (AhaMove)", done: ["SHIPPING", "DELIVERED", "COMPLETED"].includes(delivery.status) },
    { label: "Đã giao", done: ["DELIVERED", "COMPLETED"].includes(delivery.status) },
    { label: "Đã hoàn thành", done: delivery.status === "COMPLETED" },
  ];
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const isCurrent = step.done && (index === steps.length - 1 || !steps[index + 1].done);
        return (
          <div key={step.label} className={`relative flex gap-3 rounded-lg p-3 ${isCurrent ? "bg-amber-50" : ""}`}>
            <div className="relative flex w-5 shrink-0 justify-center">
              {index < steps.length - 1 && (
                <span className={`absolute top-5 h-full w-px ${step.done ? "bg-primary-dark" : "bg-gray-300"}`} />
              )}
              <span className={`relative z-10 grid h-5 w-5 place-items-center rounded-full ${step.done ? "bg-primary-dark text-white" : "border border-gray-300 bg-white text-gray-400"}`}>
                {step.done ? <CheckCircle size={13} /> : <Circle size={10} />}
              </span>
            </div>
            <div>
              <p className={`text-sm font-bold ${isCurrent ? "text-amber-700" : step.done ? "text-text-main" : "text-gray-400"}`}>{step.label}</p>
              <p className="text-[11px] text-text-muted">{step.done ? delivery.createdAt : "Chưa có thông tin"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DeliveriesPage() {
  const { orders } = useOrders();
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES);
  const [selectedId, setSelectedId] = useState(MOCK_DELIVERIES[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const shared: Delivery[] = orders.filter((order) => order.delivery).map((order) => ({ id: order.delivery!.orderId, orderId: order.id, trackingCode: order.delivery!.orderId, customer: order.customer.fullName, phone: order.address.phoneNumber, address: order.address.fullAddress, service: "AhaMove Hỏa tốc", createdAt: new Date(order.delivery!.createdAt).toLocaleString("vi-VN"), expectedAt: new Date(order.delivery!.expectedAt).toLocaleDateString("vi-VN"), cod: order.paymentStatus === "Paid" ? 0 : order.total, status: order.status, lastUpdate: "Đơn vận chuyển đã được tạo" }));
    setDeliveries((current) => [...shared, ...current.filter((delivery) => !shared.some((item) => item.orderId === delivery.orderId))]);
  }, [orders]);

  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return deliveries.filter((delivery) => (statusFilter === "All" || delivery.status === statusFilter) && (!query || [delivery.id, delivery.orderId, delivery.trackingCode, delivery.customer, delivery.phone].some((value) => value.toLowerCase().includes(query)))); }, [deliveries, search, statusFilter]);
  const selected = deliveries.find((delivery) => delivery.id === selectedId) ?? filtered[0] ?? deliveries[0];
  const refreshDelivery = () => setDeliveries((current) => current.map((delivery) => delivery.id === selected?.id ? { ...delivery, lastUpdate: "Đã kiểm tra cập nhật lúc vừa xong" } : delivery));

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="mb-1 flex items-center gap-2 text-xs text-text-muted"><Link href="/staff/orders" className="hover:text-primary-dark">Đơn hàng</Link><span>/</span><span>Vận chuyển</span></div><h1 className="text-2xl font-black">Thông tin vận chuyển</h1><p className="text-sm text-text-muted">Theo dõi và quản lý đơn giao hàng</p></div><Link href="/staff/orders" className="btn-secondary flex items-center gap-2 text-sm"><ArrowLeft size={15} /> Quay lại đơn hàng</Link></div>
    <div className="neo-box-no-hover grid gap-4 bg-white p-5 lg:grid-cols-[1.25fr_repeat(4,1fr)]"><div className="flex items-center gap-3 border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0"><div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/20 text-primary-dark"><Truck size={26} /></div><div><h2 className="text-lg font-black">Đơn vận chuyển</h2><p className="text-xs text-text-muted">Đơn vị giao hàng: AhaMove</p></div></div><div><p className="text-[11px] text-text-muted">Mã vận đơn</p><p className="font-bold">{selected?.trackingCode ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Mã đơn hàng</p><p className="font-bold">{selected?.orderId ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Ngày tạo đơn</p><p className="font-bold">{selected?.createdAt ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Dự kiến giao</p><p className="font-bold">{selected?.expectedAt ?? "—"}</p></div></div>
    <div className="neo-box-no-hover flex flex-wrap items-center gap-3 bg-white p-4"><div className="flex min-w-60 flex-1 items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2"><Search size={15} className="text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã vận đơn, khách hàng..." className="w-full bg-transparent text-sm outline-none" /></div><div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm font-semibold outline-none"><option value="All">Tất cả trạng thái</option>{FILTER_STATUS_KEYS.map((key) => <option key={key} value={key}>{STATUS_CONFIG[key].label}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" /></div><button className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"><Filter size={14} /> Bộ lọc</button><button onClick={refreshDelivery} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"><RefreshCw size={14} /> Cập nhật</button></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,1fr)]"><section className="neo-box-no-hover overflow-hidden bg-white"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 className="font-black">Danh sách vận chuyển</h2><span className="text-xs text-text-muted">{filtered.length} kết quả</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{["Mã vận đơn", "Khách nhận", "Dự kiến", "Trạng thái", ""].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase">{heading}</th>)}</tr></thead><tbody>{filtered.map((delivery) => <tr key={delivery.id} onClick={() => setSelectedId(delivery.id)} className={`cursor-pointer border-t border-gray-100 ${selected?.id === delivery.id ? "bg-primary/15" : "hover:bg-gray-50"}`}><td className="px-4 py-3"><p className="font-black text-primary-dark">{delivery.trackingCode}</p><p className="text-[11px] text-text-muted">{delivery.orderId}</p></td><td className="px-4 py-3"><p className="whitespace-nowrap font-bold">{delivery.customer}</p><p className="text-[11px] text-text-muted">{delivery.phone}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs">{delivery.expectedAt}</td><td className="px-4 py-3"><StatusBadge status={delivery.status} /></td><td className="px-4 py-3"><button className="grid h-7 w-7 place-items-center rounded border border-gray-300 hover:bg-primary/20" title="Xem chi tiết"><Eye size={13} /></button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <p className="px-4 py-12 text-center text-text-muted">Không tìm thấy đơn vận chuyển phù hợp.</p>}</section>
      {selected && <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4"><div><p className="text-[11px] font-bold uppercase text-text-muted">Mã vận đơn</p><h2 className="text-xl font-black text-primary-dark">{selected.trackingCode}</h2><Link href={`/staff/orders/${selected.orderId}`} className="text-xs font-bold text-text-muted underline hover:text-primary-dark">Xem đơn hàng {selected.orderId}</Link></div><StatusBadge status={selected.status} /></div><div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-xs"><div><p className="text-text-muted">Người nhận</p><p className="font-bold">{selected.customer}</p></div><div><p className="text-text-muted">Số điện thoại</p><p className="font-bold">{selected.phone}</p></div><div className="col-span-2"><p className="text-text-muted">Địa chỉ giao hàng</p><p className="font-bold">{selected.address}</p></div></div><div className="mb-5 flex items-center justify-between"><h3 className="font-black">Hành trình đơn</h3><button className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-primary-dark"><Copy size={13} /> Sao chép mã</button></div><ActivityTimeline delivery={selected} /><div className="mt-5 grid gap-4 border-t border-gray-200 pt-5 md:grid-cols-2"><div><div className="mb-2 flex items-center gap-2 font-black"><UserRound size={16} /> Thông tin tài xế</div><div className="rounded-lg border border-gray-200 p-3 text-xs text-text-muted">Chưa có tài xế nhận đơn<br /><span className="text-[11px]">AhaMove đang điều phối tài xế gần nhất.</span></div></div><div><div className="mb-2 flex items-center gap-2 font-black"><Package size={16} /> Phí vận chuyển</div><div className="rounded-lg border border-gray-200 p-3 text-xs"><p className="flex justify-between"><span>Phí dự kiến</span><strong>{formatMoney(selected.cod > 0 ? Math.max(0, selected.cod * 0.05) : 0)}</strong></p><p className="mt-1 flex justify-between text-text-muted"><span>Người trả phí</span><span>Người gửi</span></p></div></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={refreshDelivery} className="btn-secondary flex items-center gap-1.5 text-xs"><RefreshCw size={13} /> Làm mới trạng thái</button><Link href={`/staff/orders/${selected.orderId}`} className="btn-primary flex items-center gap-1.5 text-xs"><Truck size={13} /> Xem chi tiết đơn</Link></div></section>}</div>
  </div>;
}
