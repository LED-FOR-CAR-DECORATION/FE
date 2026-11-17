"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
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
      const res = await uploadMediaFile(file, "STORE_PRODUCT");
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
      setError("Giá bán phải là số lớn hơn hoặc bằng 0 đ.");
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

    setIsSubmitting(true);
    try {
      const updated = await apiUpdateSubscription(plan.subscriptionDetailId, {
        planName: trimmedName,
        basePrice: parsedPrice,
        description: description.trim() || undefined,
        thumbnailUrl: trimmedThumb || undefined,
        durationDays: parsedDuration,
        allAccessCharacters,
      });
      onSuccess(updated);
    } catch (err) {
      setError(formatSubscriptionApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={`Cập nhật gói hội viên: ${plan.planCode}`}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-subscription-form"
            disabled={isSubmitting || isUploadingThumbnail}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1f432b] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Check size={15} /> Lưu thay đổi
              </>
            )}
          </button>
        </>
      }
    >
      <form id="edit-subscription-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Thông tin cố định */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] p-3 text-xs">
          <span className="font-semibold text-[#1f432b]">Mã gói:</span>
          <span className="rounded bg-[#1f432b] px-2 py-0.5 font-mono font-bold text-white">
            {plan.planCode}
          </span>
          <span className="ml-2 font-semibold text-[#1f432b]">Loại gói:</span>
          {plan.isLifetime ? (
            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 font-bold text-purple-800">
              <InfinityIcon size={12} /> Vĩnh viễn (Lifetime)
            </span>
          ) : (
            <span className="rounded bg-sky-100 px-2 py-0.5 font-bold text-sky-800">
              Có thời hạn (Theo ngày)
            </span>
          )}
          <span className="text-[11px] text-text-muted">(Không thể thay đổi planCode / loại gói)</span>
        </div>

        {/* Tên gói & Giá bán */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Tên gói hội viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Giá bán (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Thời hạn & Quyền lợi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Số ngày hiệu lực {!plan.isLifetime && <span className="text-red-500">*</span>}
            </label>
            {plan.isLifetime ? (
              <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-500">
                Gói vĩnh viễn
              </div>
            ) : (
              <input
                type="number"
                min={1}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
              />
            )}
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#d8e6dc] bg-[#f9fdfa] px-3 py-2">
              <input
                type="checkbox"
                checked={allAccessCharacters}
                onChange={(e) => setAllAccessCharacters(e.target.checked)}
                className="h-4 w-4 accent-[#2d6a4f]"
              />
              <div>
                <p className="flex items-center gap-1 text-xs font-bold text-[#1f432b]">
                  <Sparkles size={13} className="text-[#2d6a4f]" /> Mở khóa toàn bộ Character
                </p>
                <p className="text-[11px] text-text-muted">allAccessCharacters</p>
              </div>
            </label>
          </div>
        </div>

        {/* Mô tả */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">
            Mô tả gói {isLoadingDetail && <span className="text-xs font-normal text-text-muted">(Đang tải...)</span>}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        {/* Thumbnail Upload */}
        <div className="rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#1f432b]">
              <ImageIcon size={14} /> Ảnh đại diện gói (Thumbnail)
            </label>
            <button
              type="button"
              disabled={isUploadingThumbnail}
              onClick={() => thumbnailInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md bg-[#2d6a4f] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#1f432b] disabled:opacity-50"
            >
              {isUploadingThumbnail ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Đang tải...
                </>
              ) : (
                <>
                  <Upload size={12} /> Chọn ảnh từ máy
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
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-[#d8e6dc] bg-white p-2">
              <img
                src={thumbnailPreviewUrl || thumbnailUrl}
                alt="Thumbnail preview"
                className="h-12 w-12 rounded-md border border-[#cbe4d2] object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-xs text-[#1f432b]">{thumbnailUrl}</p>
              <button
                type="button"
                onClick={() => {
                  setThumbnailUrl("");
                  setThumbnailPreviewUrl("");
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
              >
                <X size={14} />
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
            className="mt-2 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
          />
        </div>
      </form>
    </Modal>
  );
}
