"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Cpu,
  Image as ImageIcon,
  Loader2,
  Rocket,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import CategoryTagSelector from "./CategoryTagSelector";
import {
  apiCreateStoreProduct,
  apiUpdateProductStatus,
  fetchStoreTags,
} from "@/lib/api/products";
import { uploadMediaFile } from "@/lib/api/media";
import type { CreatedStoreProductResponse, TagItem } from "@/api_client";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import { saveCreatedStoreProduct } from "../services/store-listing.service";

interface CreateStoreProductModalProps {
  onClose: () => void;
  onSuccess: (created: CreatedStoreProductResponse) => void;
  onBackToTypeSelect?: () => void;
}

function normalizeAndValidateHttpUrl(
  raw: string,
  fieldLabel: string,
): { value?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const resolved =
    trimmed.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${trimmed}`
      : trimmed;

  if (resolved.length > 500) {
    return { error: `${fieldLabel} không được vượt quá 500 ký tự.` };
  }

  if (!/^https?:\/\/\S+$/i.test(resolved)) {
    return {
      error: `${fieldLabel} phải là đường dẫn HTTP/HTTPS hợp lệ và không chứa khoảng trắng (ví dụ: https://... hoặc /images/products/led/matrix-64.png).`,
    };
  }

  try {
    const parsed = new URL(resolved);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        error: `${fieldLabel} chỉ hỗ trợ giao thức http:// hoặc https://.`,
      };
    }
  } catch {
    return { error: `${fieldLabel} không đúng định dạng URL.` };
  }

  return { value: resolved };
}

function formatCreateProductError(err: any): string {
  const status: number | undefined = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.body;
  const serverMessage =
    data && typeof data === "object" && typeof data.message === "string"
      ? data.message
      : null;
  const details: Array<{ field?: string; message?: string }> = Array.isArray(
    data?.details,
  )
    ? data.details
    : [];

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn hoặc thiếu xác thực (401). Vui lòng đăng nhập lại.";
  }
  if (status === 403) {
    return "Bạn không có quyền tạo sản phẩm Cửa hàng. Chức năng này chỉ dành cho Quản lý hoặc Quản trị viên (403).";
  }
  if (status === 404) {
    return serverMessage
      ? `Không tìm thấy dữ liệu liên kết (404): ${serverMessage}`
      : "Không tìm thấy Thẻ phân loại đã chọn trên hệ thống (404).";
  }
  if (status === 409) {
    return serverMessage
      ? `Xung đột dữ liệu (409): ${serverMessage}`
      : "Mẫu LED này đã tồn tại hoặc xung đột trên hệ thống (409).";
  }
  if (status === 400) {
    if (details.length > 0) {
      const detailText = details
        .map((item) =>
          item.field
            ? `${item.field}: ${item.message ?? "không hợp lệ"}`
            : item.message,
        )
        .filter(Boolean)
        .join("; ");
      return `Dữ liệu không hợp lệ (400): ${detailText || serverMessage || "Vui lòng kiểm tra lại các trường nhập."}`;
    }
    if (serverMessage) {
      return `Dữ liệu không hợp lệ (400): ${serverMessage}`;
    }
  }

  return (
    serverMessage ||
    err?.message ||
    "Tạo mẫu LED và sản phẩm thất bại. Vui lòng kiểm tra lại thông tin."
  );
}

export default function CreateStoreProductModal({
  onClose,
  onSuccess,
  onBackToTypeSelect,
}: CreateStoreProductModalProps) {
  // Thông tin Sản phẩm (Product)
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState<string>("1490000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrlsText, setGalleryUrlsText] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Thông tin Phần cứng Mẫu LED (bắt buộc để tạo đồng thời LedModel + Product)
  const [modelName, setModelName] = useState("");
  const [stockQuantity, setStockQuantity] = useState<string>("50");
  const [widthPx, setWidthPx] = useState<string>("64");
  const [heightPx, setHeightPx] = useState<string>("64");
  const [connectivity, setConnectivity] = useState("Wi-Fi + BLE");
  const [voltage, setVoltage] = useState("5V USB-C");
  const [specNote, setSpecNote] = useState("RGB HUB75 ESP32-S3");

  // Media upload
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>("");

  // Tags
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

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
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
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
      const res = await uploadMediaFile(file, "PRODUCT_LED");
      setThumbnailUrl(res.publicUrl);
      setThumbnailPreviewUrl(res.localPreviewUrl || res.publicUrl);
    } catch (err: any) {
      setError(err?.message || "Không thể tải ảnh đại diện lên. Vui lòng thử lại.");
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
        const res = await uploadMediaFile(file, "PRODUCT_LED");
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
      setError(err?.message || "Không thể tải thư viện ảnh lên. Vui lòng thử lại.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên sản phẩm mẫu LED.");
      return;
    }
    if (trimmedName.length > 255) {
      setError("Tên sản phẩm không được vượt quá 255 ký tự.");
      return;
    }

    const resolvedModelName = modelName.trim() || trimmedName;
    if (resolvedModelName.length > 255) {
      setError("Tên mẫu LED không được vượt quá 255 ký tự.");
      return;
    }

    const priceNum = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Giá bán phải là số lớn hơn hoặc bằng 0 VNĐ.");
      return;
    }

    const parsedWidth = Number(widthPx);
    const parsedHeight = Number(heightPx);
    if (
      !Number.isInteger(parsedWidth) ||
      parsedWidth <= 0 ||
      !Number.isInteger(parsedHeight) ||
      parsedHeight <= 0
    ) {
      setError("Kích thước ma trận (Rộng, Cao) phải là số nguyên lớn hơn 0.");
      return;
    }

    const stockNum = Number(stockQuantity);
    if (
      stockQuantity.trim() === "" ||
      !Number.isInteger(stockNum) ||
      stockNum < 0
    ) {
      setError("Tồn kho ban đầu phải là số nguyên lớn hơn hoặc bằng 0.");
      return;
    }

    const thumbCheck = normalizeAndValidateHttpUrl(
      thumbnailUrl,
      "Đường dẫn ảnh đại diện",
    );
    if (thumbCheck.error) {
      setError(thumbCheck.error);
      return;
    }

    const rawGalleryUrls = galleryUrlsText
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    const galleryUrls: string[] = [];
    for (let i = 0; i < rawGalleryUrls.length; i += 1) {
      const check = normalizeAndValidateHttpUrl(
        rawGalleryUrls[i],
        `Ảnh thư viện #${i + 1}`,
      );
      if (check.error) {
        setError(check.error);
        return;
      }
      if (check.value) galleryUrls.push(check.value);
    }

    const attributes: Array<{ label: string; value: string }> = [];
    if (connectivity.trim()) {
      attributes.push({ label: "Kết nối", value: connectivity.trim() });
    }
    if (voltage.trim()) {
      attributes.push({ label: "Nguồn điện", value: voltage.trim() });
    }
    if (specNote.trim()) {
      attributes.push({ label: "Thông số khác", value: specNote.trim() });
    }

    const specPayload: Record<string, unknown> = {
      widthPx: parsedWidth,
      heightPx: parsedHeight,
      resolution: `${parsedWidth}x${parsedHeight}`,
      attributes,
    };
    if (connectivity.trim()) specPayload.connectivity = connectivity.trim();
    if (voltage.trim()) specPayload.voltage = voltage.trim();
    if (specNote.trim()) specPayload.note = specNote.trim();

    const payload: CreateStoreProductRequest = {
      productName: trimmedName,
      productType: CreateStoreProductRequest.productType.LED,
      basePrice: priceNum,
      description: description.trim() || undefined,
      thumbnailUrl: thumbCheck.value,
      galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      ledDetails: {
        modelName: resolvedModelName,
        spec: specPayload,
        stockQuantity: stockNum,
      },
    };

    setIsSubmitting(true);
    try {
      let created = await apiCreateStoreProduct(payload);
      if (publishImmediately && created.productId) {
        try {
          await apiUpdateProductStatus(created.productId, "PUBLISHED");
          created = {
            ...created,
            status: "PUBLISHED" as CreatedStoreProductResponse["status"],
          };
        } catch {
          // Product remains UNPUBLISHED if publish call fails
        }
      }
      saveCreatedStoreProduct(created);
      onSuccess(created);
      onClose();
    } catch (err) {
      setError(formatCreateProductError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo Mẫu LED & Sản phẩm bày bán"
      description="Tạo đồng thời mẫu phần cứng LED trong kho và sản phẩm bày bán tương ứng trên Cửa hàng."
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
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold hover:bg-[#eef8f0] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploadingThumbnail || isUploadingGallery}
            className="inline-flex items-center gap-2 rounded-lg border border-[#3b8555] bg-[#439660] px-5 py-2 text-sm font-black text-white shadow-xs hover:bg-[#387e51] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang tạo...
              </>
            ) : publishImmediately ? (
              <>
                <Rocket size={15} />
                Tạo &amp; Mở bán ngay
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Tạo mẫu LED &amp; Sản phẩm
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Thông tin Sản phẩm */}
        <div className="space-y-3 rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1f432b]">
            <Sparkles size={14} className="text-[#2d6a4f]" />
            1. Thông tin sản phẩm trên Cửa hàng
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Tên sản phẩm bày bán <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ví dụ: Bảng LED Ma Trận Pro 64×64"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#439660]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Giá bán (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="1000"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="1490000"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#439660]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#1f432b]">
              Mô tả chi tiết sản phẩm
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tính năng, độ sáng, phụ kiện đi kèm, cách lắp đặt..."
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Thông tin Phần cứng Mẫu LED (bắt buộc) */}
        <div className="space-y-3 rounded-xl border border-[#dbece0] bg-[#f9fdfa] p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1f432b]">
              <Cpu size={14} className="text-[#2d6a4f]" />
              2. Thông số Mẫu LED &amp; Tồn kho ban đầu
            </h4>
            <span className="rounded-md bg-[#eaf7ee] px-2 py-0.5 text-[11px] font-bold text-[#1c4b2b]">
              Tự động đồng bộ vào Kho LED
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Tên mẫu LED trong kho
              </label>
              <input
                type="text"
                maxLength={255}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Để trống sẽ dùng tên sản phẩm"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Tồn kho ban đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="1"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Rộng (px) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                step="1"
                required
                value={widthPx}
                onChange={(e) => setWidthPx(e.target.value)}
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Cao (px) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                step="1"
                required
                value={heightPx}
                onChange={(e) => setHeightPx(e.target.value)}
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Kết nối
              </label>
              <input
                type="text"
                value={connectivity}
                onChange={(e) => setConnectivity(e.target.value)}
                placeholder="Wi-Fi + BLE"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#1f432b]">
                Nguồn điện
              </label>
              <input
                type="text"
                value={voltage}
                onChange={(e) => setVoltage(e.target.value)}
                placeholder="5V USB-C"
                className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#1f432b]">
              Ghi chú thông số bổ sung
            </label>
            <input
              type="text"
              value={specNote}
              onChange={(e) => setSpecNote(e.target.value)}
              placeholder="Ví dụ: RGB HUB75 ESP32-S3, khung nhôm chống nước"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-xs outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Ảnh đại diện & Thư viện ảnh */}
        <div className="space-y-4 rounded-xl border border-[#d8e6dc] bg-[#f9fdfa] p-4">
          <div className="flex items-center justify-between border-b border-[#e5efe7] pb-2">
            <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1f432b]">
              <ImageIcon size={15} /> 3. Hình ảnh sản phẩm (Ảnh đại diện &amp; Thư viện ảnh)
            </h4>
            <span className="text-[11px] text-[#558363]">Hỗ trợ PNG, JPG, WEBP, GIF</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ảnh đại diện */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#e0ede3] bg-white p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f432b]">
                  Ảnh đại diện
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
                <div className="relative mt-1 flex items-center gap-3 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] p-2">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#cbe4d2] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailPreviewUrl || thumbnailUrl}
                      alt="Ảnh đại diện xem trước"
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
                <span className="text-[11px] text-text-muted">
                  Hoặc dán URL / đường dẫn ảnh (vd: /images/products/led/matrix-64.png):
                </span>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailUrl(e.target.value);
                    setThumbnailPreviewUrl(e.target.value);
                  }}
                  placeholder="/images/products/led/matrix-64.png"
                  className="mt-1 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
            </div>

            {/* Thư viện ảnh */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#e0ede3] bg-white p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1f432b]">
                  Thư viện ảnh
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Ảnh thư viện ${idx + 1}`}
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
                <span className="text-[11px] text-text-muted">
                  Hoặc dán danh sách URL (mỗi dòng 1 đường dẫn):
                </span>
                <textarea
                  rows={2}
                  value={galleryUrlsText}
                  onChange={(e) => setGalleryUrlsText(e.target.value)}
                  placeholder="/images/products/led/matrix-32.png&#10;/images/products/led/matrix-64.png"
                  className="mt-1 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ phân loại */}
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
              Mặc định sản phẩm tạo mới ở trạng thái <strong>Chưa mở bán</strong> để kiểm tra trước khi đăng lên Cửa hàng.
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
