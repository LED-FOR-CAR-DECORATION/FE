"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import CategoryTagSelector from "./CategoryTagSelector";
import { apiUpdateStoreProduct, fetchStoreTags } from "@/lib/api/products";
import { uploadMediaFile, type MediaPurposeType } from "@/lib/api/media";
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
  onClose: () => void;
  onSuccess: (productName: string) => void;
}

export default function EditStoreProductModal({ product, onClose, onSuccess }: EditStoreProductModalProps) {
  const [productName, setProductName] = useState(product.productName);
  const [basePrice, setBasePrice] = useState<string>(String(product.basePrice ?? 0));
  const [description, setDescription] = useState(product.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(product.thumbnailUrl ?? "");
  const [galleryUrlsText, setGalleryUrlsText] = useState((product.galleryUrls ?? []).join("\n"));

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>(product.thumbnailUrl ?? "");

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

    const priceNum = Number(basePrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Giá bán cơ bản phải lớn hơn hoặc bằng 0 VNĐ.");
      return;
    }

    const galleryUrls = galleryUrlsText
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const payload: UpdateStoreProductRequest = {
      productName: trimmedName,
      basePrice: priceNum,
      description: description.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
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
      onSuccess(trimmedName);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Cập nhật sản phẩm thất bại. Vui lòng thử lại.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Chỉnh sửa sản phẩm #${product.id}`}
      description="Chỉ dành cho Manager: Cập nhật thông tin chi tiết sản phẩm trên Store."
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold hover:bg-[#eef8f0] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-[#3b8555] bg-[#439660] px-5 py-2 text-sm font-black text-white shadow-xs hover:bg-[#387e51] disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            Lưu thay đổi
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <span className="font-bold">Lưu ý BR-FL5-03:</span> Việc thay đổi giá bán cơ bản chỉ áp dụng cho các đơn hàng tương lai, hoàn toàn không làm thay đổi giá trên các đơn hàng lịch sử của khách hàng.
        </div>

        {/* Tên & Giá */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Giá bán cơ bản (VNĐ) <span className="text-red-500">*</span>
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

        {/* Mô tả */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Mô tả sản phẩm</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        {/* Thumbnail & Gallery */}
        <div className="space-y-4 rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-4">
          <div className="flex items-center justify-between border-b border-[#e5efe7] pb-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1f432b]">
              <ImageIcon size={15} /> Hình ảnh sản phẩm (Thumbnail & Thư viện ảnh)
            </h4>
            <span className="text-[11px] text-[#558363]">Hỗ trợ PNG, JPG, WEBP, GIF</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* THUMBNAIL */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#e0ede3] bg-white p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f432b]">
                  Ảnh đại diện (Thumbnail)
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

              {/* Preview Thumbnail */}
              {(thumbnailPreviewUrl || thumbnailUrl) && (
                <div className="relative mt-1 flex items-center gap-3 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] p-2">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#cbe4d2] bg-white">
                    <img
                      src={thumbnailPreviewUrl || thumbnailUrl}
                      alt="Thumbnail Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#1f432b]">
                      {thumbnailUrl || "Ảnh đã tải lên"}
                    </p>
                    <p className="text-[11px] text-text-muted">
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
                    className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              <div>
                <span className="text-[11px] text-text-muted">Hoặc nhập trực tiếp URL ảnh:</span>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailUrl(e.target.value);
                    setThumbnailPreviewUrl(e.target.value);
                  }}
                  placeholder="https://cdn.lumintra.com/products/matrix.png"
                  className="mt-1 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
            </div>

            {/* GALLERY */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#e0ede3] bg-white p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f432b]">
                  Thư viện ảnh (Gallery)
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
                      <Upload size={12} /> Tải nhiều ảnh từ máy
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
                  <div className="mt-1 flex flex-wrap gap-2 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] p-2">
                    {galleryList.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative h-14 w-14 overflow-hidden rounded-md border border-[#cbe4d2] bg-white shadow-xs"
                      >
                        <img
                          src={url}
                          alt={`Gallery ${idx + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryUrl(idx)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white transition hover:bg-red-600"
                          title="Xóa ảnh"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div>
                <span className="text-[11px] text-text-muted">Hoặc dán danh sách URL (mỗi dòng 1 link):</span>
                <textarea
                  rows={2}
                  value={galleryUrlsText}
                  onChange={(e) => setGalleryUrlsText(e.target.value)}
                  placeholder="https://.../img1.png&#10;https://.../img2.png"
                  className="mt-1 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
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
    </Modal>
  );
}
