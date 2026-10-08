"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Package, MapPin, Truck, CheckCircle, Clock,
  Circle, X, ChevronDown, User, Phone, Home, Building2,
  Save, RefreshCw, AlertTriangle, FileText, CreditCard, Plus
} from "lucide-react";

/* ── Shared mock data (same shape as customer mock) ── */
const MOCK_ORDERS = [
  {
    id: "ORD-1048", customer: "Nguyen Van Minh", phone: "0912345678",
    address: "123 Le Loi, Q1, TP.HCM", date: "Oct 8, 10:24",
    status: "Pending", service: "ViettelPost Fast",
    items: [{ name: "32×32 Matrix Panel", qty: 2, price: 40 }, { name: "Character Sprite Pack A", qty: 1, price: 5 }],
    subtotal: 45, shipping: 5, total: 50, cod: 50,
  },
  {
    id: "ORD-1047", customer: "Tran Thi Anh", phone: "0987654321",
    address: "456 Nguyen Hue, Q3, TP.HCM", date: "Oct 8, 09:12",
    status: "Confirmed", service: "Standard",
    items: [{ name: "16×16 Matrix Panel", qty: 1, price: 45 }],
    subtotal: 45, shipping: 2, total: 47, cod: 47,
  },
];

type OrderStatus = "Pending" | "Confirmed" | "Shipping" | "Delivered" | "Cancelled";

const STATUS_CFG: Record<string, string> = {
  Pending:   "bg-amber-100 text-amber-700 border-amber-400",
  Confirmed: "bg-blue-100  text-blue-700  border-blue-400",
  Shipping:  "bg-green-100 text-green-700 border-green-400",
  Delivered: "bg-gray-100  text-gray-600  border-gray-400",
  Cancelled: "bg-red-100   text-red-700   border-red-400",
};

/* ── Create Shipping Order Modal (ViettelPost-style) ── */
function CreateShippingModal({ order, onClose, onSubmit }: {
  order: typeof MOCK_ORDERS[0];
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [payerType, setPayerType] = useState<"sender" | "recipient">("sender");
  const sel = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white appearance-none cursor-pointer";
  const inp = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white placeholder:text-gray-400";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-5xl bg-[#f5f5f5] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary border-b-2 border-black">
          <div className="flex items-center gap-2 font-black text-sm uppercase">
            <Truck size={15} /> Tạo đơn vận chuyển — #{order.id}
          </div>
          <button onClick={onClose} className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100">
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-black">

          {/* ── LEFT ── */}
          <div className="p-5 flex flex-col gap-5">

            {/* Sender */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <User size={13} /> Người gửi (Cửa hàng)
              </div>
              <div className="bg-white border-2 border-black p-4 text-sm">
                <p className="font-black">Mirage LED Store</p>
                <p className="text-text-muted">19/10, Lô 7A, KP 3, Đường Hưng Thuận, Q.12, TP.HCM</p>
                <p className="text-text-muted">0912 293 933</p>
              </div>
              <div className="mt-2">
                <label className="text-xs font-bold uppercase mb-1 block">Thời gian lấy hàng</label>
                <div className="relative">
                  <select className={sel}>
                    <option>Chọn thời gian</option>
                    <option>Hôm nay – Buổi sáng (8:00–12:00)</option>
                    <option>Hôm nay – Buổi chiều (13:00–17:00)</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </section>

            {/* Recipient (pre-filled from order) */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <MapPin size={13} /> Người nhận (Khách hàng)
              </div>
              <div className="flex flex-col gap-2 opacity-80 pointer-events-none">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block text-text-muted">Họ tên</label>
                    <input defaultValue={order.customer} className={inp} disabled />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block text-text-muted">Điện thoại</label>
                    <input defaultValue={order.phone} className={inp} disabled />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-text-muted">Địa chỉ</label>
                  <input defaultValue={order.address} className={inp} disabled />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Tỉnh/Thành phố", "Quận/Huyện", "Xã/Phường", "Đường/Tổ/Xóm"].map((ph) => (
                    <div key={ph} className="relative">
                      <select className={sel} disabled><option>{ph}</option></select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block text-text-muted">Thời gian giao</label>
                  <div className="relative">
                    <select className={sel} disabled>
                      <option>Cả ngày</option>
                      <option>Buổi sáng</option>
                      <option>Buổi chiều</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                  </div>
                </div>
              </div>
            </section>

            {/* Service */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <Truck size={13} /> Dịch vụ vận chuyển
              </div>
              <div className="flex flex-col gap-2 opacity-80 pointer-events-none">
                {[
                  { label: "ViettelPost Fast (2–3 ngày)", price: "$5.00", selected: order.service === "ViettelPost Fast" },
                  { label: "Standard (5–7 ngày)",         price: "$2.00", selected: order.service === "Standard" },
                ].map((svc, i) => (
                  <label key={i} className={`flex items-center justify-between border-2 px-3 py-2.5 cursor-not-allowed transition-colors ${svc.selected ? "border-primary bg-primary/10" : "border-black bg-gray-50 opacity-50"}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <input type="radio" name="svc" defaultChecked={svc.selected} disabled className="accent-primary" />
                      {svc.label}
                    </span>
                    <span className="font-black text-sm">{svc.price}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* ── RIGHT ── */}
          <div className="p-5 flex flex-col gap-5">

            {/* Product info (pre-filled) */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <Package size={13} /> Thông tin hàng hóa
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Loại hàng hóa</label>
                  <div className="flex gap-4 text-sm font-medium">
                    {["Đơn kiện", "Tài liệu"].map((t, i) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="type" defaultChecked={i === 0} className="accent-primary" /> {t}
                      </label>
                    ))}
                  </div>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="bg-white border-2 border-black p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <input defaultValue={item.name} className={inp + " mb-1"} />
                      <div className="grid grid-cols-3 gap-1.5">
                        <input defaultValue={item.qty} type="number" placeholder="SL" className={inp} />
                        <input placeholder="Trọng lượng (g)" type="number" className={inp} />
                        <input defaultValue={item.price * 1000000} placeholder="Giá trị (đ)" type="number" className={inp} />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn-secondary text-xs py-1.5 w-fit flex items-center gap-1.5">
                  <Plus size={12} /> Thêm hàng hóa
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {["Dài (cm)", "Rộng (cm)", "Cao (cm)"].map(ph => (
                    <input key={ph} type="number" placeholder={ph} className={inp} />
                  ))}
                </div>
              </div>
            </section>

            {/* COD + Payer */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <CreditCard size={13} /> Thanh toán & Tiền thu hộ
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">COD (Tiền thu hộ)</label>
                  <input type="number" defaultValue={order.cod} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block">Người trả cước</label>
                  {(["sender", "recipient"] as const).map(t => (
                    <label key={t} className="flex items-center gap-1.5 text-sm font-medium cursor-pointer mb-1">
                      <input type="radio" checked={payerType === t} onChange={() => setPayerType(t)} className="accent-primary" />
                      {t === "sender" ? "Người gửi" : "Người nhận"}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Notes */}
            <section>
              <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-3 font-black text-xs uppercase tracking-wide">
                <FileText size={13} /> Ghi chú
              </div>
              <textarea rows={3} placeholder="Nhập ghi chú cho shipper..." className="w-full bg-gray-50 border-2 border-black p-3 text-sm outline-none focus:bg-white resize-none" />
            </section>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t-2 border-black bg-white px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 text-sm font-bold">
            <span>Tổng cước: <span className="text-lg font-black">${order.shipping}.00</span></span>
            <span>COD: <span className="text-lg font-black">${order.cod}.00</span></span>
            <span className="text-text-muted text-xs flex items-center gap-1"><Clock size={12} /> Dự kiến: 2-3 ngày</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
              <X size={14} /> Hủy
            </button>
            <button className="flex items-center gap-1.5 border-2 border-primary bg-primary/20 text-primary-dark px-3 py-2 text-sm font-bold hover:bg-primary/40">
              <RefreshCw size={14} /> Đổi ngày
            </button>
            <button onClick={onSubmit} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Save size={14} /> Tạo đơn vận chuyển
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Staff Order Detail Page ── */
export default function StaffOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState(
    MOCK_ORDERS.find(o => o.id === orderId) ?? MOCK_ORDERS[0]
  );
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingCreated, setShippingCreated] = useState(false);

  const handleConfirm = () => {
    setOrder(prev => ({ ...prev, status: "Confirmed" }));
  };

  const handleCreateShipping = () => {
    setShowShippingModal(false);
    setShippingCreated(true);
    setOrder(prev => ({ ...prev, status: "Shipping" }));
  };

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl font-black mb-4">Order not found</p>
        <Link href="/staff/orders" className="btn-primary text-sm px-6 py-2.5">← Back to Orders</Link>
      </div>
    );
  }

  const TIMELINE = [
    { label: "Order Placed",     done: true,                                          },
    { label: "Confirmed by Staff", done: order.status !== "Pending",                 },
    { label: "Shipping Created",   done: shippingCreated || order.status === "Shipping" },
    { label: "In Transit",        done: false                                         },
    { label: "Delivered",         done: order.status === "Delivered"                 },
  ];

  return (
    <>
      {showShippingModal && (
        <CreateShippingModal
          order={order}
          onClose={() => setShowShippingModal(false)}
          onSubmit={handleCreateShipping}
        />
      )}

      <div className="flex flex-col gap-5 max-w-5xl">

        {/* Back + title */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/staff/orders" className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3">
            <ArrowLeft size={14} /> All Orders
          </Link>
          <h1 className="text-xl font-black uppercase">Order #{order.id}</h1>
          <span className={`border px-2.5 py-1 text-xs font-black rounded-sm ${STATUS_CFG[order.status]}`}>
            {order.status}
          </span>
        </div>

        {/* Action bar */}
        <div className="neo-box-no-hover bg-white p-4 flex items-center gap-3 flex-wrap">
          {order.status === "Pending" && (
            <button
              onClick={handleConfirm}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <CheckCircle size={15} /> Confirm Order
            </button>
          )}
          {(order.status === "Confirmed" || order.status === "Pending") && !shippingCreated && (
            <button
              onClick={() => setShowShippingModal(true)}
              className="btn-secondary flex items-center gap-1.5 text-sm"
              disabled={order.status === "Pending"}
              style={{ opacity: order.status === "Pending" ? 0.5 : 1, cursor: order.status === "Pending" ? "not-allowed" : "pointer" }}
            >
              <Truck size={15} /> Create Shipping Order
            </button>
          )}
          {shippingCreated && (
            <div className="flex items-center gap-2 text-sm font-bold text-primary-dark bg-primary/10 border-2 border-primary px-3 py-2">
              <CheckCircle size={15} /> Shipping order created — tracking: VTPOST-{order.id}
            </div>
          )}
          {order.status === "Pending" && (
            <p className="text-xs text-text-muted flex items-center gap-1 ml-2">
              <AlertTriangle size={12} /> Confirm the order first before creating a shipping order.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: timeline + items */}
          <div className="lg:col-span-3 flex flex-col gap-5">

            {/* Status Timeline */}
            <div className="neo-box-no-hover bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock size={17} />
                <h2 className="font-black text-base uppercase">Order Progress</h2>
              </div>
              <div className="relative pl-7">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
                {TIMELINE.map((step, i) => (
                  <div key={i} className="relative flex flex-col mb-5 last:mb-0">
                    <div className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center z-10
                      ${step.done ? "bg-primary" : "bg-white"}`}>
                      {step.done ? <CheckCircle size={11} /> : <Circle size={11} className="text-gray-300" />}
                    </div>
                    <p className={`text-sm font-bold ${!step.done ? "text-gray-400" : ""}`}>{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="neo-box-no-hover bg-white p-6">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-3">
                <Package size={17} />
                <h2 className="font-black text-base uppercase">Items</h2>
              </div>
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-12 h-12 bg-gray-200 border-2 border-black flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">[IMG]</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-text-muted">Qty: {item.qty}</p>
                  </div>
                  <p className="font-black">${item.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: customer + summary */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Customer info */}
            <div className="neo-box-no-hover bg-white p-5">
              <div className="flex items-center gap-2 mb-3 border-b-2 border-black pb-2">
                <User size={15} /><h2 className="font-black text-sm uppercase">Customer</h2>
              </div>
              <p className="font-black">{order.customer}</p>
              <p className="text-sm text-text-muted flex items-center gap-1 mt-1"><Phone size={12} /> {order.phone}</p>
              <p className="text-sm mt-1 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0" />{order.address}</p>
              <p className="text-xs text-text-muted mt-2 flex items-center gap-1"><Clock size={11} /> Ordered: {order.date}</p>
            </div>

            {/* Order totals */}
            <div className="neo-box-no-hover bg-white p-5">
              <h2 className="font-black text-sm uppercase mb-3 border-b-2 border-black pb-2">Order Summary</h2>
              <div className="flex flex-col gap-2 text-sm font-bold">
                <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>${order.subtotal}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>${order.shipping}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">COD</span><span>${order.cod}</span></div>
                <div className="flex justify-between text-base font-black border-t-2 border-dashed border-black pt-2 mt-1">
                  <span>Total</span><span className="text-primary-dark">${order.total}</span>
                </div>
              </div>
              <div className="mt-3 bg-gray-50 border-2 border-black px-3 py-2 text-xs font-semibold text-text-muted">
                Service: {order.service}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
