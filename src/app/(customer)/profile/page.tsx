"use client";

import React, { useState } from "react";
import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";
import AddAddressModal from "@/components/ui/AddAddressModal";
import UndoToast from "@/components/ui/UndoToast";
import { useUndoableDelete } from "@/lib/hooks/useUndoableDelete";
import { formatVnMobile } from "@/lib/validation/contact";
import { useAddresses } from "@/features/address/context/AddressContext";
import Link from "next/link";
import {
  User, MapPin, Package, ChevronRight, Edit2, Plus,
  Trash2, Phone, Mail, Calendar, CheckCircle, Truck,
  Circle, Clock, X, ArrowRight, Eye, Lock
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import ChangePasswordModal from "@/features/auth/components/ChangePasswordModal";

/* ── Shared order data (mock) ── */
type Tab = "account" | "orders";

const STATUS_CFG: Record<string, { badge: string; icon: React.ReactNode }> = {
  Pending:   { badge: "bg-amber-100 text-amber-700 border-amber-400",  icon: <Circle size={12} /> },
  Confirmed: { badge: "bg-blue-100  text-blue-700  border-blue-400",   icon: <CheckCircle size={12} /> },
  Shipping:  { badge: "bg-green-100 text-green-700 border-green-400",  icon: <Truck size={12} /> },
  Delivered: { badge: "bg-gray-100  text-gray-600  border-gray-400",   icon: <CheckCircle size={12} /> },
  Cancelled: { badge: "bg-red-100   text-red-700   border-red-400",    icon: <X size={12} /> },
};

const STATUS_LABEL: Record<string, string> = { Pending: "Đã tạo đơn", Confirmed: "Đã nhận hàng", Shipping: "Đang giao", Delivered: "Đã giao hàng", Cancelled: "Đã hủy" };
import { formatPrice } from "@/lib/currency";

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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const { addresses, isLoading, addAddress, removeAddress, setDefaultAddress } = useAddresses();
  const [addressError, setAddressError] = useState("");
  const addressUndo = useUndoableDelete({ onCommit: removeAddress });
  const visibleAddresses = addresses.filter((entry) => !addressUndo.isPending(entry.id));
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    dateOfBirth: user?.dateOfBirth ?? "",
  });
  const inputCls = "w-full bg-gray-50 border-2 border-black py-2 px-3 text-sm outline-none focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const saveProfile = () => {
    if (!form.fullName.trim()) {
      setProfileMessage({ text: "Họ tên hiển thị không được để trống.", error: true });
      return;
    }
    updateProfile({ ...form, fullName: form.fullName.trim() });
    setEditMode(false);
    setProfileMessage({ text: "Đã cập nhật thông tin cá nhân.", error: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <AddAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSave={addAddress} />
      <UndoToast
        message={addressUndo.pending ? `Đã xóa địa chỉ của ${addressUndo.pending.label}` : null}
        onUndo={addressUndo.undo}
      />
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

        {profileMessage && <p role={profileMessage.error ? "alert" : "status"} className={`mb-4 border-2 px-3 py-2 text-xs font-semibold ${profileMessage.error ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}>{profileMessage.text}</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="profile-full-name" className="mb-1 flex items-center gap-1.5 text-xs font-bold text-text-muted"><User size={14} /> Họ tên hiển thị</label>
            <input id="profile-full-name" type="text" value={form.fullName} onChange={update("fullName")} disabled={!editMode} className={inputCls} />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-1 flex items-center gap-1.5 text-xs font-bold text-text-muted"><Mail size={14} /> Email</label>
            <input id="profile-email" type="email" value={user?.email ?? ""} disabled className={inputCls} />
            <p className="mt-1 text-[11px] text-text-muted">Email không thể thay đổi.</p>
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-1 flex items-center gap-1.5 text-xs font-bold text-text-muted"><Phone size={14} /> Số điện thoại</label>
            <input id="profile-phone" type="tel" value={form.phoneNumber} onChange={update("phoneNumber")} disabled={!editMode} placeholder="Nhập số điện thoại" className={inputCls} />
          </div>
          <div>
            <label htmlFor="profile-date-of-birth" className="mb-1 flex items-center gap-1.5 text-xs font-bold text-text-muted"><Calendar size={14} /> Ngày sinh</label>
            <input id="profile-date-of-birth" type="date" value={form.dateOfBirth} onChange={update("dateOfBirth")} disabled={!editMode} className={inputCls} />
          </div>
        </div>

        {editMode && (
          <div className="flex gap-2 mt-5">
            <button onClick={() => { setForm({ fullName: user?.fullName ?? "", phoneNumber: user?.phoneNumber ?? "", dateOfBirth: user?.dateOfBirth ?? "" }); setEditMode(false); }} className="btn-secondary text-sm py-2 px-5">Hủy</button>
            <button onClick={saveProfile} className="btn-primary text-sm py-2 px-5">Lưu thay đổi</button>
          </div>
        )}
      </div>

      <div className="profile-card profile-enter profile-enter-delay-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="profile-section-icon"><Lock size={18} /></span>
          <div>
            <h3 className="font-black text-lg uppercase tracking-wide">Mật khẩu</h3>
            <p className="text-xs text-text-muted">Đổi mật khẩu để bảo vệ tài khoản của bạn.</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="btn-secondary flex-shrink-0 px-4 py-2 text-sm">
          Đổi mật khẩu
        </button>
      </div>
      {user && isPasswordModalOpen && <ChangePasswordModal email={user.email} onClose={() => setIsPasswordModalOpen(false)} />}

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
          {(addressError || addressUndo.error) && (
            <p role="alert" className="border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
              {addressError || addressUndo.error}
            </p>
          )}
          {isLoading ? <p className="text-sm text-text-muted">Đang tải địa chỉ...</p> : visibleAddresses.length === 0 ? <p className="text-sm text-text-muted">Bạn chưa có địa chỉ nào.</p> : visibleAddresses.map((addr) => (
            <div key={addr.id} className={`address-card ${addr.isDefault ? "address-card-default" : ""}`}>
              {addr.isDefault && (
                <span className="absolute top-2 right-2 bg-primary border border-black text-[10px] font-black px-2 py-0.5 uppercase">Mặc định</span>
              )}
              <div className="flex items-start gap-3">
                <span className="address-icon"><MapPin size={16} /></span>
                <div>
                  <p className="font-black">{addr.fullName}</p>
              <p className="text-sm text-text-muted">{formatVnMobile(addr.phoneNumber)}</p>
              <p className="text-sm mt-1">{addr.fullAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <>
                    <button onClick={() => { setAddressError(""); addressUndo.schedule(addr.id, addr.fullName); }} className="text-xs font-bold text-text-muted hover:underline flex items-center gap-1"><Trash2 size={11} /> Xóa</button>
                    {!addr.isDefault && (
                    <button onClick={() => { setAddressError(""); setDefaultAddress(addr.id).catch((err: unknown) => setAddressError(err instanceof Error ? err.message : "Không thể đặt địa chỉ mặc định.")); }} className="text-xs font-bold hover:underline">Đặt làm mặc định</button>
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
  const { orders } = useOrders();
  const customerOrders = orders;
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
                  {item.name} <span className="text-text-muted">× {item.quantity}</span> — <span className="font-bold">{formatPrice(item.price)}</span>
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Tổng cộng: <span className="text-primary-dark">{formatPrice(order.total)}</span></p>
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
  const { user } = useAuth();
  const displayName = user?.fullName ?? "Người dùng";

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />
          <div className="min-w-0 flex-1 space-y-5">
            <div className="rounded-xs bg-white px-6 py-4 shadow-xs">
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                Hồ sơ của tôi — {displayName}
              </h1>
              <p className="mt-0.5 text-xs text-text-muted">
                Quản lý thông tin hồ sơ, mật khẩu và địa chỉ nhận hàng ({user?.email ?? ""})
              </p>
            </div>
            <AccountInfoTab />
          </div>
        </div>
      </main>
    </>
  );
}
