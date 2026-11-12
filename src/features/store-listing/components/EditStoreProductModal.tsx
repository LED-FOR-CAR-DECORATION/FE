"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Tag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { apiUpdateStoreProduct, fetchStoreTags } from "@/lib/api/products";
import type { TagItem, UpdateStoreProductRequest } from "@/api_client";

export interface EditableProductData {
  id: string | number;
  productName: string;
  basePrice: number;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  tags?: Array<string | TagItem>;
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

  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggleTag = (tagId?: number) => {
    if (!tagId) return;
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
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
      setError("Giá bán cơ bản phải lớn hơn hoặc bằng 0 đ.");
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">Thumbnail URL</label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">Gallery URLs (cách nhau dòng hoặc dấu phẩy)</label>
            <input
              type="text"
              value={galleryUrlsText}
              onChange={(e) => setGalleryUrlsText(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 font-bold text-[#1f432b]">
              <Tag size={14} /> Thẻ phân loại (Category Tags - AC03)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId ?? -1);
                return (
                  <button
                    key={tag.tagId}
                    type="button"
                    onClick={() => toggleTag(tag.tagId)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
                      isSelected
                        ? "border-[#439660] bg-[#eaf7ee] text-[#1c4b2b]"
                        : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
