"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus, User, Phone, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import GoongMapAddress from "../common/GoongMapAddress";
import type { AddressFormData } from "@/features/address/types";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (address: AddressFormData) => void;
}

export default function AddAddressModal({
  isOpen,
  onClose,
  onSave,
}: AddAddressModalProps) {
  const [form, setForm] = useState<AddressFormData>({
    fullName: "",
    phoneNumber: "",
    fullAddress: "",
  });
  const [error, setError] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    if (!form.fullName.trim()) {
      setError("Vui lòng nhập họ và tên người nhận.");
      return;
    }
    if (!form.phoneNumber.trim()) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!form.fullAddress?.trim()) {
      setError("Vui lòng tìm kiếm hoặc bấm chọn vị trí trên bản đồ bên phải.");
      return;
    }
    setError(null);
    onSave?.(form);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4 py-6 overflow-y-auto"
    >
      {/* Window */}
      <div className="relative w-full max-w-4xl mx-auto my-auto bg-[#d9d9d9] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-slide-up">

        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#d9d9d9] border-b-2 border-black">
          <div className="flex items-center gap-2">
            {/* Green circle icon */}
            <div className="w-5 h-5 rounded-full bg-primary border-2 border-black flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-black" />
            </div>
            <span className="text-xs font-bold tracking-wide text-black uppercase">Thêm địa chỉ mới</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Minimize button */}
            <button
              onClick={onClose}
              className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Thu nhỏ"
            >
              <Minus size={12} />
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100 transition-colors"
              aria-label="Đóng"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="bg-white px-6 py-6 max-h-[85vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left side: Form */}
          <div className="flex flex-col">
            <h2 className="text-xl font-black mb-6 tracking-tight uppercase">
              Thông tin địa chỉ
            </h2>

            <div className="flex flex-col gap-4">
              
              {/* Full name & Phone */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1" htmlFor="add-addr-fullName">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                      <User size={15} />
                    </span>
                    <input
                      id="add-addr-fullName"
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-gray-50 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors font-medium text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1" htmlFor="add-addr-phone">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">
                      <Phone size={15} />
                    </span>
                    <input
                      id="add-addr-phone"
                      name="phoneNumber"
                      type="tel"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      placeholder="+84 123 456 789"
                      className="w-full bg-gray-50 border-2 border-black py-2 pl-9 pr-3 outline-none focus:bg-white transition-colors font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Address from Map */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
                  <MapPin size={15} className="text-primary" />
                  Địa chỉ nhận hàng (từ bản đồ)
                </label>

                {form.fullAddress ? (
                  <div className="p-3.5 bg-gray-50 border-2 border-black flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-400">
                        <CheckCircle2 size={12} /> Đã chọn từ Goong Map
                      </span>
                      {form.latitude && form.longitude && (
                        <span className="text-[10px] font-mono text-gray-500">
                          {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-black leading-relaxed">
                      {form.fullAddress}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-400 text-center">
                    <MapPin size={22} className="mx-auto text-gray-400 mb-1.5" />
                    <p className="text-xs font-bold text-gray-700">Chưa chọn địa chỉ</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Hãy tìm kiếm địa chỉ hoặc bấm vào vị trí trên bản đồ bên phải để chọn.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border-2 border-red-500 flex items-center gap-2 text-xs font-bold text-red-600">
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              className="mt-6 w-full py-3 bg-primary border-2 border-black font-black uppercase tracking-widest text-black text-sm transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
            >
              Lưu địa chỉ
            </button>
          </div>

          {/* Right side: Map */}
          <div className="flex flex-col">
            <h2 className="text-xl font-black mb-6 tracking-tight uppercase">
              Bản đồ
            </h2>
            <div className="flex-1 min-h-[400px]">
              <GoongMapAddress 
                onLocationSelect={(lng, lat, address) => {
                  setError(null);
                  setForm(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    fullAddress: address
                  }));
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        .animate-fade-in  { animation: fade-in  150ms ease both; }
        .animate-slide-up { animation: slide-up 200ms ease both; }
      `}</style>
    </div>
  );
}
