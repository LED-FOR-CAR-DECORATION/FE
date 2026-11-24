"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Crown,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Loader2,
  Rocket,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import CategoryTagSelector from "./CategoryTagSelector";
import { apiUpdateProductStatus, fetchStoreTags } from "@/lib/api/products";
import { uploadMediaFile } from "@/lib/api/media";
import {
  apiCreateSubscription,
  formatSubscriptionApiError,
  type SubscriptionDetailResult,
} from "@/lib/api/subscriptions";
import type { TagItem } from "@/api_client";

interface CreateSubscriptionModalProps {
  onClose: () => void;
  onSuccess: (created: SubscriptionDetailResult) => void;
  onBackToTypeSelect?: () => void;
}

export default function CreateSubscriptionModal({
  onClose,
  onSuccess,
  onBackToTypeSelect,
}: CreateSubscriptionModalProps) {
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [basePrice, setBasePrice] = useState<string>("199000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [galleryUrlsText, setGalleryUrlsText] = useState("");
  const [isLifetime, setIsLifetime] = useState(false);
  const [durationDays, setDurationDays] = useState<string>("30");
  const [allAccessCharacters, setAllAccessCharacters] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingTags(true);
    fetchStoreTags()
      .then((tags) => {
        if (!cancelled) setAvailableTags(tags);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTags(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleTagCreated = (created: TagItem) => {
    setAvailableTags((prev) =>
      prev.some((t) => t.tagId === created.tagId) ? prev : [...prev, created],
    );
    if (created.tagId) {
      setSelectedTagIds((prev) =>
        prev.includes(created.tagId!) ? prev : [...prev, created.tagId!],
      );
    }
  };

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
      setError(err?.message || "Không thể tải ảnh đại diện lên.");
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const handleGalleryFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingGallery(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const res = await uploadMediaFile(file, "PRODUCT_SUBSCRIPTION");
        if (res.publicUrl) uploadedUrls.push(res.publicUrl);
      }
      setGalleryUrlsText((prev) => {
        const existing = prev.trim();
        const joined = uploadedUrls.join("\n");
        return existing ? `${existing}\n${joined}` : joined;
      });
    } catch (err: any) {
      setError(err?.message || "Không thể tải thư viện ảnh lên.");
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleRemoveGalleryUrl = (indexToRemove: number) => {
    const list = galleryUrlsText
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    setGalleryUrlsText(list.filter((_, idx) => idx !== indexToRemove).join("\n"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = planName.trim();
    const trimmedCode = planCode.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên gói hội viên (planName).");
      return;
    }
    if (!trimmedCode) {
      setError("Vui lòng nhập mã gói hội viên (planCode).");
      return;
    }

    const parsedPrice = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Giá bán phải là số lớn hơn hoặc bằng 0 VNĐ.");
      return;
    }

    let parsedDuration: number | null = null;
    if (!isLifetime) {
      const d = Number(durationDays);
      if (!Number.isInteger(d) || d <= 0) {
        setError("Số ngày hiệu lực (durationDays) phải là số nguyên dương > 0 đối với gói có thời hạn.");
        return;
      }
      parsedDuration = d;
    }

    const rawThumb = thumbnailUrl.trim();
    const resolvedThumb =
      rawThumb.startsWith("/") && typeof window !== "undefined"
        ? `${window.location.origin}${rawThumb}`
        : rawThumb;
    if (resolvedThumb) {
      if (resolvedThumb.length > 500 || !/^https?:\/\/\S+$/i.test(resolvedThumb)) {
        setError("Ảnh đại diện phải là đường dẫn http://, https:// hoặc /images/... và tối đa 500 ký tự.");
        return;
      }
    }

    const rawGallery = galleryUrlsText
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    const resolvedGallery: string[] = [];
    for (let i = 0; i < rawGallery.length; i += 1) {
      const candidate =
        rawGallery[i].startsWith("/") && typeof window !== "undefined"
          ? `${window.location.origin}${rawGallery[i]}`
          : rawGallery[i];
      if (candidate.length > 500 || !/^https?:\/\/\S+$/i.test(candidate)) {
        setError(`Ảnh thư viện #${i + 1} phải là đường dẫn http://, https:// hoặc /images/... hợp lệ.`);
        return;
      }
      resolvedGallery.push(candidate);
    }

    setIsSubmitting(true);
    try {
      let created = await apiCreateSubscription({
        planName: trimmedName,
        planCode: trimmedCode,
        basePrice: parsedPrice,
        description: description.trim() || undefined,
        thumbnailUrl: resolvedThumb || undefined,
        galleryUrls: resolvedGallery.length > 0 ? resolvedGallery : undefined,
        isLifetime,
        durationDays: parsedDuration,
        allAccessCharacters,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      if (publishImmediately && created.productId) {
        try {
          await apiUpdateProductStatus(created.productId, "PUBLISHED");
          created = { ...created, status: "PUBLISHED" };
        } catch {
          // Keep UNPUBLISHED if publish call fails
        }
      }
      onSuccess(created);
    } catch (err) {
      setError(formatSubscriptionApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Tạo Gói hội viên & Sản phẩm bày bán"
      description="Tạo đồng thời Gói hội viên và sản phẩm bày bán trên Cửa hàng."
      size="lg"
      footer={
        <>
          {onBackToTypeSelect && (
            <button
              type="button"
              onClick={onBackToTypeSelect}
              disabled={isSubmitting}
              className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3.5 py-2 text-xs font-bold text-[#1f432b] transition hover:bg-[#eef8f0] disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Đổi loại sản phẩm
            </button>
          )}
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
            form="create-subscription-form"
            disabled={isSubmitting || isUploadingThumbnail || isUploadingGallery}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1f432b] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Đang tạo gói...
              </>
            ) : publishImmediately ? (
              <>
                <Rocket size={15} /> Tạo gói &amp; Mở bán ngay
              </>
            ) : (
              <>
                <Crown size={15} /> Tạo gói hội viên
              </>
            )}
          </button>
        </>
      }
    >
      <form id="create-subscription-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-[#d6eadc] bg-[#f4fbf6] p-3 text-xs text-[#1f432b]">
          Gói hội viên mới tạo sẽ có trạng thái mặc định là{" "}
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-bold text-amber-800">
            UNPUBLISHED
          </span>
          . Sau khi kiểm tra thông tin, bạn có thể bấm <strong>Mở bán</strong> trong danh sách.
        </div>

        {/* Tên gói & Mã gói */}
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
              placeholder="Ví dụ: Lumintra Pro 30 Ngày"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Mã gói (Plan Code - Duy nhất) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
              placeholder="Ví dụ: PRO_30_DAYS"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 font-mono text-xs uppercase outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Giá bán & Quyền lợi Character */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {/* Thời hạn gói */}
        <div className="rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-3.5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#1f432b]">
            Thời hạn sử dụng (isLifetime & durationDays)
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsLifetime(false)}
              className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition ${
                !isLifetime
                  ? "border-[#2d6a4f] bg-[#eaf7ee] text-[#1f432b]"
                  : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
              }`}
            >
              <div>
                <p className="text-xs font-bold">Gói có thời hạn (Theo ngày)</p>
                <p className="text-[11px]">Bắt buộc nhập số ngày hiệu lực</p>
              </div>
              {!isLifetime && <Check size={16} className="text-[#2d6a4f]" />}
            </button>

            <button
              type="button"
              onClick={() => setIsLifetime(true)}
              className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition ${
                isLifetime
                  ? "border-[#2d6a4f] bg-[#eaf7ee] text-[#1f432b]"
                  : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
              }`}
            >
              <div>
                <p className="flex items-center gap-1 text-xs font-bold">
                  <InfinityIcon size={14} /> Gói Vĩnh viễn (Lifetime)
                </p>
                <p className="text-[11px]">Không giới hạn ngày </p>
              </div>
              {isLifetime && <Check size={16} className="text-[#2d6a4f]" />}
            </button>
          </div>

          {!isLifetime && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Số ngày hiệu lực <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Ví dụ: 30, 90, 365"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#439660] sm:w-48"
              />
            </div>
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Mô tả quyền lợi gói</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết ưu đãi và quyền lợi của hội viên..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        {/* Hình ảnh sản phẩm (Ảnh đại diện & Thư viện ảnh) */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1f432b]">
                <ImageIcon size={14} /> Ảnh đại diện
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailPreviewUrl || thumbnailUrl}
                  alt="Xem trước ảnh đại diện"
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
              placeholder="Hoặc dán URL https://... hoặc /images/..."
              className="mt-2 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
            />
          </div>

          <div className="rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1f432b]">
                <ImageIcon size={14} /> Thư viện ảnh
              </label>
              <button
                type="button"
                disabled={isUploadingGallery}
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md bg-[#2d6a4f] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#1f432b] disabled:opacity-50"
              >
                {isUploadingGallery ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Đang tải...
                  </>
                ) : (
                  <>
                    <Upload size={12} /> Tải nhiều ảnh
                  </>
                )}
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleGalleryFilesChosen}
              />
            </div>

            {(() => {
              const galleryList = galleryUrlsText
                .split(/[\n,]/)
                .map((u) => u.trim())
                .filter((u) => u.length > 0);
              if (galleryList.length === 0) return null;
              return (
                <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-[#d8e6dc] bg-white p-2">
                  {galleryList.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-12 w-12 overflow-hidden rounded-md border border-[#cbe4d2]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryUrl(idx)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            <textarea
              rows={2}
              value={galleryUrlsText}
              onChange={(e) => setGalleryUrlsText(e.target.value)}
              placeholder="Hoặc dán danh sách URL (mỗi dòng 1 link)"
              className="mt-2 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Tags */}
        <CategoryTagSelector
          availableTags={availableTags}
          selectedTagIds={selectedTagIds}
          isLoading={isLoadingTags}
          label="Thẻ phân loại sản phẩm"
          onToggleTag={toggleTag}
          onTagCreated={handleTagCreated}
        />

        {/* Trạng thái mở bán */}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#d2e4d7] bg-[#f7fbf8] p-3 text-xs text-[#2e573c]">
          <div>
            <span className="block font-bold text-[#1f432b]">
              Mở bán ngay sau khi tạo
            </span>
            <span className="text-text-muted">
              Mặc định gói hội viên tạo mới ở trạng thái <strong>Chưa mở bán</strong> để kiểm tra trước khi đăng lên Cửa hàng.
            </span>
          </div>
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
            className="h-4 w-4 accent-[#439660]"
          />
        </label>
      </form>
    </Modal>
  );
}
