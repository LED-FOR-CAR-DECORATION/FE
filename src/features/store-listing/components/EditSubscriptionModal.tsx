"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Crown,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import StoreModal from "./StoreModal";
import { fetchStoreProductDetail } from "@/lib/api/products";
import { uploadMediaFile } from "@/lib/api/media";
import {
  apiUpdateSubscription,
  formatSubscriptionApiError,
  type ManagedSubscriptionPlan,
  type SubscriptionDetailResult,
} from "@/lib/api/subscriptions";

interface EditSubscriptionModalProps {
  plan: ManagedSubscriptionPlan;
  onClose: () => void;
  onSuccess: (updated: SubscriptionDetailResult) => void;
}

export default function EditSubscriptionModal({
  plan,
  onClose,
  onSuccess,
}: EditSubscriptionModalProps) {
  const [planName, setPlanName] = useState(plan.planName);
  const [basePrice, setBasePrice] = useState(String(plan.basePrice ?? 0));
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [durationDays, setDurationDays] = useState(
    plan.durationDays != null ? String(plan.durationDays) : "",
  );
  const [allAccessCharacters, setAllAccessCharacters] = useState(
    Boolean(plan.allAccessCharacters),
  );
  const [maxCommissionRevisions, setMaxCommissionRevisions] = useState(
    String(plan.maxCommissionRevisions ?? 0),
  );
  const [maxMobileProfiles, setMaxMobileProfiles] = useState(
    String(plan.maxMobileProfiles ?? 3),
  );

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingDetail(true);
    fetchStoreProductDetail(plan.productId)
      .then((detail) => {
        if (cancelled || !detail) return;
        setDescription(detail.description ?? "");
        const thumb = detail.previewUrl ?? "";
        setThumbnailUrl(thumb);
        setThumbnailPreviewUrl(thumb);
        if (detail.subscriptionDetails?.maxCommissionRevisions != null && plan.maxCommissionRevisions == null) {
          setMaxCommissionRevisions(String(detail.subscriptionDetails.maxCommissionRevisions));
        }
        if (detail.subscriptionDetails?.maxMobileProfiles != null && plan.maxMobileProfiles == null) {
          setMaxMobileProfiles(String(detail.subscriptionDetails.maxMobileProfiles));
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plan.productId]);

  const handleThumbnailFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumbnail(true);
    setError(null);
    try {
      const res = await uploadMediaFile(file, "PRODUCT_SUBSCRIPTION");
      setThumbnailUrl(res.publicUrl);
      setThumbnailPreviewUrl(res.localPreviewUrl || res.publicUrl);
    } catch (err: any) {
      setError(err?.message || "Không thể tải ảnh thumbnail lên.");
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = planName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên gói hội viên.");
      return;
    }

    const parsedPrice = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Giá bán phải là số lớn hơn hoặc bằng 0 VNĐ.");
      return;
    }

    let parsedDuration: number | null = null;
    if (!plan.isLifetime) {
      const d = Number(durationDays);
      if (!Number.isInteger(d) || d <= 0) {
        setError("Số ngày hiệu lực phải là số nguyên dương > 0.");
        return;
      }
      parsedDuration = d;
    }

    const trimmedThumb = thumbnailUrl.trim();
    if (trimmedThumb) {
      if (trimmedThumb.length > 500 || !/^https?:\/\/\S+$/i.test(trimmedThumb)) {
        setError("Thumbnail URL phải bắt đầu bằng http:// hoặc https:// và tối đa 500 ký tự.");
        return;
      }
    }

    const parsedBonusRevisions =
      maxCommissionRevisions.trim() === "" ? 0 : Number(maxCommissionRevisions);
    if (
      !Number.isInteger(parsedBonusRevisions) ||
      parsedBonusRevisions < 0 ||
      parsedBonusRevisions > 100
    ) {
      setError("Số lượt chỉnh sửa Commission miễn phí mỗi đơn phải là số nguyên từ 0 đến 100.");
      return;
    }

    const parsedMobileProfiles =
      maxMobileProfiles.trim() === "" ? 3 : Number(maxMobileProfiles);
    if (
      !Number.isInteger(parsedMobileProfiles) ||
      parsedMobileProfiles < 3 ||
      parsedMobileProfiles > 100
    ) {
      setError("Số lượng profile Mobile tối đa phải là số nguyên từ 3 đến 100.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await apiUpdateSubscription(plan.subscriptionDetailId, {
        planName: trimmedName,
        basePrice: parsedPrice,
        description: description.trim() || undefined,
        thumbnailUrl: trimmedThumb || undefined,
        durationDays: parsedDuration,
        allAccessCharacters,
        maxCommissionRevisions: parsedBonusRevisions,
        maxMobileProfiles: parsedMobileProfiles,
      });
      onSuccess(updated);
    } catch (err) {
      setError(formatSubscriptionApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      onClose={onClose}
      title={`Cập nhật gói hội viên: ${plan.planCode}`}
      badge="GÓI HỘI VIÊN"
      icon={<Crown size={18} />}
      iconBoxClassName="bg-[#e9d5ff]"
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-subscription-form"
            disabled={isSubmitting || isUploadingThumbnail}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Đang lưu...
              </>
            ) : (
              <>
                <Check size={15} aria-hidden="true" /> Lưu thay đổi
              </>
            )}
          </button>
        </>
      }
    >
      <form id="edit-subscription-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Thông tin cố định */}
        <div className="flex flex-wrap items-center gap-2 border-2 border-black bg-gray-50 p-3 text-xs">
          <span className="font-black uppercase text-black">Mã gói:</span>
          <span className="border border-black bg-black px-2 py-0.5 font-mono text-[11px] font-black text-white">
            {plan.planCode}
          </span>
          <span className="ml-2 font-black uppercase text-black">Loại gói:</span>
          {plan.isLifetime ? (
            <span className="inline-flex items-center gap-1 border border-black bg-[#e9d5ff] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_0_#000]">
              <InfinityIcon size={12} aria-hidden="true" /> Vĩnh viễn (Lifetime)
            </span>
          ) : (
            <span className="border border-black bg-[#bae6fd] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_0_#000]">
              Có thời hạn (Theo ngày)
            </span>
          )}
          <span className="text-[11px] font-medium text-text-muted">(Không thể thay đổi planCode / loại gói)</span>
        </div>

        {/* Tên gói & Giá bán */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Tên gói hội viên <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Giá bán (VNĐ) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min={0}
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-black text-primary-ink tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
        </div>

        {/* Thời hạn & Quyền lợi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Số ngày hiệu lực {!plan.isLifetime && <span className="text-red-600">*</span>}
            </label>
            {plan.isLifetime ? (
              <div className="border-2 border-black bg-gray-100 px-3 py-2 text-xs font-bold text-text-muted">
                Gói vĩnh viễn
              </div>
            ) : (
              <input
                type="number"
                min={1}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
              />
            )}
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex cursor-pointer items-center gap-2.5 border-2 border-black bg-primary/15 px-3 py-2">
              <input
                type="checkbox"
                checked={allAccessCharacters}
                onChange={(e) => setAllAccessCharacters(e.target.checked)}
                className="h-4 w-4 accent-[#1f432b]"
              />
              <div>
                <p className="flex items-center gap-1 text-xs font-black uppercase text-black">
                  <Sparkles size={13} className="text-primary-ink" aria-hidden="true" /> Mở khóa toàn bộ Character
                </p>
                <p className="text-[11px] font-medium text-text-muted">allAccessCharacters</p>
              </div>
            </label>
          </div>
        </div>

        {/* Profile Mobile & Lượt sửa Commission miễn phí mỗi đơn */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Profile chữ trên App Mobile (tối đa)
            </label>
            <input
              type="number"
              min={3}
              max={100}
              step={1}
              value={maxMobileProfiles}
              onChange={(e) => setMaxMobileProfiles(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
            <p className="mt-1 text-[11px] font-medium text-text-muted">
              Mặc định tài khoản thường là 3 profile (nhập 5, 10, 20 để mở rộng).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Lượt sửa miễn phí / mỗi đơn Commission
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={maxCommissionRevisions}
              onChange={(e) => setMaxCommissionRevisions(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
            <p className="mt-1 text-[11px] font-medium text-text-muted">
              Số lượt chỉnh sửa miễn phí áp dụng cho từng đơn Commission khi gói còn hiệu lực (nhập 0 nếu không áp dụng).
            </p>
          </div>
        </div>

        {/* Mô tả */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
            Mô tả gói {isLoadingDetail && <span className="text-xs font-medium normal-case text-text-muted">(Đang tải...)</span>}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
          />
        </div>

        {/* Thumbnail Upload */}
        <div className="border-2 border-black bg-gray-50 p-3.5 shadow-[2px_2px_0_0_#000]">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black">
              <ImageIcon size={14} className="text-primary-ink" aria-hidden="true" /> Ảnh đại diện gói (Thumbnail)
            </label>
            <button
              type="button"
              disabled={isUploadingThumbnail}
              onClick={() => thumbnailInputRef.current?.click()}
              className="btn-secondary inline-flex items-center gap-1 px-2.5! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
            >
              {isUploadingThumbnail ? (
                <>
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Đang tải...
                </>
              ) : (
                <>
                  <Upload size={12} aria-hidden="true" /> Chọn ảnh từ máy
                </>
              )}
            </button>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleThumbnailFileChosen}
            />
          </div>

          {(thumbnailPreviewUrl || thumbnailUrl) && (
            <div className="mt-2.5 flex items-center gap-3 border-2 border-black bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailPreviewUrl || thumbnailUrl}
                alt="Thumbnail preview"
                className="h-12 w-12 shrink-0 border-2 border-black bg-gray-50 object-contain [image-rendering:pixelated]"
              />
              <p className="min-w-0 flex-1 truncate text-xs font-bold text-black">{thumbnailUrl}</p>
              <button
                type="button"
                onClick={() => {
                  setThumbnailUrl("");
                  setThumbnailPreviewUrl("");
                }}
                aria-label="Xóa ảnh đại diện"
                className="btn-secondary p-1! shadow-[1px_1px_0_0_#000]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <input
            type="text"
            value={thumbnailUrl}
            onChange={(e) => {
              setThumbnailUrl(e.target.value);
              setThumbnailPreviewUrl(e.target.value);
            }}
            placeholder="https://cdn.lumintra.shop/..."
            className="mt-2.5 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
          />
        </div>
      </form>
    </StoreModal>
  );
}
