"use client";

import { useEffect, useId, useMemo, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
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
  const modalTitleId = useId();

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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5 backdrop-blur-sm"
    >
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl border-2 border-[#10351f] bg-white shadow-[6px_6px_0_#10351f] overflow-hidden my-auto">
        {/* Header - Fixed & Pinned */}
        <div className="flex shrink-0 items-center justify-between border-b-2 border-[#10351f] bg-gradient-to-r from-[#bceac8] to-[#8bd49f] px-5 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f9660] bg-white text-emerald-800 shadow-[1px_1px_0_#10351f]">
              <Boxes size={20} />
            </span>
            <div>
              <h2 id={modalTitleId} className="text-base sm:text-lg font-black text-emerald-950">
                Tạo Gói Combo (Bundle) Mới
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-emerald-900/80">
                Kết hợp thiết bị LED và nhân vật animation với mức giá khuyến mãi hấp dẫn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-emerald-950 hover:bg-black/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="rounded-lg border-2 border-rose-500 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                {errorMessage}
              </div>
            )}

          {/* 1. Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-gray-700">
                Tên gói Combo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                placeholder="VD: Combo Khởi Đầu: Bảng LED Matrix 64x64 + Animation Rồng Cyber"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-semibold focus:border-[#3f9660] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-700">
                Mô tả chi tiết ưu đãi
              </label>
              <textarea
                rows={3}
                placeholder="Mô tả các thành phần trong combo, độ tương thích và lợi ích tiết kiệm..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-medium focus:border-[#3f9660] focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Media Upload via Media Service */}
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ImageIcon size={15} /> Hình ảnh sản phẩm (Cloud V4 Upload)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thumbnail */}
              <div>
                <span className="block text-xs font-bold text-gray-600 mb-1">
                  Ảnh đại diện (Thumbnail)
                </span>
                <div className="flex items-center gap-3">
                  {previewThumbUrl || thumbnailUrl ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-[#10351f] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewThumbUrl || thumbnailUrl}
                        alt="Thumbnail preview"
                        className="h-full w-full object-cover"
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
                        className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white hover:bg-black"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-400">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-100">
                      <span className="inline-flex items-center gap-1.5">
                        {isUploadingThumb ? (
                          <Loader2 size={13} className="animate-spin text-primary-dark" />
                        ) : (
                          <Upload size={13} />
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs focus:border-[#3f9660] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Gallery URLs */}
              <div>
                <span className="block text-xs font-bold text-gray-600 mb-1">
                  Ảnh bổ sung (Gallery)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {galleryUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-300 bg-white"
                    >
                      <Image src={url} alt={`Gallery ${idx}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryUrl(idx)}
                        className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white hover:bg-black"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  <label className="flex h-12 cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-2.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50">
                    <span className="inline-flex items-center gap-1">
                      {isUploadingGallery ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Plus size={11} />
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
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Sparkles size={15} /> Thành phần trong gói Combo
                </h3>
                <p className="text-[11px] font-semibold text-gray-500">
                  Phải chọn ít nhất 1 linh kiện LED hoặc animation nhân vật
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsItemPickerOpen(!isItemPickerOpen)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#5fb97d] px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-[#3f9660]"
                >
                  <Plus size={13} />
                  Thêm thành phần
                  <ChevronDown size={12} />
                </button>

                {/* Dropdown Picker */}
                {isItemPickerOpen && (
                  <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-xl border-2 border-[#10351f] bg-white shadow-xl overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => setPickerTab("LED")}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                          pickerTab === "LED"
                            ? "bg-white text-emerald-800 shadow-sm"
                            : "text-gray-600 hover:text-black"
                        }`}
                      >
                        Thiết bị LED ({availableLedProducts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickerTab("CHARACTER")}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                          pickerTab === "CHARACTER"
                            ? "bg-white text-emerald-800 shadow-sm"
                            : "text-gray-600 hover:text-black"
                        }`}
                      >
                        Hoạt ảnh ({availableCharacterProducts.length})
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-1">
                      {isLoadingCatalogs ? (
                        <div className="py-4 text-center text-xs text-gray-400">
                          Đang tải sản phẩm...
                        </div>
                      ) : pickerTab === "LED" ? (
                        availableLedProducts.length === 0 ? (
                          <div className="py-4 text-center text-xs text-gray-400">
                            Không có thiết bị LED nào
                          </div>
                        ) : (
                          availableLedProducts.map((opt) => (
                            <div
                              key={`${opt.itemType}-${opt.targetId}`}
                              onClick={() => handleAddItem(opt)}
                              className="flex cursor-pointer items-center justify-between p-2 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <div className="text-left">
                                <p className="text-xs font-black text-gray-900">{opt.name}</p>
                                <p className="text-[10px] text-gray-500">
                                  {opt.subtitle ? `${opt.subtitle} • ` : ""}Đơn giá: {formatVnd(opt.price)}
                                </p>
                              </div>
                              <Plus size={14} className="text-emerald-700" />
                            </div>
                          ))
                        )
                      ) : availableCharacterProducts.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-400">
                          Không có nhân vật nào
                        </div>
                      ) : (
                        availableCharacterProducts.map((opt) => (
                          <div
                            key={`${opt.itemType}-${opt.targetId}`}
                            onClick={() => handleAddItem(opt)}
                            className="flex cursor-pointer items-center justify-between p-2 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <div className="text-left">
                              <p className="text-xs font-black text-gray-900">{opt.name}</p>
                              <p className="text-[10px] text-gray-500">
                                {opt.subtitle ? `${opt.subtitle} • ` : ""}Đơn giá: {formatVnd(opt.price)}
                              </p>
                            </div>
                            <Plus size={14} className="text-emerald-700" />
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
              <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-xs font-semibold text-gray-400">
                Chưa có thành phần nào. Bấm &quot;Thêm thành phần&quot; để đưa linh kiện vào gói combo.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                          it.itemType === "LED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {it.itemType === "LED" ? "Thiết bị LED" : "Hoạt ảnh"}
                      </span>
                      <div>
                        <p className="text-xs font-black text-gray-900">{it.name}</p>
                        <p className="text-[11px] text-gray-500">
                          Đơn giá: {formatVnd(it.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(it.id, -1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded-l"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-black">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(it.id, 1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded-r"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Line subtotal */}
                      <span className="w-24 text-right text-xs font-black text-gray-900">
                        {formatVnd(it.unitPrice * it.quantity)}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-gray-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Pricing & Discount Calculation */}
          <div className="rounded-xl border-2 border-[#10351f] bg-emerald-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
              <span className="text-xs font-bold text-gray-600">
                Tổng giá trị gốc của các thành phần:
              </span>
              <span className="text-sm font-black text-gray-800">
                {formatVnd(originalPrice)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700">
                  Giá bán ưu đãi của Combo (VND) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(Number(e.target.value))}
                  className={`mt-1 w-full rounded-lg border-2 px-3 py-2 text-sm font-black focus:outline-none ${
                    isPriceInvalid
                      ? "border-rose-500 bg-rose-50 text-rose-800"
                      : "border-gray-300 bg-white text-emerald-950 focus:border-[#3f9660]"
                  }`}
                />
              </div>

              <div className="text-right">
                {isPriceInvalid ? (
                  <p className="text-xs font-bold text-rose-600">
                    ⚠️ Giá gói combo không được vượt quá giá gốc ({formatVnd(originalPrice)})
                  </p>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-emerald-800">
                      Mức giảm giá cho khách hàng:
                    </span>
                    <div className="text-base font-black text-emerald-700">
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
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#d2e4d7] bg-[#f7fbf8] p-3 text-xs text-[#2e573c]">
            <div>
              <span className="block font-bold text-[#1f432b]">
                Mở bán ngay sau khi tạo
              </span>
              <span className="text-text-muted">
                Hệ thống tạo đồng thời Gói sản phẩm và Sản phẩm bày bán (mặc định ở trạng thái <strong>Chưa mở bán</strong>).
              </span>
            </div>
            <input
              type="checkbox"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="h-4 w-4 accent-[#439660]"
            />
          </label>
        </div>

        {/* Footer Action - Fixed & Pinned */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t-2 border-[#e3efe6] bg-gray-50/95 px-5 sm:px-6 py-3 sm:py-3.5">
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
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isPriceInvalid || items.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#10351f] bg-[#5fb97d] px-5 py-2 text-xs font-black text-white shadow-[2px_2px_0_#10351f] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Đang khởi tạo gói...
                </>
              ) : publishImmediately ? (
                <>
                  <Rocket size={14} />
                  Tạo gói &amp; Mở bán ngay
                </>
              ) : (
                <>
                  <Package size={14} />
                  Tạo gói sản phẩm
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

