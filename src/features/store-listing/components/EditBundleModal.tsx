"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import StoreModal from "./StoreModal";
import {
  apiUpdateBundle,
  fetchBundleSelectableItems,
  fetchManagedBundleDetail,
  normalizeBundleHttpUrl,
  type BundleConstituentItem,
  type BundleSelectableItem,
  type ManagedBundleDetail,
  type ManagedBundleItem,
} from "@/lib/api/bundles";
import { uploadMediaFile } from "@/lib/api/media";
import { formatVnd } from "../format";

interface EditBundleModalProps {
  bundle: ManagedBundleItem;
  onClose: () => void;
  onSuccess: (updated: ManagedBundleDetail) => void;
}

interface SelectedBundleItem {
  id: string;
  modelId?: number;
  versionId?: number;
  name: string;
  itemType: "LED" | "CHARACTER";
  unitPrice: number;
  quantity: number;
  previewUrl?: string;
}

export default function EditBundleModal({
  bundle,
  onClose,
  onSuccess,
}: EditBundleModalProps) {
  // Form states
  const [bundleName, setBundleName] = useState(bundle.bundleName);
  const [description, setDescription] = useState(bundle.description ?? "");
  const [bundlePrice, setBundlePrice] = useState<number>(bundle.bundlePrice);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [previewThumbUrl, setPreviewThumbUrl] = useState("");
  const [items, setItems] = useState<SelectedBundleItem[]>([]);

  // Async data states
  const [availableLedProducts, setAvailableLedProducts] = useState<BundleSelectableItem[]>([]);
  const [availableCharacterProducts, setAvailableCharacterProducts] = useState<BundleSelectableItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Item Picker
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"LED" | "CHARACTER">("LED");

  // Load initial detail and catalogs
  useEffect(() => {
    let active = true;

    async function loadData() {
      // 1. Fetch catalog products so item picker & existing items resolve exact modelId / versionId
      let leds: BundleSelectableItem[] = [];
      let chars: BundleSelectableItem[] = [];
      try {
        const selectable = await fetchBundleSelectableItems();
        if (!active) return;
        leds = selectable.ledOptions;
        chars = selectable.characterOptions;
        setAvailableLedProducts(leds);
        setAvailableCharacterProducts(chars);
      } catch (err) {
        console.warn("Failed to load store products for picker:", err);
      }

      // 2. Fetch bundle detail (try bundleId first, then productId)
      let detail: ManagedBundleDetail | null = null;
      try {
        detail = await fetchManagedBundleDetail(bundle.bundleId);
      } catch (err) {
        if (bundle.productId && bundle.productId !== bundle.bundleId) {
          try {
            detail = await fetchManagedBundleDetail(bundle.productId);
          } catch (fallbackErr) {
            console.warn("Failed to load bundle detail by productId fallback:", fallbackErr);
          }
        }
      }

      if (!active) return;

      if (detail) {
        setBundleName(detail.bundleName || bundle.bundleName);
        setDescription(detail.description ?? bundle.description ?? "");
        setBundlePrice(Number(detail.bundlePrice ?? bundle.bundlePrice));
        if (detail.thumbnailUrl) {
          setThumbnailUrl(detail.thumbnailUrl);
        }

        // Map initial constituent items
        const mappedItems: SelectedBundleItem[] = (detail.items ?? []).map((rawItem, idx) => {
          const isLed = rawItem.itemType === "LED" || rawItem.modelId != null;
          const foundOption = isLed
            ? leds.find((o) => o.targetId === rawItem.modelId)
            : chars.find((o) => o.targetId === rawItem.versionId);

          return {
            id: `init-${idx}-${Date.now()}`,
            modelId: rawItem.modelId ?? undefined,
            versionId: rawItem.versionId ?? undefined,
            name:
              foundOption?.name ??
              (isLed
                ? rawItem.modelName || `Tấm LED #${rawItem.modelId}`
                : rawItem.characterName || `Nhân vật #${rawItem.versionId}`),
            itemType: isLed ? "LED" : "CHARACTER",
            unitPrice:
              foundOption?.price ??
              (rawItem.unitPrice != null
                ? Number(rawItem.unitPrice)
                : detail!.originalPrice / Math.max(1, (detail!.items ?? []).length)),
            quantity: rawItem.quantity,
            previewUrl:
              foundOption?.previewUrl ??
              (isLed ? rawItem.thumbnailUrl : rawItem.previewGifUrl || rawItem.thumbnailUrl) ??
              undefined,
          };
        });

        setItems(mappedItems);
      } else {
        // Fallback to table row bundle data gracefully without blocking the modal
        setBundleName(bundle.bundleName);
        setDescription(bundle.description ?? "");
        setBundlePrice(Number(bundle.bundlePrice));
      }

      setIsLoadingInitial(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [bundle.bundleId, bundle.productId, bundle.bundleName, bundle.description, bundle.bundlePrice]);

  // Recalculate original price
  const originalPrice = useMemo(() => {
    if (items.length === 0) return bundle.originalPrice;
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items, bundle.originalPrice]);

  const isPriceInvalid = originalPrice > 0 && bundlePrice > originalPrice;
  const discountPercent =
    originalPrice > 0 && bundlePrice <= originalPrice
      ? Math.round((1 - bundlePrice / originalPrice) * 100)
      : 0;

  // Handle Thumbnail Upload via Media Service
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
      setErrorMessage(err?.message || "Tải ảnh đại diện thất bại.");
    } finally {
      setIsUploadingThumb(false);
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
    if (items.length === 0 && (!bundle.itemCount || bundle.itemCount === 0)) {
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
      const payloadItems: BundleConstituentItem[] | undefined =
        items.length > 0
          ? items.map((it) => ({
              modelId: it.itemType === "LED" ? it.modelId : null,
              versionId: it.itemType === "CHARACTER" ? it.versionId : null,
              quantity: it.quantity,
            }))
          : undefined;

      const updated = await apiUpdateBundle(bundle.bundleId, {
        bundleName: bundleName.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: normalizeBundleHttpUrl(thumbnailUrl),
        bundlePrice,
        items: payloadItems,
      });

      onSuccess(updated);
    } catch (err: any) {
      console.error("Update bundle failed:", err);
      const backendMsg =
        err?.response?.data?.message || err?.message || "Cập nhật gói combo thất bại.";
      setErrorMessage(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      title={`Chỉnh sửa Gói Combo #${bundle.bundleId}`}
      badge="CHỈNH SỬA GÓI SẢN PHẨM"
      description="Cập nhật thông tin, linh kiện cấu thành và giá ưu đãi khuyến mãi."
      icon={<Edit3 size={18} />}
      iconBoxClassName="bg-[#fef08a]"
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      footer={
        !isLoadingInitial ? (
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
              form="edit-bundle-form"
              disabled={isSubmitting || isPriceInvalid || (items.length === 0 && (!bundle.itemCount || bundle.itemCount === 0))}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Đang lưu thay đổi...
                </>
              ) : (
                <>
                  <Boxes size={14} aria-hidden="true" />
                  Cập nhật gói Combo
                </>
              )}
            </button>
          </>
        ) : undefined
      }
    >
      {isLoadingInitial ? (
        <div className="flex items-center justify-center py-20 text-xs font-bold text-text-muted">
          <Loader2 size={22} className="mr-2 animate-spin text-primary-ink" aria-hidden="true" />
          Đang tải dữ liệu gói combo...
        </div>
      ) : (
        <form id="edit-bundle-form" onSubmit={handleSubmit} className="space-y-5">
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
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-bold text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-black">
                Mô tả gói Combo
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-medium text-black focus:bg-white focus:shadow-[2px_2px_0_0_#000] focus:outline-2 focus:outline-offset-2 focus:outline-black"
              />
            </div>
          </div>

          {/* 2. Media Upload via Media Service */}
          <div className="space-y-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
            <h3 className="flex items-center gap-1.5 border-b-2 border-black pb-2 text-xs font-black uppercase tracking-wider text-black">
              <ImageIcon size={15} className="text-primary-ink" aria-hidden="true" /> Ảnh đại diện sản phẩm
            </h3>

            <div className="flex items-center gap-4">
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
                    {isUploadingThumb ? "Đang xử lý..." : "Thay đổi ảnh từ máy"}
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

          {/* 3. Constituent Items */}
          <div className="space-y-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                  <Sparkles size={15} className="text-primary-ink" aria-hidden="true" /> Thành phần trong gói Combo
                </h3>
                <p className="text-[11px] font-medium text-text-muted">
                  Bạn có thể cập nhật linh kiện hoặc thay đổi số lượng từng món
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
                      {pickerTab === "LED"
                        ? availableLedProducts.map((opt) => (
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
                        : availableCharacterProducts.map((opt) => (
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
                          ))}
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
        </form>
      )}
    </StoreModal>
  );
}

