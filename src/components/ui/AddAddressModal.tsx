"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus, User, Phone, Home, Building2, MapPin, Navigation } from "lucide-react";
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
    streetNumber: "",
    streetName: "",
    ward: "",
    district: "",
    province: "",
  });

  const backdropRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    if (form.fullName.trim().length < 2 || !/^\+?[\d\s()-]{9,18}$/.test(form.phoneNumber.trim()) || (!form.fullAddress?.trim() && (!form.streetName.trim() || !form.province.trim()))) {
      setError("Vui lòng nhập họ tên, số điện thoại hợp lệ và địa chỉ (tên đường, tỉnh/thành).");
      return;
    }
    setError("");
    onSave?.({ ...form, fullName: form.fullName.trim(), phoneNumber: form.phoneNumber.trim() });
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
      <div role="dialog" aria-modal="true" aria-label="Thêm địa chỉ mới" className="relative w-full max-w-4xl mx-auto my-auto bg-[#d9d9d9] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-slide-up">

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
              aria-label="Minimize"
            >
              <Minus size={12} />
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100 transition-colors"
              aria-label="Close"
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

            {error && <p role="alert" className="mb-4 text-sm font-bold text-red-700">{error}</p>}
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

              {/* Address fields */}
              <div className="p-3 bg-gray-50 border-2 border-black">
                <p className="text-xs font-black uppercase mb-3 flex items-center gap-1.5"><MapPin size={14} /> Địa chỉ chi tiết</p>
                
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1" htmlFor="add-addr-st-num">
                        Số nhà
                      </label>
                      <input
                        id="add-addr-st-num"
                        name="streetNumber"
                        type="text"
                        value={form.streetNumber}
                        onChange={handleChange}
                        placeholder="Số 8"
                        className="w-full bg-white border-2 border-black px-2 py-1.5 outline-none font-medium text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1" htmlFor="add-addr-st-name">
                        Tên đường
                      </label>
                      <input
                        id="add-addr-st-name"
                        name="streetName"
                        type="text"
                        value={form.streetName}
                        onChange={handleChange}
                        placeholder="Đường Nguyễn Huệ"
                        className="w-full bg-white border-2 border-black px-2 py-1.5 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-text-muted mb-1" htmlFor="add-addr-ward">
                      Phường/Xã
                    </label>
                    <input
                      id="add-addr-ward"
                      name="ward"
                      type="text"
                      value={form.ward}
                      onChange={handleChange}
                      placeholder="Phường Bến Nghé"
                      className="w-full bg-white border-2 border-black px-2 py-1.5 outline-none font-medium text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1" htmlFor="add-addr-dist">
                        Quận/Huyện
                      </label>
                      <input
                        id="add-addr-dist"
                        name="district"
                        type="text"
                        value={form.district}
                        onChange={handleChange}
                        placeholder="Quận 1"
                        className="w-full bg-white border-2 border-black px-2 py-1.5 outline-none font-medium text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-muted mb-1" htmlFor="add-addr-prov">
                        Tỉnh/Thành
                      </label>
                      <input
                        id="add-addr-prov"
                        name="province"
                        type="text"
                        value={form.province}
                        onChange={handleChange}
                        placeholder="TP. Hồ Chí Minh"
                        className="w-full bg-white border-2 border-black px-2 py-1.5 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Display full address preview */}
              {(form.fullAddress || form.streetNumber || form.streetName || form.ward || form.district || form.province) && (
                <div className="text-xs text-text-muted font-medium bg-primary/10 border-2 border-primary/20 p-2">
                  <span className="font-bold">Preview: </span>
                  {form.fullAddress || [form.streetNumber && form.streetName ? `${form.streetNumber} ${form.streetName}` : form.streetNumber || form.streetName, form.ward, form.district, form.province, "Việt Nam"].filter(Boolean).join(", ")}
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
