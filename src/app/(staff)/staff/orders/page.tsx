"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search, Filter, Plus, Eye, Edit2, Truck, ChevronDown,
  ArrowLeft, X, Package, User, MapPin, Clock, Tag,
  CreditCard, FileText, Save, RefreshCw, CheckCircle,
  AlertCircle, Circle
} from "lucide-react";

/* ══════════════ TYPES ══════════════ */
type OrderStatus = "Pending" | "Confirmed" | "Shipping" | "Delivered" | "Cancelled";

interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  items: string;
  amount: number;
  cod: number;
  status: OrderStatus;
  date: string;
  service: string;
}

/* ══════════════ MOCK DATA ══════════════ */
const MOCK_ORDERS: Order[] = [
  { id: "ORD-1048", customer: "Nguyen Van Minh", phone: "0912345678", address: "123 Le Loi, Q1, TP.HCM",         items: "32×32 Matrix ×2",       amount: 90,  cod: 90,  status: "Pending",   date: "Oct 8, 10:24", service: "ViettelPost Fast" },
  { id: "ORD-1047", customer: "Tran Thi Anh",   phone: "0987654321", address: "456 Nguyen Hue, Q3, TP.HCM",    items: "16×16 Matrix ×1",       amount: 45,  cod: 45,  status: "Confirmed", date: "Oct 8, 09:12", service: "Standard" },
  { id: "ORD-1046", customer: "Le Van Hoang",   phone: "0976543210", address: "789 Tran Hung Dao, Q5, TP.HCM", items: "64×64 Matrix ×1",       amount: 120, cod: 120, status: "Shipping",  date: "Oct 7, 18:40", service: "ViettelPost Fast" },
  { id: "ORD-1044", customer: "Hoang Minh Tuan",phone: "0954321098", address: "654 Vo Van Tan, Q3, TP.HCM",   items: "8×8 Matrix ×3",         amount: 60,  cod: 60,  status: "Pending",   date: "Oct 7, 11:05", service: "Standard" },
  { id: "ORD-1043", customer: "Dang Thi Mai",   phone: "0943210987", address: "987 CMT8, Q10, TP.HCM",        items: "32×32 Matrix ×1, Sprite", amount: 75, cod: 0,  status: "Confirmed", date: "Oct 6, 16:33", service: "ViettelPost Fast" },
  { id: "ORD-1042", customer: "Bui Van Nam",    phone: "0932109876", address: "147 Dinh Tien Hoang, BT, HCM", items: "16×16 Matrix ×2",       amount: 80,  cod: 80,  status: "Delivered", date: "Oct 6, 09:00", service: "Standard" },
  { id: "ORD-1041", customer: "Vo Thi Hoa",    phone: "0921098765", address: "258 Xo Viet Nghe Tinh, BT",    items: "64×64 Matrix ×2",       amount: 240, cod: 240, status: "Cancelled", date: "Oct 5, 14:50", service: "ViettelPost Fast" },
];

/* ══════════════ STATUS CONFIG ══════════════ */
const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  Pending:   { label: "Chờ xử lý",     badge: "bg-amber-100  text-amber-700  border-amber-400",  icon: <Circle size={12}      className="text-amber-500" /> },
  Confirmed: { label: "Đã xác nhận",   badge: "bg-blue-100   text-blue-700   border-blue-400",   icon: <CheckCircle size={12} className="text-blue-500"  /> },
  Shipping:  { label: "Đang giao",    badge: "bg-green-100  text-green-700  border-green-400",  icon: <Truck size={12}       className="text-green-500" /> },
  Delivered: { label: "Đã giao",      badge: "bg-gray-100   text-gray-600   border-gray-400",   icon: <CheckCircle size={12} className="text-gray-500"  /> },
  Cancelled: { label: "Đã hủy",       badge: "bg-red-100    text-red-700    border-red-400",    icon: <X size={12}           className="text-red-500"   /> },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-sm ${cfg.badge}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ══════════════ CREATE ORDER FORM ══════════════ */
function CreateOrderForm({ onClose }: { onClose: () => void }) {
  const [payerType, setPayerType] = useState<"sender" | "recipient">("sender");
  const [productType, setProductType] = useState<"package" | "document">("package");
  const [specialProps, setSpecialProps] = useState({ fragile: false, liquid: false, bulky: false, valuable: false, cooled: false, battery: false });
  const [saveTemplate, setSaveTemplate] = useState(false);

  const toggle = (key: keyof typeof specialProps) =>
    setSpecialProps(p => ({ ...p, [key]: !p[key] }));

  const inputCls = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white transition-colors placeholder:text-gray-400";
  const selectCls = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white transition-colors appearance-none cursor-pointer";
  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <div className="flex items-center gap-2 bg-primary/20 border-2 border-black px-3 py-2 mb-4 font-black text-sm uppercase tracking-wide">
      {icon} {text}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-6xl bg-[#f5f5f5] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-slide-up">

        {/* Modal title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary border-b-2 border-black">
          <div className="flex items-center gap-2 font-black uppercase tracking-wide">
            <Plus size={17} /> Tạo đơn hàng mới
          </div>
          <button onClick={onClose} className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x-0 lg:divide-x-2 divide-black">

          {/* ── LEFT: Sender / Recipient / Service ── */}
          <div className="p-5 flex flex-col gap-6">

            {/* Sender */}
            <section>
              {sectionTitle(<User size={15} />, "Người gửi")}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Tùy chọn nơi gửi *</label>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    {["Theo địa chỉ Kết gửi", "Gửi tại Smart Box", "Gửi tại bưu cục"].map((opt, i) => (
                      <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="sender-type" defaultChecked={i === 0} className="accent-primary w-4 h-4" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <select className={selectCls}>
                    <option>Đỗ Nhật Minh – 19/10, Lô 7A, KP 3, Đường Hưng Thuận, Q.12, TP.HCM – 0912293933</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Thời gian lấy hàng</label>
                  <div className="relative">
                    <select className={selectCls}>
                      <option>Chọn thời gian</option>
                      <option>Hôm nay – Buổi sáng (8:00–12:00)</option>
                      <option>Hôm nay – Buổi chiều (13:00–17:00)</option>
                      <option>Ngày mai – Buổi sáng (8:00–12:00)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <button className="text-xs font-bold text-primary-dark hover:underline self-start flex items-center gap-1">
                  <Plus size={12} /> Quản lý thông tin người gửi
                </button>
              </div>
            </section>

            {/* Recipient */}
            <section>
              {sectionTitle(<MapPin size={15} />, "Người nhận")}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Tùy chọn nơi nhận *</label>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    {["Theo địa chỉ KH nhận", "Smart Box", "Nhận tại bưu cục", "Sử dụng địa danh mới"].map((opt, i) => (
                      <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="recv-type" defaultChecked={i === 0} className="accent-primary w-4 h-4" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Điện thoại</label>
                  <input type="tel" placeholder="Nhập số điện thoại để lấy thông tin người nhận" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block">Họ tên</label>
                    <input type="text" placeholder="Nhập tên người nhận" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block">Email</label>
                    <input type="email" placeholder="email@example.com" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Địa chỉ</label>
                  <input type="text" placeholder="Nhập địa chỉ (Số nhà, tên đường, phường, Quận, Ngõ)" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <select className={selectCls}><option>Tỉnh/Thành phố</option></select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select className={selectCls}><option>Quận/Huyện</option></select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select className={selectCls}><option>Xã/Phường</option></select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select className={selectCls}><option>Đường/Tổ/Xóm</option></select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Thời gian giao</label>
                  <div className="relative">
                    <select className={selectCls}>
                      <option>Cả ngày</option>
                      <option>Buổi sáng (8:00–12:00)</option>
                      <option>Buổi chiều (13:00–17:00)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* Service */}
            <section>
              {sectionTitle(<Truck size={15} />, "Chọn dịch vụ")}
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-black uppercase mb-1 text-text-muted">Dịch vụ chính</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "ViettelPost Fast (2–3 ngày)", price: "$5.00" },
                      { label: "Standard (5–7 ngày)", price: "$2.00" },
                    ].map((svc, i) => (
                      <label key={i} className="flex items-center justify-between border-2 border-black px-3 py-2.5 cursor-pointer hover:bg-primary/10 transition-colors">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <input type="radio" name="service" defaultChecked={i === 0} className="accent-primary w-4 h-4" />
                          {svc.label}
                        </span>
                        <span className="text-sm font-black">{svc.price}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Khuyến mại</label>
                  <div className="relative">
                    <select className={selectCls}><option>Chọn mã khuyến mãi</option></select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── RIGHT: Product info + COD ── */}
          <div className="p-5 flex flex-col gap-6">

            {/* Product info */}
            <section>
              {sectionTitle(<Package size={15} />, "Thông tin hàng hóa")}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Loại hàng hóa</label>
                  <div className="flex gap-6 text-sm font-medium">
                    {(["package", "document"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={productType === t} onChange={() => setProductType(t)} className="accent-primary w-4 h-4" />
                        {t === "package" ? "Đơn kiện" : "Tài liệu"}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Tên hàng *</label>
                  <input type="text" placeholder="Nhập tên hàng hóa (vd: LED Panel 32x32)" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block">SL</label>
                    <input type="number" defaultValue={1} min={1} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block">Trọng lượng</label>
                    <div className="relative">
                      <input type="number" placeholder="0" className={inputCls + " pr-8"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-bold">g</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase mb-1 block">Giá trị</label>
                    <div className="relative">
                      <input type="number" placeholder="0" className={inputCls + " pr-8"} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-bold">đ</span>
                    </div>
                  </div>
                </div>

                <button className="btn-secondary text-xs py-1.5 w-fit flex items-center gap-1.5">
                  <Plus size={13} /> Thêm hàng hóa
                </button>

                <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-3 text-sm font-bold">
                  <span className="text-text-muted">Tổng khối lượng:</span><span>0 g</span>
                  <span className="text-text-muted">Tổng giá trị:</span><span>0 đ</span>
                </div>

                {/* Special properties */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-primary-dark" />
                    <span className="text-xs font-black uppercase">Tính chất hàng hóa đặc biệt</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(specialProps) as (keyof typeof specialProps)[]).map((key) => {
                      const labels: Record<keyof typeof specialProps, string> = {
                        fragile: "Dễ vỡ", liquid: "Chất lỏng", bulky: "Quá khổ", valuable: "Nguyên bộ", cooled: "Giữ lạnh", battery: "Từ điện, Pin"
                      };
                      return (
                        <label key={key} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                          <input type="checkbox" checked={specialProps[key]} onChange={() => toggle(key)} className="accent-primary w-3.5 h-3.5" />
                          {labels[key]}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Kích thước</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Dài (cm)", "Rộng (cm)", "Cao (cm)"].map((ph) => (
                      <input key={ph} type="number" placeholder={ph} className={inputCls} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">Mã đơn hàng (tham chiếu)</label>
                  <input type="text" placeholder="Nhập mã đơn trong hệ thống của bạn" className={inputCls} />
                </div>
              </div>
            </section>

            {/* COD + Payer */}
            <section>
              {sectionTitle(<CreditCard size={15} />, "Thanh toán & Tiền thu hộ")}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-black uppercase mb-2">Tiền thu hộ (COD)</p>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer mb-2">
                    <input type="checkbox" className="accent-primary w-3.5 h-3.5" />
                    Thu hộ bằng tiền hàng
                  </label>
                  <input type="number" defaultValue={0} className={inputCls} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase mb-2">Người trả cước</p>
                  <div className="flex flex-col gap-2">
                    {(["sender", "recipient"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
                        <input type="radio" checked={payerType === t} onChange={() => setPayerType(t)} className="accent-primary w-4 h-4" />
                        {t === "sender" ? "Người gửi" : "Người nhận"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section>
              {sectionTitle(<FileText size={15} />, "Ghi chú")}
              <textarea
                rows={3}
                placeholder="Nhập ghi chú..."
                className="w-full bg-gray-50 border-2 border-black p-3 text-sm outline-none focus:bg-white transition-colors resize-none"
              />
              <label className="flex items-center gap-2 mt-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                Lưu nhóm tin đơn hàng
              </label>
            </section>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t-2 border-black bg-white px-5 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-6 text-sm font-bold flex-1 flex-wrap gap-y-1">
            <div>
              <span className="text-text-muted font-medium">Tổng cước: </span>
              <span className="text-lg font-black">0 đ</span>
            </div>
            <div>
              <span className="text-text-muted font-medium">Tiền thu hộ: </span>
              <span className="text-lg font-black">0 đ</span>
            </div>
            <div>
              <span className="text-text-muted font-medium">Thời gian dự kiến: </span>
              <span>–</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 border-2 border-primary bg-primary/20 text-primary-dark px-3 py-2 text-sm font-bold hover:bg-primary/40 transition-colors">
              <RefreshCw size={14} /> Đổi ngày
            </button>
            <button className="btn-secondary text-sm py-2 flex items-center gap-1.5">
              <Save size={14} /> Lưu nhập
            </button>
            <button className="btn-primary text-sm py-2 flex items-center gap-1.5">
              <CheckCircle size={14} /> Lưu mới
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        .animate-slide-up { animation: slide-up 220ms ease both; }
      `}</style>
    </div>
  );
}

/* ══════════════ ORDERS LIST PAGE ══════════════ */
const STATUSES: (OrderStatus | "All")[] = ["All", "Pending", "Confirmed", "Shipping", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderStatus | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = MOCK_ORDERS.filter((o) => {
    const matchTab = activeTab === "All" || o.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.phone.includes(q);
    return matchTab && matchSearch;
  });

  return (
    <>
      {showCreate && <CreateOrderForm onClose={() => setShowCreate(false)} />}

      <div className="flex flex-col gap-5 max-w-[1280px]">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Quản lý đơn hàng</h1>
            <p className="text-sm text-text-muted font-medium">Quản lý và theo dõi tất cả đơn hàng của khách.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Tạo đơn hàng mới
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["All", "Pending", "Confirmed", "Shipping", "Delivered"] as const).map((s) => {
            const count = s === "All" ? MOCK_ORDERS.length : MOCK_ORDERS.filter(o => o.status === s).length;
            const active = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`neo-box-no-hover p-3 text-left transition-shadow hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${active ? "bg-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" : "bg-white"}`}
              >
                <p className="text-xs font-bold uppercase text-text-muted">{s === "All" ? "Tất cả" : STATUS_CONFIG[s].label}</p>
                <p className="text-2xl font-black">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="neo-box-no-hover bg-white p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-52 flex items-center gap-2 bg-gray-50 border-2 border-black px-3 py-2">
            <Search size={15} className="text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <div className="relative">
            <select className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold appearance-none pr-8 outline-none cursor-pointer">
              <option>Tất cả dịch vụ</option>
              <option>ViettelPost Fast</option>
              <option>Standard</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold appearance-none pr-8 outline-none cursor-pointer">
              <option>7 ngày gần nhất</option>
              <option>30 ngày gần nhất</option>
              <option>Tùy chỉnh</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors">
            <Filter size={14} /> Lọc
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b-2 border-black overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-r-2 border-black transition-colors
                ${activeTab === s ? "bg-primary" : "bg-white hover:bg-gray-50"}`}
            >
              {s === "All" ? "Tất cả" : STATUS_CONFIG[s].label}
              <span className="ml-1.5 text-[10px] bg-black text-white px-1.5 py-0.5 font-black">
                {s === "All" ? MOCK_ORDERS.length : MOCK_ORDERS.filter(o => o.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="neo-box-no-hover bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-black">
                <tr>
                  {["Mã đơn", "Khách hàng", "Hàng hóa", "Dịch vụ", "COD", "Tổng tiền", "Trạng thái", "Ngày tạo", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-text-muted font-semibold">
                      Không tìm thấy đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 font-black text-primary-dark">#{order.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{order.customer}</p>
                        <p className="text-xs text-text-muted">{order.phone}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="font-medium truncate">{order.items}</p>
                        <p className="text-xs text-text-muted truncate">{order.address}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">{order.service}</td>
                      <td className="px-4 py-3 font-bold">
                        {order.cod > 0 ? `$${order.cod}` : <span className="text-text-muted">–</span>}
                      </td>
                      <td className="px-4 py-3 font-black">${order.amount}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{order.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/staff/orders/${order.id}`} className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-primary/20 transition-colors" title="View">
                            <Eye size={13} />
                          </Link>
                          <button className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-blue-50 transition-colors" title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button className="w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-green-50 transition-colors" title="Ship">
                            <Truck size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t-2 border-black flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-text-muted font-medium">
              Hiển thị <span className="font-bold text-black">{filtered.length}</span> / <span className="font-bold text-black">{MOCK_ORDERS.length}</span> đơn hàng
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((p) => (
                <button key={p} className={`w-8 h-8 border-2 border-black text-sm font-bold flex items-center justify-center transition-colors ${p === 1 ? "bg-primary" : "bg-white hover:bg-gray-50"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
