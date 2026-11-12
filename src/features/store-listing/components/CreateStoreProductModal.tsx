"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Cpu, Loader2, Sparkles, Tag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { apiCreateStoreProduct, fetchStoreTags } from "@/lib/api/products";
import type { TagItem } from "@/api_client";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";

interface CreateStoreProductModalProps {
  onClose: () => void;
  onSuccess: (productName: string) => void;
  initialType?: "LED" | "CHARACTER";
}

export default function CreateStoreProductModal({
  onClose,
  onSuccess,
  initialType = "LED",
}: CreateStoreProductModalProps) {
  const [productType, setProductType] = useState<"CHARACTER" | "LED">(initialType);
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState<string>(initialType === "LED" ? "1490000" : "199000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrlsText, setGalleryUrlsText] = useState("");
  const [characterVersionId, setCharacterVersionId] = useState<string>("1");

  // LED Details
  const [modelName, setModelName] = useState("");
  const [spec, setSpec] = useState("64x64 RGB HUB75 ESP32-S3");
  const [stockQuantity, setStockQuantity] = useState<string>("50");

  // Tags
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoreTags().then((tags) => {
      if (!cancelled) setAvailableTags(tags);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

    const payload: CreateStoreProductRequest = {
      productName: trimmedName,
      productType:
        productType === "LED"
          ? CreateStoreProductRequest.productType.LED
          : CreateStoreProductRequest.productType.CHARACTER,
      basePrice: priceNum,
      description: description.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    if (productType === "CHARACTER") {
      const verId = Number(characterVersionId);
      if (!Number.isFinite(verId) || verId <= 0) {
        setError("Vui lòng nhập ID Version hợp lệ (> 0) cho Character.");
        return;
      }
      payload.characterVersionId = verId;
    } else {
      const stockNum = Number(stockQuantity);
      payload.ledDetails = {
        modelName: modelName.trim() || trimmedName,
        spec: { specText: spec.trim() },
        stockQuantity: Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : 0,
      };
    }

    setIsSubmitting(true);
    try {
      await apiCreateStoreProduct(payload);
      onSuccess(trimmedName);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Tạo sản phẩm thất bại. Vui lòng kiểm tra lại thông tin.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo sản phẩm bày bán (Store Product)"
      description="Chỉ dành cho Manager: Khởi tạo sản phẩm phần cứng LED hoặc nhân vật Pixel Art theo user story POST /api/management/admin/store/products."
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
            {productType === "LED" ? "Tạo sản phẩm LED" : "Tạo nhân vật"}
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

        <div className="rounded-lg border border-[#d2e4d7] bg-[#f7fbf8] p-3 text-xs text-[#2e573c]">
          <span className="font-bold">Quy tắc AC04:</span> Trạng thái khởi tạo mặc định luôn là{" "}
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">UNPUBLISHED</span>. Sau khi tạo xong, bạn có thể kiểm tra và bấm Publish bất cứ lúc nào.
        </div>

        {/* 2 Chức năng chính: Tạo sản phẩm LED và Tạo nhân vật */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Chọn chức năng tạo sản phẩm (AC02)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setProductType("LED");
                if (basePrice === "199000") setBasePrice("1490000");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 font-bold transition ${
                productType === "LED"
                  ? "border-[#439660] bg-[#eaf7ee] text-[#1c4b2b] shadow-xs"
                  : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
              }`}
            >
              <Cpu size={16} />
              Tạo sản phẩm LED
            </button>
            <button
              type="button"
              onClick={() => {
                setProductType("CHARACTER");
                if (basePrice === "1490000") setBasePrice("199000");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 font-bold transition ${
                productType === "CHARACTER"
                  ? "border-[#439660] bg-[#eaf7ee] text-[#1c4b2b] shadow-xs"
                  : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
              }`}
            >
              <Sparkles size={16} />
              Tạo nhân vật
            </button>
          </div>
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
              placeholder={productType === "CHARACTER" ? "Ví dụ: Cyber Samurai 64x64" : "Ví dụ: Lumintra Matrix Pro 64x64"}
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
              placeholder="199000"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Trường riêng theo loại */}
        {productType === "CHARACTER" ? (
          <div className="rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
            <label className="mb-1 block font-bold text-[#1f432b]">
              ID Version Character liên kết (characterVersionId) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={characterVersionId}
              onChange={(e) => setCharacterVersionId(e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
            <p className="mt-1 text-xs text-text-muted">
              Hệ thống sẽ liên kết version này với sản phẩm mới (báo lỗi nếu version không tồn tại hoặc đã được liên kết).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
            <span className="font-bold text-[#1f432b]">Thông tin mẫu LED Model 1-1 (ledDetails)</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-text-muted">Tên Model LED</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Để trống sẽ dùng tên sản phẩm"
                  className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted">Tồn kho ban đầu</label>
                <input
                  type="number"
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted">Thông số kỹ thuật (spec)</label>
              <input
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="Ví dụ: 64x64 RGB HUB75 ESP32-S3"
                className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
              />
            </div>
          </div>
        )}

        {/* Mô tả */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Mô tả chi tiết</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả công dụng, tính năng, hiệu ứng animation..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        {/* Ảnh thumbnail & Gallery */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">Thumbnail URL</label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="/images/products/characters/cyber-fox.png"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">Gallery URLs (cách nhau dấu phẩy hoặc dòng)</label>
            <input
              type="text"
              value={galleryUrlsText}
              onChange={(e) => setGalleryUrlsText(e.target.value)}
              placeholder="https://.../img1.png, https://.../img2.png"
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

