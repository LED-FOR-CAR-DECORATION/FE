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
  Circle, Clock, X, ArrowRight, Eye, EyeOff, Lock
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrders } from "@/features/order/context/OrderContext";
import { authService } from "@/features/auth/services/auth.service";

/* ── Shared order data (mock) ── */
type Tab = "account" | "orders";
type PasswordStep = 1 | 2 | 3;

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

function PasswordChangeFlow({ email, isOpen, onClose }: { email: string; isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState<PasswordStep>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!isOpen) return null;

  const closeFlow = () => {
    setStep(1);
    setCurrentPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    onClose();
  };

  const submitCurrentPassword = async () => {
    if (!currentPassword || isSubmitting) {
      setMessage({ text: "Vui lòng nhập mật khẩu hiện tại.", error: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.verifyCurrentPassword(email, currentPassword);
      await authService.sendPasswordOtp(email);
      setStep(2);
      setMessage({ text: `Mã OTP đã được gửi đến ${email}.`, error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Không thể xác minh mật khẩu.", error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = () => {
    if (otp.trim().length !== 6) {
      setMessage({ text: "Vui lòng nhập mã OTP gồm 6 chữ số.", error: true });
      return;
    }
    setMessage(null);
    setStep(3);
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      setMessage({ text: "Mật khẩu mới phải có ít nhất 8 ký tự.", error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Mật khẩu xác nhận không trùng khớp.", error: true });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await authService.resetPassword(email, otp, newPassword);
      setMessage({ text: "Đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới ở lần đăng nhập tiếp theo.", error: false });
      setCurrentPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep(1);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Không thể đổi mật khẩu.", error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = ["1. Xác minh", "2. Mã OTP", "3. Mật khẩu mới"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="password-change-title">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dbe3de] bg-[#f8f7f1] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between border-b border-[#dbe3de] pb-4">
          <div>
            <h3 id="password-change-title" className="text-xl font-black text-[#244638]">Đổi mật khẩu</h3>
            <p className="mt-1 text-sm text-text-muted">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
          </div>
          <button type="button" onClick={closeFlow} className="rounded-lg p-2 text-[#52675c] transition-colors hover:bg-white hover:text-black" aria-label="Đóng cửa sổ đổi mật khẩu">
            <X size={20} />
          </button>
        </div>
        <div className="mt-5">
        <div className="grid grid-cols-3 gap-1" aria-label="Tiến trình đổi mật khẩu">
          {stepLabels.map((label, index) => (
            <div key={label} className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-[#28664f]" : "bg-[#d4ded8]"}`} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 text-xs font-semibold text-text-muted">
          {stepLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dbe3de] bg-white p-5">
        <h4 className="text-lg font-black text-[#294b3d]">
          {step === 1 ? "Mật khẩu hiện tại" : step === 2 ? "Xác minh email" : "Tạo mật khẩu mới"}
        </h4>
        <p className="mt-2 text-sm text-text-muted">
          {step === 1
            ? "Nhập mật khẩu hiện tại để tiếp tục."
            : step === 2
              ? `Nhập mã OTP 6 chữ số đã được gửi đến ${email}.`
              : "Chọn một mật khẩu mới an toàn cho tài khoản của bạn."}
        </p>
        {message && <p role={message.error ? "alert" : "status"} className={`mt-4 border-2 px-3 py-2 text-xs font-semibold ${message.error ? "border-red-500 bg-red-50 text-red-700" : "border-green-600 bg-green-50 text-green-700"}`}>{message.text}</p>}

        {step === 1 && (
          <label className="mt-5 block text-sm font-bold text-[#294b3d]">
            Mật khẩu hiện tại
            <span className="relative mt-2 block">
              <input type={showPassword ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-[#cbd7d0] px-4 py-3 pr-12 text-sm outline-none focus:border-[#28664f] focus:ring-2 focus:ring-[#b8d9c8]" placeholder="Nhập mật khẩu hiện tại" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#708177]" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
        )}
        {step === 2 && (
          <label className="mt-5 block text-sm font-bold text-[#294b3d]">
            Mã OTP
            <input inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-lg border border-[#cbd7d0] px-4 py-3 text-sm tracking-[0.35em] outline-none focus:border-[#28664f] focus:ring-2 focus:ring-[#b8d9c8]" placeholder="000000" />
          </label>
        )}
        {step === 3 && (
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-[#294b3d]">Mật khẩu mới
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#cbd7d0] px-4 py-3 text-sm outline-none focus:border-[#28664f] focus:ring-2 focus:ring-[#b8d9c8]" placeholder="Ít nhất 8 ký tự" />
            </label>
            <label className="block text-sm font-bold text-[#294b3d]">Xác nhận mật khẩu mới
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#cbd7d0] px-4 py-3 text-sm outline-none focus:border-[#28664f] focus:ring-2 focus:ring-[#b8d9c8]" placeholder="Nhập lại mật khẩu mới" />
            </label>
          </div>
        )}

        <button type="button" onClick={step === 1 ? submitCurrentPassword : step === 2 ? verifyOtp : updatePassword} disabled={isSubmitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#28664f] px-4 py-3 font-black text-white transition-colors hover:bg-[#1e513e] disabled:cursor-wait disabled:opacity-60">
          <Lock size={17} />
          {isSubmitting ? "Đang xử lý..." : step === 1 ? "Xác minh và gửi mã OTP" : step === 2 ? "Xác nhận mã OTP" : "Cập nhật mật khẩu"}
        </button>
        {step === 1 && <p className="mt-4 text-center text-xs text-text-muted">Mã xác minh sẽ được gửi đến email đã đăng ký của bạn.</p>}
        {step > 1 && <button type="button" onClick={() => { setStep((step - 1) as PasswordStep); setMessage(null); }} className="mt-3 w-full text-center text-xs font-bold text-[#28664f] hover:underline">Quay lại bước trước</button>}
        </div>
      </div>
    </div>
  );
}

/* ── Account Info Tab ── */
function AccountInfoTab() {
  const [editMode, setEditMode] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const { addresses, isLoading, addAddress, removeAddress, setDefaultAddress } = useAddresses();
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
      {user && <PasswordChangeFlow email={user.email} isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />}

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
