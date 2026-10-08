"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  ChevronDown,
  Circle,
  Clock,
  Eye,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";

type DeliveryStatus = "Created" | "Picked up" | "In transit" | "Out for delivery" | "Delivered" | "Exception";
type StatusFilter = DeliveryStatus | "All";

type Delivery = {
  id: string;
  orderId: string;
  trackingCode: string;
  customer: string;
  phone: string;
  address: string;
  service: string;
  createdAt: string;
  expectedAt: string;
  cod: number;
  status: DeliveryStatus;
  lastUpdate: string;
  timeline: { label: string; time: string; note?: string; done: boolean }[];
};

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  Created: { label: "Đã tạo đơn", badge: "bg-blue-100 text-blue-700 border-blue-400", icon: <Circle size={12} className="text-blue-500" /> },
  "Picked up": { label: "Đã lấy hàng", badge: "bg-cyan-100 text-cyan-700 border-cyan-400", icon: <Package size={12} className="text-cyan-600" /> },
  "In transit": { label: "Đang vận chuyển", badge: "bg-amber-100 text-amber-700 border-amber-400", icon: <Truck size={12} className="text-amber-500" /> },
  "Out for delivery": { label: "Đang giao hàng", badge: "bg-green-100 text-green-700 border-green-400", icon: <MapPin size={12} className="text-green-500" /> },
  Delivered: { label: "Đã giao", badge: "bg-gray-100 text-gray-600 border-gray-400", icon: <CheckCircle size={12} className="text-gray-500" /> },
  Exception: { label: "Có vấn đề", badge: "bg-red-100 text-red-700 border-red-400", icon: <X size={12} className="text-red-500" /> },
};

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: "DEL-1048",
    orderId: "ORD-1048",
    trackingCode: "VTPOST-ORD-1048",
    customer: "Nguyen Van Minh",
    phone: "0912345678",
    address: "123 Le Loi, Q1, TP.HCM",
    service: "ViettelPost Fast",
    createdAt: "08/10/2024 10:32",
    expectedAt: "10/10/2024",
    cod: 90,
    status: "In transit",
    lastUpdate: "Bưu cục Quận 1 đã tiếp nhận kiện hàng",
    timeline: [
      { label: "Tạo đơn vận chuyển", time: "08/10/2024 10:32", done: true },
      { label: "Đã lấy hàng", time: "08/10/2024 13:10", done: true },
      { label: "Đang vận chuyển", time: "08/10/2024 18:40", note: "Đang trên đường đến kho giao hàng", done: true },
      { label: "Đang giao hàng", time: "", done: false },
      { label: "Đã giao", time: "", done: false },
    ],
  },
  {
    id: "DEL-1046",
    orderId: "ORD-1046",
    trackingCode: "VTPOST-ORD-1046",
    customer: "Le Van Hoang",
    phone: "0976543210",
    address: "789 Tran Hung Dao, Q5, TP.HCM",
    service: "ViettelPost Fast",
    createdAt: "07/10/2024 18:45",
    expectedAt: "09/10/2024",
    cod: 120,
    status: "Out for delivery",
    lastUpdate: "Shipper đang giao hàng trong ngày hôm nay",
    timeline: [
      { label: "Tạo đơn vận chuyển", time: "07/10/2024 18:45", done: true },
      { label: "Đã lấy hàng", time: "07/10/2024 20:02", done: true },
      { label: "Đang vận chuyển", time: "08/10/2024 07:30", done: true },
      { label: "Đang giao hàng", time: "08/10/2024 08:15", note: "Shipper Nguyễn Văn A", done: true },
      { label: "Đã giao", time: "", done: false },
    ],
  },
  {
    id: "DEL-1042",
    orderId: "ORD-1042",
    trackingCode: "VTPOST-ORD-1042",
    customer: "Bui Van Nam",
    phone: "0932109876",
    address: "147 Dinh Tien Hoang, Bình Thạnh, HCM",
    service: "Standard",
    createdAt: "06/10/2024 09:15",
    expectedAt: "11/10/2024",
    cod: 80,
    status: "Delivered",
    lastUpdate: "Giao hàng thành công cho người nhận",
    timeline: [
      { label: "Tạo đơn vận chuyển", time: "06/10/2024 09:15", done: true },
      { label: "Đã lấy hàng", time: "06/10/2024 11:00", done: true },
      { label: "Đang vận chuyển", time: "07/10/2024 09:20", done: true },
      { label: "Đang giao hàng", time: "07/10/2024 14:05", done: true },
      { label: "Đã giao", time: "07/10/2024 16:22", note: "Đã thu COD 80$", done: true },
    ],
  },
  {
    id: "DEL-1047",
    orderId: "ORD-1047",
    trackingCode: "VTPOST-ORD-1047",
    customer: "Tran Thi Anh",
    phone: "0987654321",
    address: "456 Nguyen Hue, Q3, TP.HCM",
    service: "Standard",
    createdAt: "08/10/2024 09:20",
    expectedAt: "12/10/2024",
    cod: 47,
    status: "Created",
    lastUpdate: "Đang chờ bưu cục xác nhận lấy hàng",
    timeline: [
      { label: "Tạo đơn vận chuyển", time: "08/10/2024 09:20", done: true },
      { label: "Đã lấy hàng", time: "", done: false },
      { label: "Đang vận chuyển", time: "", done: false },
      { label: "Đang giao hàng", time: "", done: false },
      { label: "Đã giao", time: "", done: false },
    ],
  },
];

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-sm whitespace-nowrap ${config.badge}`}>
      {config.icon} {config.label}
    </span>
  );
}

function DeliveryTimeline({ delivery }: { delivery: Delivery }) {
  const lastDone = delivery.timeline.findLastIndex((step) => step.done);

  return (
    <div className="relative pl-7">
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200" />
      {delivery.timeline.map((step, index) => {
        const active = index === lastDone + 1 && lastDone < delivery.timeline.length - 1;
        return (
          <div key={step.label} className="relative flex flex-col mb-5 last:mb-0">
            <div className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center z-10 ${step.done ? "bg-primary" : active ? "bg-amber-300" : "bg-white"}`}>
              {step.done ? <CheckCircle size={11} /> : active ? <Clock size={11} /> : <Circle size={11} className="text-gray-300" />}
            </div>
            <p className={`text-sm font-bold ${!step.done && !active ? "text-gray-400" : ""}`}>{step.label}</p>
            {step.time && <p className="text-xs text-text-muted mt-0.5">{step.time}</p>}
            {step.note && <p className="text-xs text-text-muted mt-0.5">{step.note}</p>}
            {active && !step.time && <p className="text-xs text-amber-600 font-semibold mt-0.5">Đang chờ cập nhật</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES);
  const [selectedId, setSelectedId] = useState(MOCK_DELIVERIES[0].id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  const selected = deliveries.find((delivery) => delivery.id === selectedId) ?? deliveries[0];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deliveries.filter((delivery) => {
      const matchesStatus = statusFilter === "All" || delivery.status === statusFilter;
      const matchesSearch = !query || [delivery.id, delivery.orderId, delivery.trackingCode, delivery.customer, delivery.phone].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, search, statusFilter]);

  const refreshDelivery = () => {
    setDeliveries((current) => current.map((delivery) => delivery.id === selectedId ? { ...delivery, lastUpdate: "Đã kiểm tra cập nhật lúc vừa xong" } : delivery));
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Theo dõi giao hàng</h1>
          <p className="text-sm text-text-muted font-medium">Theo dõi toàn bộ đơn vận chuyển sau khi tạo vận đơn.</p>
        </div>
        <button onClick={refreshDelivery} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} /> Cập nhật trạng thái
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {([
          ["All", "Tổng đơn", deliveries.length],
          ["Created", "Chờ lấy hàng", deliveries.filter((item) => item.status === "Created").length],
          ["In transit", "Đang vận chuyển", deliveries.filter((item) => item.status === "In transit").length],
          ["Out for delivery", "Đang giao", deliveries.filter((item) => item.status === "Out for delivery").length],
          ["Delivered", "Đã giao", deliveries.filter((item) => item.status === "Delivered").length],
        ] as const).map(([value, label, count]) => (
          <button key={value} onClick={() => setStatusFilter(value)} className={`neo-box-no-hover p-3 text-left transition-shadow hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${statusFilter === value ? "bg-primary shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]" : "bg-white"}`}>
            <p className="text-xs font-bold uppercase text-text-muted">{label}</p>
            <p className="text-2xl font-black">{count}</p>
          </button>
        ))}
      </div>

      <div className="neo-box-no-hover bg-white p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-60 flex items-center gap-2 bg-gray-50 border-2 border-black px-3 py-2">
          <Search size={15} className="text-text-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã vận đơn, mã đơn, khách hàng..." className="bg-transparent outline-none text-sm w-full" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold appearance-none pr-8 outline-none cursor-pointer">
            <option value="All">Tất cả trạng thái</option>
            {Object.keys(STATUS_CONFIG).map((status) => <option key={status} value={status}>{STATUS_CONFIG[status as DeliveryStatus].label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
          <Filter size={14} /> Bộ lọc nâng cao
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        <div className="xl:col-span-3 neo-box-no-hover bg-white overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between">
            <h2 className="font-black uppercase text-sm">Danh sách vận đơn</h2>
            <span className="text-xs text-text-muted font-semibold">{filtered.length} kết quả</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-black">
                <tr>
                  {['Mã vận đơn', 'Khách nhận', 'Dịch vụ', 'Dự kiến', 'Trạng thái', ''].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-black uppercase whitespace-nowrap">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((delivery) => (
                  <tr key={delivery.id} onClick={() => setSelectedId(delivery.id)} className={`border-b border-gray-100 cursor-pointer transition-colors ${selectedId === delivery.id ? "bg-primary/20" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-black text-primary-dark">{delivery.trackingCode}</p>
                      <p className="text-xs text-text-muted">Đơn #{delivery.orderId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold whitespace-nowrap">{delivery.customer}</p>
                      <p className="text-xs text-text-muted">{delivery.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{delivery.service}</td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{delivery.expectedAt}</td>
                    <td className="px-4 py-3"><StatusBadge status={delivery.status} /></td>
                    <td className="px-4 py-3"><button className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-primary/30" title="Xem chi tiết"><Eye size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="px-4 py-12 text-center text-text-muted font-semibold">Không tìm thấy vận đơn phù hợp.</p>}
        </div>

        {selected && (
          <aside className="xl:col-span-2 neo-box-no-hover bg-white p-5">
            <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-4 mb-4">
              <div>
                <p className="text-xs text-text-muted font-bold uppercase">Mã vận đơn</p>
                <h2 className="text-lg font-black text-primary-dark">{selected.trackingCode}</h2>
                <Link href={`/staff/orders/${selected.orderId}`} className="text-xs font-bold underline hover:text-primary-dark">Xem đơn hàng #{selected.orderId}</Link>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="flex flex-col gap-2 text-sm mb-5">
              <p className="font-black flex items-center gap-2"><MapPin size={15} /> {selected.customer}</p>
              <p className="text-text-muted pl-6">{selected.phone}</p>
              <p className="text-text-muted pl-6">{selected.address}</p>
              <div className="grid grid-cols-2 gap-3 mt-2 bg-gray-50 border-2 border-black p-3 text-xs">
                <div><p className="text-text-muted">Ngày tạo</p><p className="font-bold">{selected.createdAt}</p></div>
                <div><p className="text-text-muted">Dự kiến giao</p><p className="font-bold">{selected.expectedAt}</p></div>
                <div><p className="text-text-muted">Dịch vụ</p><p className="font-bold">{selected.service}</p></div>
                <div><p className="text-text-muted">COD</p><p className="font-bold">${selected.cod}</p></div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={17} />
              <h3 className="font-black uppercase text-sm">Lịch trình vận chuyển</h3>
            </div>
            <DeliveryTimeline delivery={selected} />
            <div className="mt-5 bg-primary/10 border-2 border-primary p-3 text-xs font-semibold text-primary-dark flex gap-2">
              <Clock size={14} className="flex-shrink-0 mt-0.5" />
              <span>{selected.lastUpdate}</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
