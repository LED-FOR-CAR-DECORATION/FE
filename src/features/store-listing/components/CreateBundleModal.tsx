"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Minus,
  Package,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import CategoryTagSelector from "./CategoryTagSelector";
import StoreModal from "./StoreModal";
import { apiUpdateProductStatus, fetchStoreTags } from "@/lib/api/products";
import {
  apiCreateBundle,
  fetchBundleSelectableItems,
  normalizeBundleHttpUrl,
  type BundleConstituentItem,
  type BundleSelectableItem,
  type ManagedBundleDetail,
} from "@/lib/api/bundles";
import { uploadMediaFile } from "@/lib/api/media";
import type { TagItem } from "@/api_client";
import { formatVnd } from "../format";

interface CreateBundleModalProps {
  onClose: () => void;
  onSuccess: (bundle: ManagedBundleDetail) => void;
  onBackToTypeSelect?: () => void;
}

interface SelectedBundleItem {
  id: string; // unique key for UI
  modelId?: number;
  versionId?: number;
  name: string;
  itemType: "LED" | "CHARACTER";
  unitPrice: number;
  quantity: number;
  previewUrl?: string;
}

export default function CreateBundleModal({
  onClose,
  onSuccess,
  onBackToTypeSelect,
}: CreateBundleModalProps) {
  // Form states
  const [bundleName, setBundleName] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [previewThumbUrl, setPreviewThumbUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [items, setItems] = useState<SelectedBundleItem[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Async data states
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [availableLedProducts, setAvailableLedProducts] = useState<BundleSelectableItem[]>([]);
  const [availableCharacterProducts, setAvailableCharacterProducts] = useState<BundleSelectableItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Item Picker dropdown / modal
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"LED" | "CHARACTER">("LED");

  // Load catalogs on mount
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchStoreTags(),
      fetchBundleSelectableItems(),
    ])
      .then(([tagsRes, selectableRes]) => {
        if (!active) return;
        if (tagsRes.status === "fulfilled") {
          setAvailableTags(tagsRes.value);
        }
        if (selectableRes.status === "fulfilled") {
          setAvailableLedProducts(selectableRes.value.ledOptions);
          setAvailableCharacterProducts(selectableRes.value.characterOptions);
        } else {
          console.error("Failed to load selectable items for bundle:", selectableRes.reason);
        }
      })
      .finally(() => {
        if (active) setIsLoadingCatalogs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Calculate originalPrice in real-time
  const originalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  const isPriceInvalid = originalPrice > 0 && bundlePrice > originalPrice;
  const discountPercent =
    originalPrice > 0 && bundlePrice <= originalPrice
      ? Math.round((1 - bundlePrice / originalPrice) * 100)
      : 0;

  // Handle Thumbnail File Upload via Media Service
  const handleThumbnailUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumb(true);
    setErrorMessage(null);
    try {
      const res = await uploadMediaFile(file, "PRODUCT_BUNDLE");
      setThumbnailUrl(res.publicUrl);
      setPreviewThumbUrl(res.localPreviewUrl || res.publicUrl);
    } catch (err: any) {
      console.error("Upload thumbnail failed:", err);
      setErrorMessage(err?.message || "Tải ảnh đại diện lên máy chủ thất bại.");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  // Handle Gallery Files Upload via Media Service
  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    setErrorMessage(null);
    try {
      const uploadPromises = Array.from(files).map((f) =>
        uploadMediaFile(f, "PRODUCT_BUNDLE"),
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.publicUrl);
      setGalleryUrls((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error("Upload gallery failed:", err);
      setErrorMessage(err?.message || "Tải ảnh bổ sung thất bại.");
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleTag = (tagId: number) => {
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

  // Add Item to bundle
  const handleAddItem = (option: BundleSelectableItem) => {
    const existing = items.find(
      (it) =>
        (option.itemType === "LED" && it.modelId === option.targetId) ||
        (option.itemType === "CHARACTER" && it.versionId === option.targetId),
    );

    if (existing) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === existing.id ? { ...it, quantity: it.quantity + 1 } : it,
        ),
      );
    } else {
      const newItem: SelectedBundleItem = {
        id: `${option.itemType}-${option.targetId}-${Date.now()}`,
        modelId: option.itemType === "LED" ? option.targetId : undefined,
        versionId: option.itemType === "CHARACTER" ? option.targetId : undefined,
        name: option.name,
        itemType: option.itemType,
        unitPrice: option.price,
        quantity: 1,
        previewUrl: option.previewUrl,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setIsItemPickerOpen(false);
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id !== id) return it;
          const nextQty = it.quantity + delta;
          return nextQty > 0 ? { ...it, quantity: nextQty } : null;
        })
        .filter(Boolean) as SelectedBundleItem[],
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!bundleName.trim()) {
      setErrorMessage("Vui lòng nhập tên gói combo.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Gói combo phải chứa ít nhất 1 linh kiện hoặc hoạt ảnh.");
      return;
    }
    if (bundlePrice < 0) {
      setErrorMessage("Giá gói combo không được âm.");
      return;
    }
    if (bundlePrice > originalPrice) {
      setErrorMessage(
        `Giá gói combo (${formatVnd(bundlePrice)}) không được vượt quá tổng giá gốc (${formatVnd(originalPrice)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems: BundleConstituentItem[] = items.map((it) => ({
        modelId: it.itemType === "LED" ? it.modelId : null,
        versionId: it.itemType === "CHARACTER" ? it.versionId : null,
        quantity: it.quantity,
      }));

      const normalizedGalleryUrls = galleryUrls
        .map((url) => normalizeBundleHttpUrl(url))
        .filter((url): url is string => Boolean(url));

      let created = await apiCreateBundle({
        bundleName: bundleName.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: normalizeBundleHttpUrl(thumbnailUrl),
        galleryUrls: normalizedGalleryUrls.length > 0 ? normalizedGalleryUrls : undefined,
        bundlePrice,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        items: payloadItems,
      });

      if (publishImmediately && created.productId) {
        try {
          await apiUpdateProductStatus(created.productId, "PUBLISHED");
          created = { ...created, status: "PUBLISHED" };
        } catch {
          // Bundle + product remain UNPUBLISHED if publish call fails
        }
      }

      onSuccess(created);
    } catch (err: any) {
      console.error("Create bundle failed:", err);
      const backendMsg =
        err?.response?.data?.message || err?.message || "Tạo gói combo thất bại.";
      setErrorMessage(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      title="Tạo Gói Combo (Bundle) Mới"
      badge="TẠO GÓI SẢN PHẨM"
      description="Kết hợp thiết bị LED và nhân vật animation với mức giá khuyến mãi hấp dẫn."
      icon={<Boxes size={18} />}
      iconBoxClassName="bg-[#fef08a]"
      onClose={onClose}
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
            form="create-bundle-form"
            disabled={isSubmitting || isPriceInvalid || items.length === 0}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang khởi tạo gói...
              </>
            ) : publishImmediately ? (
              <>
                <Rocket size={14} aria-hidden="true" />
                Tạo gói &amp; Mở bán ngay
              </>
            ) : (
              <>
                <Package size={14} aria-hidden="true" />
                Tạo gói sản phẩm
              </>
            )}
          </button>
        </>
      }
    >
      <form id="create-bundle-form" onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wide text-black">
              Tên gói Combo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              placeholder="VD: Combo Khởi Đầu: Bảng LED Matrix 64x64 + Animation Rồng Cyber"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              className="mt-1 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wide text-black">
              Mô tả chi tiết ưu đãi
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả các thành phần trong combo, độ tương thích và lợi ích tiết kiệm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-black placeholder:text-text-muted focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
            />
          </div>
        </div>

        {/* 2. Media Upload via Media Service */}
        <div className="space-y-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
          <h3 className="flex items-center gap-1.5 border-b-2 border-black pb-2 text-xs font-black uppercase tracking-wider text-black">
            <ImageIcon size={15} className="text-primary-ink" aria-hidden="true" /> Hình ảnh sản phẩm
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Thumbnail */}
            <div>
              <span className="mb-1.5 block text-xs font-black uppercase text-black">
                Ảnh đại diện (Thumbnail)
              </span>
              <div className="flex items-center gap-3">
                {previewThumbUrl || thumbnailUrl ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden border-2 border-black bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewThumbUrl || thumbnailUrl}
                      alt="Thumbnail preview"
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailUrl("");
                        setPreviewThumbUrl("");
                      }}
                      aria-label="Xóa ảnh đại diện"
                      className="absolute right-0.5 top-0.5 border border-black bg-black/80 p-0.5 text-white hover:bg-red-600"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center border-2 border-dashed border-black/30 bg-gray-50 text-text-muted">
                    <ImageIcon size={24} aria-hidden="true" />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <label className="btn-secondary inline-flex cursor-pointer items-center justify-center px-3! py-1.5! text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]">
                    <span className="inline-flex items-center gap-1.5">
                      {isUploadingThumb ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload size={13} aria-hidden="true" />
                      )}
                      {isUploadingThumb ? "Đang xử lý..." : "Tải ảnh từ máy"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingThumb}
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    placeholder="Hoặc dán URL ảnh (https://...)"
                    value={thumbnailUrl}
                    onChange={(e) => {
                      setThumbnailUrl(e.target.value);
                      setPreviewThumbUrl(e.target.value);
                    }}
                    className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
                  />
                </div>
              </div>
            </div>

            {/* Gallery URLs */}
            <div>
              <span className="mb-1.5 block text-xs font-black uppercase text-black">
                Ảnh bổ sung (Gallery)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {galleryUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative h-12 w-12 overflow-hidden border-2 border-black bg-gray-50"
                  >
                    <Image src={url} alt={`Gallery ${idx}`} fill className="object-contain [image-rendering:pixelated]" />
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

                <label className="flex h-12 cursor-pointer items-center justify-center border-2 border-dashed border-black bg-gray-50 px-3 text-[11px] font-black uppercase text-black hover:bg-primary/20">
                  <span className="inline-flex items-center gap-1">
                    {isUploadingGallery ? (
                      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus size={11} aria-hidden="true" />
                    )}
                    Thêm ảnh
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={isUploadingGallery}
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Constituent Items Builder */}
        <div className="space-y-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                <Sparkles size={15} className="text-primary-ink" aria-hidden="true" /> Thành phần trong gói Combo
              </h3>
              <p className="text-[11px] font-medium text-text-muted">
                Phải chọn ít nhất 1 linh kiện LED hoặc animation nhân vật
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(!isItemPickerOpen)}
                className="btn-primary inline-flex items-center gap-1.5 px-3! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
              >
                <Plus size={13} aria-hidden="true" />
                Thêm thành phần
                <ChevronDown size={12} aria-hidden="true" />
              </button>

              {/* Dropdown Picker */}
              {isItemPickerOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000]">
                  <div className="flex gap-1 border-b-2 border-black bg-gray-100 p-1.5">
                    <button
                      type="button"
                      onClick={() => setPickerTab("LED")}
                      className={`flex-1 cursor-pointer border-2 border-black py-1 text-[11px] font-black uppercase transition ${
                        pickerTab === "LED"
                          ? "bg-primary text-black shadow-[1px_1px_0_0_#000]"
                          : "bg-white text-black hover:bg-primary/20"
                      }`}
                    >
                      Thiết bị LED ({availableLedProducts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab("CHARACTER")}
                      className={`flex-1 cursor-pointer border-2 border-black py-1 text-[11px] font-black uppercase transition ${
                        pickerTab === "CHARACTER"
                          ? "bg-primary text-black shadow-[1px_1px_0_0_#000]"
                          : "bg-white text-black hover:bg-primary/20"
                      }`}
                    >
                      Hoạt ảnh ({availableCharacterProducts.length})
                    </button>
                  </div>

                  <div className="max-h-60 divide-y-2 divide-black/10 overflow-y-auto p-1">
                    {isLoadingCatalogs ? (
                      <div className="py-4 text-center text-xs font-bold text-text-muted">
                        Đang tải sản phẩm...
                      </div>
                    ) : pickerTab === "LED" ? (
                      availableLedProducts.length === 0 ? (
                        <div className="py-4 text-center text-xs font-bold text-text-muted">
                          Không có thiết bị LED nào
                        </div>
                      ) : (
                        availableLedProducts.map((opt) => (
                          <div
                            key={`${opt.itemType}-${opt.targetId}`}
                            onClick={() => handleAddItem(opt)}
                            className="flex cursor-pointer items-center justify-between p-2 transition hover:bg-primary/20"
                          >
                            <div className="text-left">
                              <p className="text-xs font-black uppercase text-black">{opt.name}</p>
                              <p className="text-[10px] font-bold text-text-muted tabular-nums">
                                {opt.subtitle ? `${opt.subtitle} • ` : ""}Đơn giá: {formatVnd(opt.price)}
                              </p>
                            </div>
                            <Plus size={14} className="shrink-0 text-primary-ink" aria-hidden="true" />
                          </div>
                        ))
                      )
                    ) : availableCharacterProducts.length === 0 ? (
                      <div className="py-4 text-center text-xs font-bold text-text-muted">
                        Không có nhân vật nào
                      </div>
                    ) : (
                      availableCharacterProducts.map((opt) => (
                        <div
                          key={`${opt.itemType}-${opt.targetId}`}
                          onClick={() => handleAddItem(opt)}
                          className="flex cursor-pointer items-center justify-between p-2 transition hover:bg-primary/20"
                        >
                          <div className="text-left">
                            <p className="text-xs font-black uppercase text-black">{opt.name}</p>
                            <p className="text-[10px] font-bold text-text-muted tabular-nums">
                              {opt.subtitle ? `${opt.subtitle} • ` : ""}Đơn giá: {formatVnd(opt.price)}
                            </p>
                          </div>
                          <Plus size={14} className="shrink-0 text-primary-ink" aria-hidden="true" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items Table / List */}
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-black/25 bg-gray-50 py-6 text-center text-xs font-bold text-text-muted">
              Chưa có thành phần nào. Bấm &quot;Thêm thành phần&quot; để đưa linh kiện vào gói combo.
            </div>
          ) : (
            <div className="divide-y-2 divide-black/10 border-2 border-black bg-white">
              {items.map((it) => (
                <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`border border-black px-1.5 py-0.5 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_0_#000] ${
                        it.itemType === "LED" ? "bg-[#fef08a]" : "bg-[#bae6fd]"
                      }`}
                    >
                      {it.itemType === "LED" ? "Thiết bị LED" : "Hoạt ảnh"}
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase text-black">{it.name}</p>
                      <p className="text-[11px] font-medium text-text-muted tabular-nums">
                        Đơn giá: {formatVnd(it.unitPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border-2 border-black bg-gray-50">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(it.id, -1)}
                        aria-label="Giảm số lượng"
                        className="cursor-pointer px-2 py-1 text-black hover:bg-primary/30"
                      >
                        <Minus size={12} aria-hidden="true" />
                      </button>
                      <span className="w-8 border-x-2 border-black bg-white py-0.5 text-center text-xs font-black text-black tabular-nums">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(it.id, 1)}
                        aria-label="Tăng số lượng"
                        className="cursor-pointer px-2 py-1 text-black hover:bg-primary/30"
                      >
                        <Plus size={12} aria-hidden="true" />
                      </button>
                    </div>

                    {/* Line subtotal */}
                    <span className="w-24 text-right text-xs font-black text-primary-ink tabular-nums">
                      {formatVnd(it.unitPrice * it.quantity)}
                    </span>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      aria-label={`Xóa ${it.name}`}
                      className="btn-danger p-1.5! shadow-[1px_1px_0_0_#000]"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Pricing & Discount Calculation */}
        <div className="space-y-3 border-2 border-black bg-primary/15 p-4 shadow-[2px_2px_0_0_#000]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
            <span className="text-xs font-black uppercase text-black">
              Tổng giá trị gốc của các thành phần:
            </span>
            <span className="text-sm font-black text-black tabular-nums">
              {formatVnd(originalPrice)}
            </span>
          </div>

          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-black">
                Giá bán ưu đãi của Combo (VNĐ) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={bundlePrice}
                onChange={(e) => setBundlePrice(Number(e.target.value))}
                className={`mt-1 w-full border-2 border-black px-3 py-2 text-sm font-black tabular-nums focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                  isPriceInvalid
                    ? "bg-[#fee2e2] text-red-700"
                    : "bg-white text-primary-ink"
                }`}
              />
            </div>

            <div className="text-right">
              {isPriceInvalid ? (
                <p className="inline-flex items-center gap-1.5 border-2 border-black bg-[#fee2e2] px-2.5 py-1.5 text-xs font-black text-black">
                  <AlertTriangle size={14} className="shrink-0 text-red-700" aria-hidden="true" />
                  Giá gói combo không được vượt quá giá gốc ({formatVnd(originalPrice)})
                </p>
              ) : (
                <div>
                  <span className="text-xs font-black uppercase text-black">
                    Mức giảm giá cho khách hàng:
                  </span>
                  <div className="text-base font-black text-primary-ink tabular-nums">
                    Tiết kiệm {discountPercent}% ({formatVnd(Math.max(0, originalPrice - bundlePrice))})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Category Tags */}
        <CategoryTagSelector
          availableTags={availableTags}
          selectedTagIds={selectedTagIds}
          isLoading={isLoadingCatalogs}
          label="Thẻ phân loại sản phẩm"
          onToggleTag={handleToggleTag}
          onTagCreated={handleTagCreated}
        />

        {/* 6. Trạng thái mở bán */}
        <label className="flex cursor-pointer items-center justify-between gap-3 border-2 border-black bg-primary/15 p-3.5 text-xs text-black">
          <div>
            <span className="block font-black uppercase tracking-wide text-black">
              Mở bán ngay sau khi tạo
            </span>
            <span className="font-medium text-text-muted">
              Hệ thống tạo đồng thời Gói sản phẩm và Sản phẩm bày bán (mặc định ở trạng thái <strong className="font-black text-black">Chưa mở bán</strong>).
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

