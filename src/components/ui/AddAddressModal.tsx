"use client";

import { useState, type FocusEvent } from "react";
import { AlertCircle, CheckCircle2, Home, MapPin, Phone, User } from "lucide-react";
import GoongMapAddress from "../common/GoongMapAddress";
import NeoDialog from "./NeoDialog";
import type { AddressFormData } from "@/features/address/types";
import {
  FULL_ADDRESS_MAX,
  composeFullAddress,
  normalizeVnMobile,
  validateHouseDetail,
  validateRecipientName,
  validateVnMobile,
} from "@/lib/validation/contact";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Must reject with a user-facing message on failure; the modal stays open and keeps the input. */
  onSave: (address: AddressFormData) => Promise<void>;
}

type FieldKey = "fullName" | "phoneNumber" | "houseDetail" | "location";

interface DraftState {
  fullName: string;
  phoneNumber: string;
  houseDetail: string;
  mapAddress: string;
  latitude?: number;
  longitude?: number;
}

const EMPTY_DRAFT: DraftState = { fullName: "", phoneNumber: "", houseDetail: "", mapAddress: "" };
const FIELD_ORDER: FieldKey[] = ["fullName", "phoneNumber", "houseDetail", "location"];
const FIELD_ID: Record<FieldKey, string> = {
  fullName: "add-addr-fullName",
  phoneNumber: "add-addr-phone",
  houseDetail: "add-addr-house",
  location: "add-addr-location",
};

function validate(draft: DraftState): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const name = validateRecipientName(draft.fullName);
  const phone = validateVnMobile(draft.phoneNumber);
  const house = validateHouseDetail(draft.houseDetail);
  if (name) errors.fullName = name;
  if (phone) errors.phoneNumber = phone;
  if (house) errors.houseDetail = house;
  if (!draft.mapAddress || draft.latitude == null || draft.longitude == null) {
    errors.location = "Hãy tìm hoặc bấm chọn vị trí trên bản đồ.";
  } else if (!house && composeFullAddress(draft.houseDetail, draft.mapAddress).length > FULL_ADDRESS_MAX) {
    errors.houseDetail = "Địa chỉ quá dài, hãy rút gọn phần số nhà.";
  }
  return errors;
}

export default function AddAddressModal({ isOpen, onClose, onSave }: AddAddressModalProps) {
  // The draft survives closing the modal so an accidental close loses nothing; it resets after a successful save.
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const errors = validate(draft);
  const visibleError = (key: FieldKey) => (touched[key] ? errors[key] : undefined);
  const isDirty = Boolean(draft.fullName || draft.phoneNumber || draft.houseDetail || draft.mapAddress);

  const update = (key: "fullName" | "phoneNumber" | "houseDetail", value: string) => {
    setSubmitError("");
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const markTouched = (event: FocusEvent<HTMLInputElement>) => {
    const key = event.target.dataset.field as FieldKey | undefined;
    if (key) setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSave = async () => {
    setTouched({ fullName: true, phoneNumber: true, houseDetail: true, location: true });
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      document.getElementById(FIELD_ID[firstInvalid])?.focus();
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        fullName: draft.fullName.trim().replace(/\s+/g, " "),
        phoneNumber: normalizeVnMobile(draft.phoneNumber) ?? draft.phoneNumber,
        fullAddress: composeFullAddress(draft.houseDetail, draft.mapAddress),
        latitude: draft.latitude,
        longitude: draft.longitude,
      });
      setDraft(EMPTY_DRAFT);
      setTouched({});
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : "Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (key: FieldKey) =>
    `w-full border-2 bg-gray-50 py-2 pl-9 pr-3 text-sm font-medium transition-colors focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
      visibleError(key) ? "border-red-600" : "border-black"
    }`;

  const describedBy = (key: FieldKey, hasHint: boolean) =>
    [hasHint ? `${FIELD_ID[key]}-hint` : "", visibleError(key) ? `${FIELD_ID[key]}-err` : ""].filter(Boolean).join(" ") ||
    undefined;

  const renderError = (key: FieldKey) =>
    visibleError(key) ? (
      <p id={`${FIELD_ID[key]}-err`} className="mt-1 text-xs font-bold text-red-600">
        {visibleError(key)}
      </p>
    ) : null;

  return (
    <NeoDialog
      title="Thêm địa chỉ giao hàng"
      description="Người nhận, số điện thoại và vị trí giao hàng."
      onClose={onClose}
      busy={saving}
      size="xl"
      dismissOnBackdrop={!isDirty}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
            Để sau
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            aria-busy={saving}
            className="btn-primary min-w-40"
          >
            {saving ? "Đang lưu..." : "Lưu địa chỉ"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase" htmlFor={FIELD_ID.fullName}>
              Họ và tên người nhận <span aria-hidden className="text-red-600">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-ink" aria-hidden />
              <input
                id={FIELD_ID.fullName}
                data-field="fullName"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={draft.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                onBlur={markTouched}
                placeholder="Nguyễn Văn A"
                aria-invalid={Boolean(visibleError("fullName"))}
                aria-describedby={describedBy("fullName", false)}
                className={inputClass("fullName")}
              />
            </div>
            {renderError("fullName")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase" htmlFor={FIELD_ID.phoneNumber}>
              Số điện thoại <span aria-hidden className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-ink" aria-hidden />
              <input
                id={FIELD_ID.phoneNumber}
                data-field="phoneNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                value={draft.phoneNumber}
                onChange={(e) => update("phoneNumber", e.target.value)}
                onBlur={markTouched}
                placeholder="0912 345 678"
                aria-invalid={Boolean(visibleError("phoneNumber"))}
                aria-describedby={describedBy("phoneNumber", true)}
                className={inputClass("phoneNumber")}
              />
            </div>
            <p id={`${FIELD_ID.phoneNumber}-hint`} className="mt-1 text-xs text-text-muted">
              Số di động Việt Nam. Có thể nhập +84, dấu cách hoặc gạch ngang.
            </p>
            {renderError("phoneNumber")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase" htmlFor={FIELD_ID.houseDetail}>
              Số nhà, hẻm, tòa nhà <span aria-hidden className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Home size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-ink" aria-hidden />
              <input
                id={FIELD_ID.houseDetail}
                data-field="houseDetail"
                type="text"
                autoComplete="address-line1"
                maxLength={100}
                value={draft.houseDetail}
                onChange={(e) => update("houseDetail", e.target.value)}
                onBlur={markTouched}
                placeholder="12/3 Hẻm 45, Tòa B"
                aria-invalid={Boolean(visibleError("houseDetail"))}
                aria-describedby={describedBy("houseDetail", true)}
                className={inputClass("houseDetail")}
              />
            </div>
            <p id={`${FIELD_ID.houseDetail}-hint`} className="mt-1 text-xs text-text-muted">
              Giúp shipper tìm đúng cửa. Phường, quận lấy từ bản đồ.
            </p>
            {renderError("houseDetail")}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase">
              <MapPin size={15} className="text-primary-ink" aria-hidden />
              Vị trí trên bản đồ <span aria-hidden className="text-red-600">*</span>
            </p>
            <div
              id={FIELD_ID.location}
              tabIndex={-1}
              className={`border-2 p-3.5 ${
                draft.mapAddress
                  ? "border-black bg-primary/10"
                  : visibleError("location")
                    ? "border-dashed border-red-600 bg-red-50"
                    : "border-dashed border-black bg-gray-50"
              }`}
            >
              {draft.mapAddress ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-primary-ink">
                    <CheckCircle2 size={12} aria-hidden /> Đã chọn vị trí
                  </span>
                  <p className="mt-1 text-sm font-semibold leading-relaxed">
                    {composeFullAddress(draft.houseDetail, draft.mapAddress)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-muted">Tìm địa chỉ hoặc bấm vào bản đồ để chọn vị trí giao hàng.</p>
              )}
            </div>
            {renderError("location")}
          </div>

          {submitError && (
            <div role="alert" className="flex items-start gap-2 border-2 border-red-600 bg-red-50 p-3 text-xs font-bold text-red-700">
              <AlertCircle size={15} className="mt-px shrink-0" aria-hidden />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        <div className="min-h-[360px]">
          <GoongMapAddress
            onLocationSelect={(lng, lat, address) => {
              setSubmitError("");
              setTouched((prev) => ({ ...prev, location: true }));
              setDraft((prev) => ({ ...prev, latitude: lat, longitude: lng, mapAddress: address }));
            }}
          />
        </div>
      </div>
    </NeoDialog>
  );
}
