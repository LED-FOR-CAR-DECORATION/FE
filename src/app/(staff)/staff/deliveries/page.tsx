"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ChevronDown, Circle, Clock3, Copy, Eye, Filter, MapPin, Package, RefreshCw, Search, Truck, UserRound, X } from "lucide-react";
import { useOrders } from "@/features/order/context/OrderContext";

type DeliveryStatus = "Created" | "Picked up" | "In transit" | "Out for delivery" | "Delivered" | "Exception";
type StatusFilter = DeliveryStatus | "All";
type Delivery = {
  id: string; orderId: string; trackingCode: string; customer: string; phone: string; address: string; service: string;
  createdAt: string; expectedAt: string; cod: number; status: DeliveryStatus; lastUpdate: string;
};

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; className: string }> = {
  Created: { label: "Đã tạo đơn", className: "border-blue-200 bg-blue-50 text-blue-700" },
  "Picked up": { label: "Đã lấy hàng", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  "In transit": { label: "Đang vận chuyển", className: "border-amber-200 bg-amber-50 text-amber-700" },
  "Out for delivery": { label: "Đang giao hàng", className: "border-green-200 bg-green-50 text-green-700" },
  Delivered: { label: "Đã giao hàng", className: "border-gray-200 bg-gray-100 text-gray-600" },
  Exception: { label: "Có vấn đề", className: "border-red-200 bg-red-50 text-red-700" },
};

const MOCK_DELIVERIES: Delivery[] = [
  { id: "DEL-1048", orderId: "ORD-1048", trackingCode: "VC-ORD-1048", customer: "Nguyen Van Minh", phone: "0912345678", address: "123 Le Loi, Q1, TP.HCM", service: "Tiêu chuẩn", createdAt: "08/10/2024 10:32", expectedAt: "10/10/2024", cod: 90, status: "In transit", lastUpdate: "Đang trên đường đến kho giao hàng" },
  { id: "DEL-1046", orderId: "ORD-1046", trackingCode: "VC-ORD-1046", customer: "Le Van Hoang", phone: "0976543210", address: "789 Tran Hung Dao, Q5, TP.HCM", service: "Tiêu chuẩn", createdAt: "07/10/2024 18:45", expectedAt: "09/10/2024", cod: 120, status: "Out for delivery", lastUpdate: "Đang giao hàng trong ngày hôm nay" },
  { id: "DEL-1042", orderId: "ORD-1042", trackingCode: "VC-ORD-1042", customer: "Bui Van Nam", phone: "0932109876", address: "147 Dinh Tien Hoang, Bình Thạnh, HCM", service: "Tiêu chuẩn", createdAt: "06/10/2024 09:15", expectedAt: "11/10/2024", cod: 80, status: "Delivered", lastUpdate: "Giao hàng thành công cho người nhận" },
];

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const config = STATUS_CONFIG[status];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{config.label}</span>;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function DeliveryProgress({ status }: { status: DeliveryStatus }) {
  const steps = [{ label: "Đã tạo đơn", icon: CheckCircle }, { label: "Đã nhận hàng", icon: Package }, { label: "Đang giao", icon: Truck }, { label: "Giao thành công", icon: CheckCircle }];
  const activeIndex = status === "Created" ? 0 : status === "Picked up" || status === "In transit" ? 1 : status === "Out for delivery" ? 2 : status === "Delivered" ? 3 : 1;
  return <div className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-white p-5">{steps.map(({ label, icon: Icon }, index) => <div key={label} className="relative flex flex-col items-center gap-2 text-center">{index < steps.length - 1 && <span className={`absolute left-1/2 top-4 h-0.5 w-full ${index < activeIndex ? "bg-primary-dark" : "bg-gray-200"}`} />}<span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 ${index < activeIndex ? "border-primary-dark bg-primary text-primary-dark" : index === activeIndex ? "border-amber-400 bg-amber-100 text-amber-700" : "border-gray-300 bg-white text-gray-400"}`}><Icon size={16} /></span><span className={`text-xs font-bold ${index <= activeIndex ? "text-text-main" : "text-gray-400"}`}>{label}</span><span className="text-[10px] text-text-muted">{index <= activeIndex ? (index === activeIndex ? "Đang cập nhật" : "Đã cập nhật") : "Chưa có thông tin"}</span></div>)}</div>;
}

function ActivityTimeline({ delivery }: { delivery: Delivery }) {
  const active = delivery.status === "Delivered" ? 3 : delivery.status === "Out for delivery" ? 2 : delivery.status === "Created" ? 0 : 1;
  const steps = ["Tạo đơn giao hàng", "Đơn vận chuyển đã tiếp nhận", "Đang tìm tài xế", "Đã nhận hàng", "Đang giao hàng", "Giao hàng thành công"];
  return <div className="space-y-1">{steps.map((label, index) => { const done = index < active || delivery.status === "Delivered"; const current = index === active && delivery.status !== "Delivered"; return <div key={label} className={`relative flex gap-3 rounded-lg p-3 ${current ? "bg-amber-50" : ""}`}><div className="relative flex w-5 shrink-0 justify-center">{index < steps.length - 1 && <span className={`absolute top-5 h-full w-px ${done ? "bg-primary-dark" : "bg-gray-300"}`} />}<span className={`relative z-10 grid h-5 w-5 place-items-center rounded-full ${done ? "bg-primary-dark text-white" : current ? "bg-amber-400 text-white" : "border border-gray-300 bg-white text-gray-400"}`}>{done ? <CheckCircle size={13} /> : current ? <Truck size={12} /> : <Circle size={10} />}</span></div><div><p className={`text-sm font-bold ${current ? "text-amber-700" : done ? "text-text-main" : "text-gray-400"}`}>{label}</p><p className="text-[11px] text-text-muted">{done ? delivery.createdAt : current ? delivery.lastUpdate : "Chưa có thông tin"}</p></div></div>; })}</div>;
}

export default function DeliveriesPage() {
  const { orders } = useOrders();
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES);
  const [selectedId, setSelectedId] = useState(MOCK_DELIVERIES[0].id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const shared: Delivery[] = orders.filter((order) => order.delivery).map((order) => ({ id: order.delivery!.orderId, orderId: order.id, trackingCode: order.delivery!.orderId, customer: order.customer.fullName, phone: order.address.phoneNumber, address: order.address.fullAddress, service: "Tiêu chuẩn", createdAt: new Date(order.delivery!.createdAt).toLocaleString("vi-VN"), expectedAt: new Date(order.delivery!.expectedAt).toLocaleDateString("vi-VN"), cod: order.paymentStatus === "Paid" ? 0 : order.total, status: order.delivery!.status, lastUpdate: "Đơn vận chuyển đã được tạo" }));
    setDeliveries((current) => [...shared, ...current.filter((delivery) => !shared.some((item) => item.orderId === delivery.orderId))]);
  }, [orders]);

  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return deliveries.filter((delivery) => (statusFilter === "All" || delivery.status === statusFilter) && (!query || [delivery.id, delivery.orderId, delivery.trackingCode, delivery.customer, delivery.phone].some((value) => value.toLowerCase().includes(query)))); }, [deliveries, search, statusFilter]);
  const selected = deliveries.find((delivery) => delivery.id === selectedId) ?? filtered[0] ?? deliveries[0];
  const refreshDelivery = () => setDeliveries((current) => current.map((delivery) => delivery.id === selected?.id ? { ...delivery, lastUpdate: "Đã kiểm tra cập nhật lúc vừa xong" } : delivery));

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="mb-1 flex items-center gap-2 text-xs text-text-muted"><Link href="/staff/orders" className="hover:text-primary-dark">Đơn hàng</Link><span>/</span><span>Vận chuyển</span></div><h1 className="text-2xl font-black">Thông tin vận chuyển</h1><p className="text-sm text-text-muted">Theo dõi và quản lý đơn giao hàng</p></div><Link href="/staff/orders" className="btn-secondary flex items-center gap-2 text-sm"><ArrowLeft size={15} /> Quay lại đơn hàng</Link></div>
    <div className="neo-box-no-hover grid gap-4 bg-white p-5 lg:grid-cols-[1.25fr_repeat(4,1fr)]"><div className="flex items-center gap-3 border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0"><div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/20 text-primary-dark"><Truck size={26} /></div><div><h2 className="text-lg font-black">Đơn vận chuyển</h2><p className="text-xs text-text-muted">Đơn vị giao hàng</p></div></div><div><p className="text-[11px] text-text-muted">Mã vận đơn</p><p className="font-bold">{selected?.trackingCode ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Mã đơn hàng</p><p className="font-bold">{selected?.orderId ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Ngày tạo đơn</p><p className="font-bold">{selected?.createdAt ?? "—"}</p></div><div><p className="text-[11px] text-text-muted">Dự kiến giao</p><p className="font-bold">{selected?.expectedAt ?? "—"}</p></div></div>
    {selected && <DeliveryProgress status={selected.status} />}
    <div className="neo-box-no-hover flex flex-wrap items-center gap-3 bg-white p-4"><div className="flex min-w-60 flex-1 items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2"><Search size={15} className="text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã vận đơn, khách hàng..." className="w-full bg-transparent text-sm outline-none" /></div><div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-sm font-semibold outline-none"><option value="All">Tất cả trạng thái</option>{Object.keys(STATUS_CONFIG).map((status) => <option key={status} value={status}>{STATUS_CONFIG[status as DeliveryStatus].label}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" /></div><button className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"><Filter size={14} /> Bộ lọc</button><button onClick={refreshDelivery} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"><RefreshCw size={14} /> Cập nhật</button></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,1fr)]"><section className="neo-box-no-hover overflow-hidden bg-white"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 className="font-black">Danh sách vận chuyển</h2><span className="text-xs text-text-muted">{filtered.length} kết quả</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{["Mã vận đơn", "Khách nhận", "Dự kiến", "Trạng thái", ""].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase">{heading}</th>)}</tr></thead><tbody>{filtered.map((delivery) => <tr key={delivery.id} onClick={() => setSelectedId(delivery.id)} className={`cursor-pointer border-t border-gray-100 ${selected?.id === delivery.id ? "bg-primary/15" : "hover:bg-gray-50"}`}><td className="px-4 py-3"><p className="font-black text-primary-dark">{delivery.trackingCode}</p><p className="text-[11px] text-text-muted">{delivery.orderId}</p></td><td className="px-4 py-3"><p className="whitespace-nowrap font-bold">{delivery.customer}</p><p className="text-[11px] text-text-muted">{delivery.phone}</p></td><td className="whitespace-nowrap px-4 py-3 text-xs">{delivery.expectedAt}</td><td className="px-4 py-3"><StatusBadge status={delivery.status} /></td><td className="px-4 py-3"><button className="grid h-7 w-7 place-items-center rounded border border-gray-300 hover:bg-primary/20" title="Xem chi tiết"><Eye size={13} /></button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <p className="px-4 py-12 text-center text-text-muted">Không tìm thấy đơn vận chuyển phù hợp.</p>}</section>
      {selected && <section className="neo-box-no-hover bg-white p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4"><div><p className="text-[11px] font-bold uppercase text-text-muted">Mã vận đơn</p><h2 className="text-xl font-black text-primary-dark">{selected.trackingCode}</h2><Link href={`/staff/orders/${selected.orderId}`} className="text-xs font-bold text-text-muted underline hover:text-primary-dark">Xem đơn hàng {selected.orderId}</Link></div><StatusBadge status={selected.status} /></div><div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-xs"><div><p className="text-text-muted">Người nhận</p><p className="font-bold">{selected.customer}</p></div><div><p className="text-text-muted">Số điện thoại</p><p className="font-bold">{selected.phone}</p></div><div className="col-span-2"><p className="text-text-muted">Địa chỉ giao hàng</p><p className="font-bold">{selected.address}</p></div></div><div className="mb-5 flex items-center justify-between"><h3 className="font-black">Hành trình đơn</h3><button className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-primary-dark"><Copy size={13} /> Sao chép mã</button></div><ActivityTimeline delivery={selected} /><div className="mt-5 grid gap-4 border-t border-gray-200 pt-5 md:grid-cols-2"><div><div className="mb-2 flex items-center gap-2 font-black"><UserRound size={16} /> Thông tin tài xế</div><div className="rounded-lg border border-gray-200 p-3 text-xs text-text-muted">Chưa có tài xế nhận đơn<br /><span className="text-[11px]">Đơn vị giao hàng đang tìm tài xế phù hợp.</span></div></div><div><div className="mb-2 flex items-center gap-2 font-black"><Package size={16} /> Phí vận chuyển</div><div className="rounded-lg border border-gray-200 p-3 text-xs"><p className="flex justify-between"><span>Phí dự kiến</span><strong>{formatMoney(selected.cod > 0 ? Math.max(0, selected.cod * 0.05) : 0)}</strong></p><p className="mt-1 flex justify-between text-text-muted"><span>Người trả phí</span><span>Người gửi</span></p></div></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={refreshDelivery} className="btn-secondary flex items-center gap-1.5 text-xs"><RefreshCw size={13} /> Làm mới trạng thái</button><Link href={`/staff/orders/${selected.orderId}`} className="btn-primary flex items-center gap-1.5 text-xs"><Truck size={13} /> Xem chi tiết đơn</Link></div></section>}</div>
  </div>;
}
