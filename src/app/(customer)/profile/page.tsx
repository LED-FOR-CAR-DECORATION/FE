"use client";

import React, { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AddAddressModal from "@/components/ui/AddAddressModal";
import { useAddresses } from "@/features/address/context/AddressContext";
import Link from "next/link";
import {
  User, MapPin, Package, ChevronRight, Edit2, Plus,
  Trash2, Phone, Mail, Calendar, CheckCircle, Truck,
  Circle, Clock, X, ArrowRight, Eye
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";

/* ── Shared order data (mock) ── */
type Tab = "account" | "orders";

const STATUS_CFG: Record<string, { badge: string; icon: React.ReactNode }> = {
  Pending:   { badge: "bg-amber-100 text-amber-700 border-amber-400",  icon: <Circle size={12} /> },
  Confirmed: { badge: "bg-blue-100  text-blue-700  border-blue-400",   icon: <CheckCircle size={12} /> },
  Shipping:  { badge: "bg-green-100 text-green-700 border-green-400",  icon: <Truck size={12} /> },
  Delivered: { badge: "bg-gray-100  text-gray-600  border-gray-400",   icon: <CheckCircle size={12} /> },
  Cancelled: { badge: "bg-red-100   text-red-700   border-red-400",    icon: <X size={12} /> },
};

const STATUS_LABEL: Record<string, string> = { Pending: "Chờ xử lý", Confirmed: "Đã xác nhận", Shipping: "Đang giao", Delivered: "Đã giao", Cancelled: "Đã hủy" };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Pending;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-bold rounded-sm ${cfg.badge}`}>
      {cfg.icon} {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ── Account Info Tab ── */
function AccountInfoTab() {
  const [editMode, setEditMode] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const { addresses, isLoading, addAddress, removeAddress, setDefaultAddress } = useAddresses();
  const inputCls = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-4">
      <AddAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSave={(address) => { addAddress(address); setIsAddressModalOpen(false); }} />
      {/* Personal Info */}
      <div className="profile-card profile-enter profile-enter-delay-1">
        <div className="flex items-center justify-between mb-5 border-b border-primary-light pb-3">
          <div className="flex items-center gap-2">
            <span className="profile-section-icon"><User size={18} /></span>
            <div>
              <h3 className="font-black text-lg uppercase tracking-wide">Thông tin cá nhân</h3>
              <p className="text-xs text-text-muted">Quản lý thông tin tài khoản của bạn.</p>
            </div>
          </div>
          <button
            onClick={() => setEditMode(v => !v)}
            className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 px-3"
          >
            <Edit2 size={13} /> {editMode ? "Hủy" : "Chỉnh sửa"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Tên", id: "fn", value: "John", icon: <User size={14} /> },
            { label: "Họ", id: "ln", value: "Doe", icon: <User size={14} /> },
            { label: "Email", id: "em", value: "john@example.com", icon: <Mail size={14} /> },
            { label: "Điện thoại", id: "ph", value: "(+84) 123 456 789", icon: <Phone size={14} /> },
            { label: "Ngày sinh", id: "dob", value: "01/01/1995", icon: <Calendar size={14} /> },
          ].map(({ label, id, value, icon }) => (
            <div key={id}>
              <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold mb-1 text-text-muted">
                {icon} {label}
              </label>
              <input
                id={id}
                type="text"
                defaultValue={value}
                disabled={!editMode}
                className={inputCls}
              />
            </div>
          ))}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1 text-text-muted">
              <Edit2 size={14} /> Mật khẩu
            </label>
            <input type="password" defaultValue="••••••••" disabled={!editMode} className={inputCls} />
          </div>
        </div>

        {editMode && (
          <div className="flex gap-2 mt-5">
            <button onClick={() => setEditMode(false)} className="btn-secondary text-sm py-2 px-5">Hủy</button>
            <button onClick={() => setEditMode(false)} className="btn-primary text-sm py-2 px-5">Lưu thay đổi</button>
          </div>
        )}
      </div>

      {/* Shipping Addresses */}
      <div className="profile-card profile-enter profile-enter-delay-2">
        <div className="flex items-center justify-between mb-5 border-b border-primary-light pb-3">
          <div className="flex items-center gap-2">
            <span className="profile-section-icon"><MapPin size={18} /></span>
            <div>
              <h3 className="font-black text-lg uppercase tracking-wide">Địa chỉ giao hàng</h3>
              <p className="text-xs text-text-muted">Quản lý địa chỉ giao hàng của bạn.</p>
            </div>
          </div>
          <button onClick={() => setIsAddressModalOpen(true)} className="flex items-center gap-1.5 btn-primary text-xs py-1.5 px-3">
            <Plus size={13} /> Thêm địa chỉ
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? <p className="text-sm text-text-muted">Đang tải địa chỉ...</p> : addresses.length === 0 ? <p className="text-sm text-text-muted">Bạn chưa có địa chỉ nào.</p> : addresses.map((addr) => (
            <div key={addr.id} className={`address-card ${addr.isDefault ? "address-card-default" : ""}`}>
              {addr.isDefault && (
                <span className="absolute top-2 right-2 bg-primary border border-black text-[10px] font-black px-2 py-0.5 uppercase">Mặc định</span>
              )}
              <div className="flex items-start gap-3">
                <span className="address-icon"><MapPin size={16} /></span>
                <div>
                  <p className="font-black">{addr.fullName}</p>
              <p className="text-sm text-text-muted">{addr.phoneNumber}</p>
              <p className="text-sm mt-1">{addr.fullAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <>
                    <button onClick={() => removeAddress(addr.id)} className="text-xs font-bold text-text-muted hover:underline flex items-center gap-1"><Trash2 size={11} /> Xóa</button>
                    {!addr.isDefault && (
                    <button onClick={() => setDefaultAddress(addr.id)} className="text-xs font-bold hover:underline">Đặt làm mặc định</button>
                    )}
                </>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Order History Tab ── */
function OrderHistoryTab() {
  const { user } = useAuth();
  const { orders } = useOrders();
  const customerOrders = orders.filter((order) => order.customer.userId === user?.userId);
  return (
    <div className="profile-card profile-enter profile-enter-delay-1">
      <div className="flex items-center gap-2 p-5 border-b-2 border-black">
        <Package size={18} />
        <h3 className="font-black text-lg uppercase tracking-wide">Lịch sử đơn hàng</h3>
      </div>

      <div className="divide-y-2 divide-black">
        {customerOrders.length === 0 ? <p className="p-8 text-center text-sm text-text-muted">Bạn chưa có đơn hàng nào.</p> : customerOrders.map((order) => (
          <div key={order.id} className="p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="font-black text-primary-dark">#{order.id}</p>
                <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {new Date(order.createdAt).toLocaleDateString("vi-VN")} · {order.service}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="flex flex-col gap-1 mb-3">
              {order.items.map((item, i) => (
                <p key={i} className="text-sm font-medium">
                  {item.name} <span className="text-text-muted">× {item.quantity}</span> — <span className="font-bold">${item.price}</span>
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Tổng cộng: <span className="text-primary-dark">${order.total}</span></p>
              <Link
                href={`/profile/orders/${order.id}`}
                className="flex items-center gap-1.5 text-xs font-bold border-2 border-black px-3 py-1.5 hover:bg-primary/20 transition-colors"
              >
                <Eye size={13} /> Xem chi tiết
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Profile Page ── */
export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("account");

  return (
    <>
      <Header />
      <main className="profile-page flex-1 bg-background py-7 md:py-10">
        <div className="profile-pixels profile-pixels-left" aria-hidden="true" />
        <div className="profile-pixels profile-pixels-right" aria-hidden="true" />
        <div className="container relative z-10 mx-auto px-4 max-w-3xl">

          {/* Header */}
          <div className="profile-enter flex items-center gap-4 mb-5">
            <div className="profile-avatar">
              <span className="profile-avatar-face">J</span>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">John Doe</h1>
              <p className="text-text-muted text-sm">john@example.com</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="profile-tabs profile-enter profile-enter-delay-1 mb-4">
            {(["account", "orders"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`profile-tab ${tab === t ? "profile-tab-active" : ""}`}
              >
                {t === "account" ? <><User size={16} /> Thông tin tài khoản</> : <><Package size={16} /> Lịch sử đơn hàng</>}
              </button>
            ))}
          </div>

          {tab === "account" ? <AccountInfoTab /> : <OrderHistoryTab />}
        </div>
      </main>
      <Footer />
    </>
  );
}
