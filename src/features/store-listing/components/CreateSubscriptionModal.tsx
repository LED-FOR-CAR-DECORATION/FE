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
import StoreModal from "./StoreModal";
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
  const [isLifetime, setIsLifetime] = useState(true);
  const [durationDays, setDurationDays] = useState<string>("30");
  const [planBenefitMode, setPlanBenefitMode] = useState<"ALL_CHARACTERS" | "COMMISSION_REVISIONS">("ALL_CHARACTERS");
  const [allAccessCharacters, setAllAccessCharacters] = useState(true);
  const [maxCommissionRevisions, setMaxCommissionRevisions] = useState<string>("0");
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

    const parsedBonusRevisions =
      maxCommissionRevisions.trim() === "" ? 0 : Number(maxCommissionRevisions);
    if (
      !Number.isInteger(parsedBonusRevisions) ||
      parsedBonusRevisions < 0 ||
      parsedBonusRevisions > 100
    ) {
      setError("Số lượt chỉnh sửa Commission cộng thêm phải là số nguyên từ 0 đến 100.");
      return;
    }

    if (!allAccessCharacters && parsedBonusRevisions <= 0) {
      setError("Gói hội viên cần bật Mở khóa toàn bộ Character hoặc cộng ít nhất +1 lượt chỉnh sửa Commission miễn phí.");
      return;
    }

    const effectiveIsLifetime =
      planBenefitMode === "COMMISSION_REVISIONS" && !allAccessCharacters ? true : isLifetime;

    let parsedDuration: number | null = null;
    if (!effectiveIsLifetime) {
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
        isLifetime: effectiveIsLifetime,
        durationDays: parsedDuration,
        allAccessCharacters,
        maxCommissionRevisions: parsedBonusRevisions,
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
    <StoreModal
      onClose={onClose}
      title="Tạo Gói hội viên & Sản phẩm bày bán"
      badge="TẠO GÓI HỘI VIÊN"
      description="Tạo đồng thời Gói hội viên và sản phẩm bày bán trên Cửa hàng."
      icon={<Crown size={18} />}
      iconBoxClassName="bg-[#e9d5ff]"
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          {onBackToTypeSelect && (
            <button
              type="button"
              onClick={onBackToTypeSelect}
              disabled={isSubmitting}
              className="btn-secondary mr-auto inline-flex items-center gap-1.5 px-3.5! py-2! text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Đổi loại sản phẩm
            </button>
          )}
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
            form="create-subscription-form"
            disabled={isSubmitting || isUploadingThumbnail || isUploadingGallery}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Đang tạo gói...
              </>
            ) : publishImmediately ? (
              <>
                <Rocket size={15} aria-hidden="true" /> Tạo gói &amp; Mở bán ngay
              </>
            ) : (
              <>
                <Crown size={15} aria-hidden="true" /> Tạo gói hội viên
              </>
            )}
          </button>
        </>
      }
    >
      <form id="create-subscription-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="border-2 border-black bg-primary/15 p-3 text-xs font-medium text-black">
          Gói hội viên mới tạo sẽ có trạng thái mặc định là{" "}
          <span className="border border-black bg-[#fef08a] px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
            UNPUBLISHED
          </span>
          . Sau khi kiểm tra thông tin, bạn có thể bấm <strong className="font-black">Mở bán</strong> trong danh sách.
        </div>

        {/* Chọn loại gói hội viên */}
        <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
          <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-black">
            Loại quyền lợi gói hội viên
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={planBenefitMode === "ALL_CHARACTERS"}
              onClick={() => {
                setPlanBenefitMode("ALL_CHARACTERS");
                setAllAccessCharacters(true);
                setMaxCommissionRevisions("0");
              }}
              className={`flex cursor-pointer items-start justify-between border-2 border-black p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                planBenefitMode === "ALL_CHARACTERS"
                  ? "bg-primary/30 text-black shadow-[2px_2px_0_0_#000]"
                  : "bg-gray-50 text-black hover:bg-primary/15"
              }`}
            >
              <div>
                <p className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <Sparkles size={13} className="text-primary-ink" aria-hidden="true" /> Mở khóa toàn bộ Character
                </p>
                <p className="mt-1 text-[11px] font-medium text-text-muted">
                  Cho phép khách sử dụng mọi nhân vật trên cửa hàng (Vĩnh viễn hoặc theo ngày)
                </p>
              </div>
              {planBenefitMode === "ALL_CHARACTERS" && (
                <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              aria-pressed={planBenefitMode === "COMMISSION_REVISIONS"}
              onClick={() => {
                setPlanBenefitMode("COMMISSION_REVISIONS");
                setAllAccessCharacters(false);
                setIsLifetime(true);
                if (!Number(maxCommissionRevisions) || Number(maxCommissionRevisions) <= 0) {
                  setMaxCommissionRevisions("5");
                }
                if (basePrice === "199000" || !basePrice) {
                  setBasePrice("99000");
                }
              }}
              className={`flex cursor-pointer items-start justify-between border-2 border-black p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                planBenefitMode === "COMMISSION_REVISIONS"
                  ? "bg-primary/30 text-black shadow-[2px_2px_0_0_#000]"
                  : "bg-gray-50 text-black hover:bg-primary/15"
              }`}
            >
              <div>
                <p className="flex items-center gap-1.5 text-xs font-black uppercase">
                  <InfinityIcon size={14} className="text-primary-ink" aria-hidden="true" /> Cộng lượt sửa Commission miễn phí
                </p>
                <p className="mt-1 text-[11px] font-medium text-text-muted">
                  Cộng tổng +N lượt sửa miễn phí vào ví, dùng tùy chọn cho mọi đơn Commission · Vĩnh viễn
                </p>
              </div>
              {planBenefitMode === "COMMISSION_REVISIONS" && (
                <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
              )}
            </button>
          </div>

          {planBenefitMode === "COMMISSION_REVISIONS" && (
            <div className="mt-3 space-y-2.5 border-t-2 border-dashed border-gray-200 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase text-black">Cấu hình nhanh:</span>
                {[
                  {
                    revisions: 5,
                    price: 99000,
                    code: "COMMISSION_REV_5",
                    name: "Gói +5 Lượt Sửa Commission (Vĩnh viễn)",
                    desc: "Cộng tổng +5 lượt chỉnh sửa Commission miễn phí dùng chung cho mọi đơn thiết kế, không giới hạn thời gian.",
                  },
                  {
                    revisions: 10,
                    price: 169000,
                    code: "COMMISSION_REV_10",
                    name: "Gói +10 Lượt Sửa Commission (Vĩnh viễn)",
                    desc: "Cộng tổng +10 lượt chỉnh sửa Commission miễn phí dùng chung cho mọi đơn thiết kế, không giới hạn thời gian.",
                  },
                ].map((preset) => (
                  <button
                    key={preset.revisions}
                    type="button"
                    onClick={() => {
                      setMaxCommissionRevisions(String(preset.revisions));
                      setBasePrice(String(preset.price));
                      if (!planName.trim()) setPlanName(preset.name);
                      if (!planCode.trim()) setPlanCode(preset.code);
                      if (!description.trim()) setDescription(preset.desc);
                    }}
                    className="btn-secondary px-2.5! py-1! text-[11px] font-black tabular-nums shadow-[2px_2px_0_0_#000]"
                  >
                    +{preset.revisions} lượt · {preset.price.toLocaleString("vi-VN")}đ
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tên gói & Mã gói */}
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
              placeholder={
                planBenefitMode === "COMMISSION_REVISIONS"
                  ? "Ví dụ: Gói +5 Lượt Sửa Commission (Vĩnh viễn)"
                  : "Ví dụ: Lumintra All-Access VIP Pass"
              }
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Mã gói (Plan Code - Duy nhất) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
              placeholder={
                planBenefitMode === "COMMISSION_REVISIONS"
                  ? "Ví dụ: COMMISSION_REV_5"
                  : "Ví dụ: PRO_30_DAYS"
              }
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 font-mono text-xs font-black uppercase text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
        </div>

        {/* Giá bán & Số lượt sửa Commission cộng thêm */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Lượt sửa Commission miễn phí cộng thêm (+N){" "}
              {planBenefitMode === "COMMISSION_REVISIONS" && <span className="text-red-600">*</span>}
            </label>
            <input
              type="number"
              min={planBenefitMode === "COMMISSION_REVISIONS" ? 1 : 0}
              max={100}
              step={1}
              required={planBenefitMode === "COMMISSION_REVISIONS"}
              value={maxCommissionRevisions}
              onChange={(e) => setMaxCommissionRevisions(e.target.value)}
              placeholder="Ví dụ: 5 hoặc 10"
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
            <p className="mt-1 text-[11px] font-medium text-text-muted">
              Tổng số lượt miễn phí cộng vào ví khách hàng (dùng tùy ý cho bất kỳ đơn Commission nào, hết lượt mới tính phí).
            </p>
          </div>
        </div>

        {/* Thời hạn gói */}
        {planBenefitMode === "COMMISSION_REVISIONS" && !allAccessCharacters ? (
          <div className="flex items-center gap-2 border-2 border-black bg-[#e9d5ff] px-3.5 py-2.5 text-xs font-medium text-black shadow-[2px_2px_0_0_#000]">
            <InfinityIcon size={15} className="shrink-0 text-black" aria-hidden="true" />
            <span>
              <strong className="font-black">Thời hạn: Vĩnh viễn (Không giới hạn ngày).</strong> Gói cộng lượt sửa Commission miễn phí mặc định có hiệu lực vĩnh viễn.
            </span>
          </div>
        ) : (
          <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
            <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-black">
              Thời hạn sử dụng (isLifetime &amp; durationDays)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={!isLifetime}
                onClick={() => setIsLifetime(false)}
                className={`flex cursor-pointer items-center justify-between border-2 border-black p-2.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  !isLifetime
                    ? "bg-primary/30 text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-gray-50 text-black hover:bg-primary/15"
                }`}
              >
                <div>
                  <p className="text-xs font-black uppercase">Gói có thời hạn (Theo ngày)</p>
                  <p className="text-[11px] font-medium text-text-muted">Bắt buộc nhập số ngày hiệu lực</p>
                </div>
                {!isLifetime && <Check size={16} strokeWidth={3} className="text-black" aria-hidden="true" />}
              </button>

              <button
                type="button"
                aria-pressed={isLifetime}
                onClick={() => setIsLifetime(true)}
                className={`flex cursor-pointer items-center justify-between border-2 border-black p-2.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  isLifetime
                    ? "bg-primary/30 text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-gray-50 text-black hover:bg-primary/15"
                }`}
              >
                <div>
                  <p className="flex items-center gap-1 text-xs font-black uppercase">
                    <InfinityIcon size={14} aria-hidden="true" /> Gói Vĩnh viễn (Lifetime)
                  </p>
                  <p className="text-[11px] font-medium text-text-muted">Không giới hạn ngày</p>
                </div>
                {isLifetime && <Check size={16} strokeWidth={3} className="text-black" aria-hidden="true" />}
              </button>
            </div>

            {!isLifetime && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
                  Số ngày hiệu lực <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Ví dụ: 30, 90, 365"
                  className="w-full border-2 border-black bg-gray-50 px-3 py-1.5 text-sm font-bold text-black tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black sm:w-48"
                />
              </div>
            )}
          </div>
        )}

        {/* Mô tả */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
            Mô tả quyền lợi gói
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết ưu đãi và quyền lợi của hội viên..."
            className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-black placeholder:text-text-muted focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
          />
        </div>

        {/* Hình ảnh sản phẩm (Ảnh đại diện & Thư viện ảnh) */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="border-2 border-black bg-gray-50 p-3.5 shadow-[2px_2px_0_0_#000]">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black">
                <ImageIcon size={14} className="text-primary-ink" aria-hidden="true" /> Ảnh đại diện
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
                  alt="Xem trước ảnh đại diện"
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
              placeholder="Hoặc dán URL https://... hoặc /images/..."
              className="mt-2.5 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>

          <div className="border-2 border-black bg-gray-50 p-3.5 shadow-[2px_2px_0_0_#000]">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black">
                <ImageIcon size={14} className="text-primary-ink" aria-hidden="true" /> Thư viện ảnh
              </label>
              <button
                type="button"
                disabled={isUploadingGallery}
                onClick={() => galleryInputRef.current?.click()}
                className="btn-secondary inline-flex items-center gap-1 px-2.5! py-1! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                {isUploadingGallery ? (
                  <>
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Đang tải...
                  </>
                ) : (
                  <>
                    <Upload size={12} aria-hidden="true" /> Tải nhiều ảnh
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
                <div className="mt-2.5 flex flex-wrap gap-2 border-2 border-black bg-white p-2">
                  {galleryList.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-12 w-12 overflow-hidden border-2 border-black bg-gray-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Ảnh ${idx + 1}`}
                        className="h-full w-full object-contain [image-rendering:pixelated]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryUrl(idx)}
                        aria-label={`Xóa ảnh thư viện ${idx + 1}`}
                        className="absolute right-0.5 top-0.5 border border-black bg-black/80 p-0.5 text-white hover:bg-red-600"
                      >
                        <X size={10} aria-hidden="true" />
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
              className="mt-2.5 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
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
        <label className="flex cursor-pointer items-center justify-between gap-3 border-2 border-black bg-primary/15 p-3.5 text-xs text-black">
          <div>
            <span className="block font-black uppercase tracking-wide text-black">
              Mở bán ngay sau khi tạo
            </span>
            <span className="font-medium text-text-muted">
              Mặc định gói hội viên tạo mới ở trạng thái <strong className="font-black text-black">Chưa mở bán</strong> để kiểm tra trước khi đăng lên Cửa hàng.
            </span>
          </div>
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
            className="h-4 w-4 accent-[#1f432b]"
          />
        </label>
      </form>
    </StoreModal>
  );
}
