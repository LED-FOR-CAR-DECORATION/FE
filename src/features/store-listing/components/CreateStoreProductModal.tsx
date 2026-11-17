"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Cpu, Loader2, Tag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { apiCreateStoreProduct, fetchStoreTags } from "@/lib/api/products";
import type { CreatedStoreProductResponse, TagItem } from "@/api_client";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import { saveCreatedStoreProduct } from "../services/store-listing.service";

interface CreateStoreProductModalProps {
  onClose: () => void;
  onSuccess: (created: CreatedStoreProductResponse) => void;
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
      error: `${fieldLabel} phải là đường dẫn HTTP/HTTPS hợp lệ và không chứa khoảng trắng (ví dụ: https://... hoặc /images/...).`,
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
    return "Bạn không có quyền tạo sản phẩm Store. Chức năng này chỉ dành cho MANAGER hoặc ADMIN (403).";
  }
  if (status === 404) {
    return serverMessage
      ? `Không tìm thấy dữ liệu liên kết (404): ${serverMessage}`
      : "Không tìm thấy Tag hoặc Character Version được chọn trên hệ thống (404).";
  }
  if (status === 409) {
    return serverMessage
      ? `Xung đột liên kết (409): ${serverMessage}`
      : "Character Version này đã được liên kết với một sản phẩm khác trên Store (409).";
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
    "Tạo sản phẩm thất bại. Vui lòng kiểm tra lại thông tin."
  );
}

export default function CreateStoreProductModal({
  onClose,
  onSuccess,
}: CreateStoreProductModalProps) {
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState<string>("1490000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrlsText, setGalleryUrlsText] = useState("");

  // Optional 1-1 LED_MODEL initialization (AC02)
  const [includeLedDetails, setIncludeLedDetails] = useState(true);
  const [modelName, setModelName] = useState("");
  const [widthPx, setWidthPx] = useState<string>("64");
  const [heightPx, setHeightPx] = useState<string>("64");
  const [connectivity, setConnectivity] = useState("Wi-Fi + BLE");
  const [voltage, setVoltage] = useState("5V USB-C");
  const [specNote, setSpecNote] = useState("RGB HUB75 ESP32-S3");
  const [stockQuantity, setStockQuantity] = useState<string>("50");

  // Tags (AC03)
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [manualTagIdsText, setManualTagIdsText] = useState("");

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

  const toggleTag = (tagId?: number) => {
    if (!tagId) return;
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
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
    if (trimmedName.length > 255) {
      setError("Tên sản phẩm không được vượt quá 255 ký tự.");
      return;
    }

    const priceNum = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Giá bán cơ bản phải là số lớn hơn hoặc bằng 0 đ.");
      return;
    }

    // Validate Thumbnail URL
    const thumbCheck = normalizeAndValidateHttpUrl(
      thumbnailUrl,
      "Thumbnail URL",
    );
    if (thumbCheck.error) {
      setError(thumbCheck.error);
      return;
    }

    // Validate Gallery URLs
    const rawGalleryUrls = galleryUrlsText
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    const galleryUrls: string[] = [];
    for (let i = 0; i < rawGalleryUrls.length; i += 1) {
      const check = normalizeAndValidateHttpUrl(
        rawGalleryUrls[i],
        `Gallery URL #${i + 1}`,
      );
      if (check.error) {
        setError(check.error);
        return;
      }
      if (check.value) galleryUrls.push(check.value);
    }

    // Parse manual + selected tag IDs (AC03)
    const manualTagTokens = manualTagIdsText
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    const parsedManualTagIds: number[] = [];
    for (const token of manualTagTokens) {
      const parsed = Number(token);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setError(`Tag ID "${token}" không hợp lệ (phải là số nguyên dương).`);
        return;
      }
      parsedManualTagIds.push(parsed);
    }
    const combinedTagIds = Array.from(
      new Set([...selectedTagIds, ...parsedManualTagIds]),
    );

    const payload: CreateStoreProductRequest = {
      productName: trimmedName,
      productType: CreateStoreProductRequest.productType.LED,
      basePrice: priceNum,
      description: description.trim() || undefined,
      thumbnailUrl: thumbCheck.value,
      galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
      tagIds: combinedTagIds.length > 0 ? combinedTagIds : undefined,
    };

    if (includeLedDetails) {
      const resolvedModelName = modelName.trim() || trimmedName;
      if (resolvedModelName.length > 255) {
        setError("Tên Model LED không được vượt quá 255 ký tự.");
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
        setError("Kích thước ma trận (widthPx, heightPx) phải là số nguyên > 0.");
        return;
      }

      const stockNum = Number(stockQuantity);
      if (
        stockQuantity.trim() === "" ||
        !Number.isInteger(stockNum) ||
        stockNum < 0
      ) {
        setError("Tồn kho ban đầu phải là số nguyên >= 0.");
        return;
      }

      const specPayload: Record<string, unknown> = {
        widthPx: parsedWidth,
        heightPx: parsedHeight,
        resolution: `${parsedWidth}x${parsedHeight}`,
      };
      if (connectivity.trim()) specPayload.connectivity = connectivity.trim();
      if (voltage.trim()) specPayload.voltage = voltage.trim();
      if (specNote.trim()) specPayload.note = specNote.trim();

      payload.ledDetails = {
        modelName: resolvedModelName,
        spec: specPayload,
        stockQuantity: stockNum,
      };
    }

    setIsSubmitting(true);
    try {
      const created = await apiCreateStoreProduct(payload);
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
      title="Tạo sản phẩm LED bày bán (Store Product)"
      description="Dành cho Manager: Điều chỉnh trạng thái của Character trên Store"
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
            Tạo sản phẩm LED
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

        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#d2e4d7] bg-[#f7fbf8] p-3 text-xs text-[#2e573c]">
          <div>
            <span className="font-bold">Quy tắc AC04:</span> Trạng thái khởi tạo
            mặc định luôn là{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
              UNPUBLISHED
            </span>
            . Sau khi tạo xong, sản phẩm sẽ hiển thị trong danh sách để kiểm tra và bấm Publish.
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#439660] bg-[#eaf7ee] px-2.5 py-1.5 font-bold text-[#1c4b2b]">
            <Cpu size={14} />
            LED (Vật lý)
          </span>
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
              maxLength={255}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ví dụ: Lumintra Matrix Pro 64x64"
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
              step="1"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="1490000"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* Trường riêng LED_MODEL */}
        <div className="flex flex-col gap-3 rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <span className="block font-bold text-[#1f432b]">
                Khởi tạo ngay mẫu phần cứng LED_MODEL 1–1 (ledDetails)
              </span>
              <span className="text-xs text-text-muted">
                Tắt tùy chọn này nếu chỉ muốn tạo bản ghi PRODUCT và gắn
                LED_MODEL sau.
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeLedDetails}
              onChange={(e) => setIncludeLedDetails(e.target.checked)}
              className="h-4 w-4 accent-[#439660]"
            />
          </label>

          {includeLedDetails && (
            <div className="flex flex-col gap-2 border-t border-[#e3efe6] pt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Tên Model LED
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="Để trống sẽ dùng tên sản phẩm"
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Tồn kho ban đầu *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Rộng (widthPx) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={widthPx}
                    onChange={(e) => setWidthPx(e.target.value)}
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Cao (heightPx) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={heightPx}
                    onChange={(e) => setHeightPx(e.target.value)}
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Kết nối
                  </label>
                  <input
                    type="text"
                    value={connectivity}
                    onChange={(e) => setConnectivity(e.target.value)}
                    placeholder="Wi-Fi + BLE"
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted">
                    Nguồn điện
                  </label>
                  <input
                    type="text"
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                    placeholder="5V USB-C"
                    className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted">
                  Ghi chú thông số bổ sung
                </label>
                <input
                  type="text"
                  value={specNote}
                  onChange={(e) => setSpecNote(e.target.value)}
                  placeholder="Ví dụ: RGB HUB75 ESP32-S3"
                  className="w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">
            Mô tả chi tiết
          </label>
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
            <label className="mb-1 block font-bold text-[#1f432b]">
              Thumbnail URL (HTTP/HTTPS)
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://cdn.lumintra.com/products/matrix.png"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Gallery URLs (cách nhau dấu phẩy hoặc dòng)
            </label>
            <input
              type="text"
              value={galleryUrlsText}
              onChange={(e) => setGalleryUrlsText(e.target.value)}
              placeholder="https://.../img1.png, https://.../img2.png"
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
        </div>

        {/* AC03: Category Tags */}
        <div className="rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
          <label className="mb-1.5 flex items-center gap-1 font-bold text-[#1f432b]">
            <Tag size={14} /> Thẻ phân loại (Category Tags - AC03)
          </label>
          {isLoadingTags ? (
            <p className="text-xs text-text-muted">Đang tải danh sách thẻ...</p>
          ) : availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId ?? -1);
                return (
                  <button
                    key={tag.tagId}
                    type="button"
                    onClick={() => toggleTag(tag.tagId)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${isSelected
                      ? "border-[#439660] bg-[#eaf7ee] text-[#1c4b2b]"
                      : "border-[#d8e6dc] bg-white text-text-muted hover:bg-neutral-50"
                      }`}
                  >
                    {isSelected && <Check size={12} />}
                    {tag.name} (#{tag.tagId})
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Chưa tải được thẻ có sẵn từ hệ thống. Bạn có thể nhập thủ công ID
              thẻ bên dưới.
            </p>
          )}

          <div className="mt-2.5">
            <label className="text-xs font-semibold text-text-muted">
              Nhập thêm Tag ID thủ công (nếu cần, cách nhau dấu phẩy)
            </label>
            <input
              type="text"
              value={manualTagIdsText}
              onChange={(e) => setManualTagIdsText(e.target.value)}
              placeholder="Ví dụ: 1, 2"
              className="mt-1 w-full rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660]"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
