"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import StoreModal from "./StoreModal";
import CategoryTagSelector from "./CategoryTagSelector";
import { apiUpdateProductStatus, apiUpdateStoreProduct, fetchStoreTags } from "@/lib/api/products";
import { uploadMediaFile, type MediaPurposeType } from "@/lib/api/media";
import { formatVnd } from "../format";
import type { TagItem, UpdateStoreProductRequest } from "@/api_client";

export interface EditableProductData {
  id: string | number;
  productType?: "LED" | "CHARACTER" | "BUNDLE" | "SUBSCRIPTION";
  productName: string;
  basePrice: number;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  tags?: Array<string | TagItem>;
}

function resolveProductMediaPurpose(
  productType?: EditableProductData["productType"],
): MediaPurposeType {
  switch (productType) {
    case "LED":
      return "PRODUCT_LED";
    case "BUNDLE":
      return "PRODUCT_BUNDLE";
    case "SUBSCRIPTION":
      return "PRODUCT_SUBSCRIPTION";
    case "CHARACTER":
      return "CHARACTER_ASSET";
    default:
      return "STORE_PRODUCT";
  }
}

interface EditStoreProductModalProps {
  product: EditableProductData;
  mode?: "edit" | "approve";
  creatorName?: string;
  previewFallbackUrl?: string;
  onClose: () => void;
  onSuccess: (productName: string, savedPrice?: number) => void;
}

export default function EditStoreProductModal({
  product,
  mode = "edit",
  creatorName,
  previewFallbackUrl,
  onClose,
  onSuccess,
}: EditStoreProductModalProps) {
  const isApproveMode = mode === "approve";
  const initialHttpThumb =
    product.thumbnailUrl && /^https?:\/\/\S+$/i.test(product.thumbnailUrl.trim())
      ? product.thumbnailUrl.trim()
      : "";
  const [productName, setProductName] = useState(product.productName);
  const [basePrice, setBasePrice] = useState<string>(
    isApproveMode
      ? product.basePrice > 0
        ? String(product.basePrice)
        : ""
      : String(product.basePrice ?? 0),
  );
  const [description, setDescription] = useState(product.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialHttpThumb);
  const [galleryUrlsText, setGalleryUrlsText] = useState(
    (product.galleryUrls ?? []).filter((u) => /^https?:\/\/\S+$/i.test(u.trim())).join("\n"),
  );

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>(
    initialHttpThumb || previewFallbackUrl || product.thumbnailUrl || "",
  );

  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaPurpose = resolveProductMediaPurpose(product.productType);

  const handleThumbnailFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumbnail(true);
    setError(null);
    try {
      const res = await uploadMediaFile(file, mediaPurpose);
      setThumbnailUrl(res.publicUrl);
      setThumbnailPreviewUrl(res.localPreviewUrl || res.publicUrl);
    } catch (err: any) {
      setError(err?.message || "Không thể tải ảnh thumbnail lên. Vui lòng thử lại.");
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
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
        const res = await uploadMediaFile(file, mediaPurpose);
        if (res.publicUrl) {
          uploadedUrls.push(res.publicUrl);
        }
      }
      setGalleryUrlsText((prev) => {
        const existing = prev.trim();
        const joined = uploadedUrls.join("\n");
        return existing ? `${existing}\n${joined}` : joined;
      });
    } catch (err: any) {
      setError(err?.message || "Không thể tải các ảnh gallery lên. Vui lòng thử lại.");
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  };

  const handleRemoveGalleryUrl = (indexToRemove: number) => {
    const currentList = galleryUrlsText
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    const updated = currentList.filter((_, idx) => idx !== indexToRemove);
    setGalleryUrlsText(updated.join("\n"));
  };

  useEffect(() => {
    let cancelled = false;
    fetchStoreTags().then((tags) => {
      if (cancelled) return;
      setAvailableTags(tags);
      // Pre-select tags matching product.tags by name
      if (product.tags && product.tags.length > 0) {
        const tagNames = product.tags.map((t) => (typeof t === "string" ? t : t.name));
        const matchingIds = tags
          .filter((t) => t.name && tagNames.includes(t.name))
          .map((t) => t.tagId!)
          .filter(Boolean);
        setSelectedTagIds(matchingIds);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [product.tags]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    const trimmedPrice = basePrice.trim();
    const priceNum = Number(trimmedPrice);
    if (
      trimmedPrice === "" ||
      !/^\d{1,10}(?:\.\d{1,2})?$/.test(trimmedPrice) ||
      !Number.isFinite(priceNum) ||
      priceNum < 0
    ) {
      setError("Vui lòng nhập giá bán cơ bản hợp lệ (lớn hơn hoặc bằng 0 VNĐ).");
      return;
    }

    const trimmedThumb = thumbnailUrl.trim();
    if (trimmedThumb && !/^https?:\/\/\S+$/i.test(trimmedThumb)) {
      setError("Đường dẫn ảnh đại diện phải là URL HTTP/HTTPS hợp lệ.");
      return;
    }

    const galleryUrls = galleryUrlsText
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    if (galleryUrls.some((url) => !/^https?:\/\/\S+$/i.test(url))) {
      setError("Mỗi đường dẫn trong thư viện ảnh phải là URL HTTP/HTTPS hợp lệ.");
      return;
    }

    const payload: UpdateStoreProductRequest = {
      productName: trimmedName,
      basePrice: priceNum,
      description: description.trim() || undefined,
      thumbnailUrl: trimmedThumb || undefined,
      galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
      tagIds: selectedTagIds,
    };

    const numericId = Number(product.id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError("Mã sản phẩm không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiUpdateStoreProduct(numericId, payload);
      if (isApproveMode) {
        await apiUpdateProductStatus(numericId, "PUBLISHED");
      }
      onSuccess(trimmedName, priceNum);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        (isApproveMode
          ? "Xét duyệt mở bán sản phẩm thất bại. Vui lòng thử lại."
          : "Cập nhật sản phẩm thất bại. Vui lòng thử lại.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      title={
        isApproveMode
          ? `Xét duyệt mở bán sản phẩm #${product.id}`
          : `Chỉnh sửa sản phẩm #${product.id}`
      }
      badge={isApproveMode ? "XÉT DUYỆT MỞ BÁN" : "CHỈNH SỬA SẢN PHẨM"}
      description={
        isApproveMode
          ? creatorName
            ? `Nhà thiết kế: ${creatorName} · Kiểm tra thông tin, gắn thẻ và đặt giá bán trước khi mở bán.`
            : "Chỉ dành cho Manager: Kiểm tra thông tin, gắn thẻ và đặt giá bán trước khi mở bán."
          : "Chỉ dành cho Manager: Cập nhật thông tin chi tiết sản phẩm trên Store."
      }
      onClose={onClose}
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
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : isApproveMode ? (
              <Check size={15} aria-hidden="true" />
            ) : null}
            {isApproveMode ? "Xác nhận duyệt mở bán" : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {isApproveMode ? (
          <div className="border-2 border-black bg-[#eef8f0] p-3 text-xs font-medium text-black">
            <span className="font-black uppercase">Xét duyệt mở bán:</span> Kiểm tra lại tên, mô tả, hình ảnh, thẻ phân loại và nhập giá niêm yết. Khi xác nhận, hệ thống sẽ lưu thông tin mới nhất và chuyển sản phẩm sang trạng thái <strong className="font-black">Đang bán</strong>.
          </div>
        ) : (
          <div className="border-2 border-black bg-[#fef08a]/60 p-3 text-xs font-medium text-black">
            <span className="font-black uppercase">Lưu ý BR-FL5-03:</span> Việc thay đổi giá bán cơ bản chỉ áp dụng cho các đơn hàng tương lai, hoàn toàn không làm thay đổi giá trên các đơn hàng lịch sử của khách hàng.
          </div>
        )}

        {/* Tên & Giá */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              Tên sản phẩm <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
              {isApproveMode ? "Giá bán đề xuất / niêm yết (VNĐ)" : "Giá bán cơ bản (VNĐ)"}{" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={9999999999.99}
              step={0.01}
              required
              autoFocus={isApproveMode}
              placeholder={isApproveMode ? "Nhập giá bán (VD: 49000)" : undefined}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-black text-primary-ink tabular-nums focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
            {isApproveMode && (
              <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-text-muted">
                <span>Nhập 0 nếu muốn phát hành miễn phí.</span>
                {basePrice.trim() !== "" &&
                  /^\d{1,10}(?:\.\d{1,2})?$/.test(basePrice.trim()) && (
                    <span className="font-black text-primary-ink tabular-nums">
                      {formatVnd(Number(basePrice.trim()))}
                    </span>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Mô tả */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
            Mô tả sản phẩm
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
          />
        </div>

        {/* Thumbnail & Gallery */}
        <div className="space-y-4 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
            <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
              <ImageIcon size={15} className="text-primary-ink" aria-hidden="true" /> Hình ảnh sản phẩm (Thumbnail &amp; Thư viện ảnh)
            </h4>
            <span className="border border-black bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-black">
              PNG, JPG, WEBP, GIF
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* THUMBNAIL */}
            <div className="flex flex-col gap-2.5 border-2 border-black bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wide text-black">
                  Ảnh đại diện (Thumbnail)
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

              {/* Preview Thumbnail */}
              {(thumbnailPreviewUrl || thumbnailUrl) && (
                <div className="relative mt-1 flex items-center gap-3 border-2 border-black bg-white p-2">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border-2 border-black bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailPreviewUrl || thumbnailUrl}
                      alt="Thumbnail Preview"
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-black">
                      {thumbnailUrl || "Ảnh đã tải lên"}
                    </p>
                    <p className="text-[11px] font-medium text-text-muted">
                      Đã gán làm ảnh đại diện sản phẩm
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailUrl("");
                      setThumbnailPreviewUrl("");
                    }}
                    title="Xóa ảnh này"
                    aria-label="Xóa ảnh đại diện"
                    className="btn-secondary p-1! shadow-[1px_1px_0_0_#000]"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-text-muted">Hoặc nhập trực tiếp URL ảnh:</span>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailUrl(e.target.value);
                    setThumbnailPreviewUrl(e.target.value);
                  }}
                  placeholder="https://cdn.lumintra.com/products/matrix.png"
                  className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
                />
              </div>
            </div>

            {/* GALLERY */}
            <div className="flex flex-col gap-2.5 border-2 border-black bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wide text-black">
                  Thư viện ảnh (Gallery)
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
                      <Upload size={12} aria-hidden="true" /> Tải nhiều ảnh từ máy
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

              {/* Preview Gallery List */}
              {(() => {
                const galleryList = galleryUrlsText
                  .split(/[\n,]/)
                  .map((u) => u.trim())
                  .filter((u) => u.length > 0);
                if (galleryList.length === 0) return null;
                return (
                  <div className="mt-1 flex flex-wrap gap-2 border-2 border-black bg-white p-2">
                    {galleryList.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative h-14 w-14 overflow-hidden border-2 border-black bg-gray-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Gallery ${idx + 1}`}
                          className="h-full w-full object-contain [image-rendering:pixelated]"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryUrl(idx)}
                          className="absolute right-0.5 top-0.5 border border-black bg-black/80 p-0.5 text-white transition hover:bg-red-600"
                          title="Xóa ảnh"
                          aria-label={`Xóa ảnh thư viện ${idx + 1}`}
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div>
                <span className="text-[11px] font-bold text-text-muted">Hoặc dán danh sách URL (mỗi dòng 1 link):</span>
                <textarea
                  rows={2}
                  value={galleryUrlsText}
                  onChange={(e) => setGalleryUrlsText(e.target.value)}
                  placeholder="https://.../img1.png&#10;https://.../img2.png"
                  className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <CategoryTagSelector
          availableTags={availableTags}
          selectedTagIds={selectedTagIds}
          label="Thẻ phân loại sản phẩm"
          onToggleTag={toggleTag}
          onTagCreated={handleTagCreated}
        />
      </form>
    </StoreModal>
  );
}
