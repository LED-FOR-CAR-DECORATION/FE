"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Cpu,
  Image as ImageIcon,
  Info,
  Loader2,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import CategoryTagSelector from "@/features/store-listing/components/CategoryTagSelector";
import {
  getCreatedStoreProducts,
  saveCreatedStoreProduct,
} from "@/features/store-listing/services/store-listing.service";
import {
  apiCreateLedModel,
  apiUpdateLedModelWithProduct,
  formatLedModelError,
  type LedSpecAttributeInput,
  type ManagedLedModelItem,
} from "@/lib/api/ledModels";
import {
  apiCreateStoreProduct,
  apiUpdateProductStatus,
  fetchManagedStoreProducts,
  fetchStoreProductDetail,
  fetchStoreTags,
} from "@/lib/api/products";
import { uploadMediaFile } from "@/lib/api/media";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import type {
  CreatedStoreProductResponse,
  TagItem,
  UpdateStoreProductRequest,
} from "@/api_client";
import LedSpecAttributesEditor from "./LedSpecAttributesEditor";

interface LedModelFormModalProps {
  mode: "create" | "edit";
  initialModel?: ManagedLedModelItem | null;
  onClose: () => void;
  onSuccess: (
    saved: ManagedLedModelItem,
    meta?: { linkedProductId?: number; productError?: string },
  ) => void;
}

const DEFAULT_CREATE_ATTRIBUTES: LedSpecAttributeInput[] = [
  { label: "Điện áp", value: "5V USB-C" },
  { label: "Kết nối", value: "Wi-Fi 2.4GHz + BLE 5.0" },
];

function normalizeOptionalHttpUrl(
  raw: string,
  fieldLabel: string,
): { value?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const resolved =
    trimmed.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${trimmed}`
      : trimmed;

  if (resolved.length > 500 || !/^https?:\/\/\S+$/i.test(resolved)) {
    return {
      error: `${fieldLabel} phải là URL http://, https:// hoặc /images/... hợp lệ (tối đa 500 ký tự).`,
    };
  }
  return { value: resolved };
}

export default function LedModelFormModal({
  mode,
  initialModel,
  onClose,
  onSuccess,
}: LedModelFormModalProps) {
  const isEdit = mode === "edit" && Boolean(initialModel);
  const linkedProductId = initialModel?.productId ?? null;

  const [mounted, setMounted] = useState(false);

  // LED Model fields (DEV-02 / DEV-03)
  const [modelName, setModelName] = useState(initialModel?.modelName ?? "");
  const resolvedStockQuantity = isEdit ? (initialModel?.stockQuantity ?? 0) : 0;
  const [widthPx, setWidthPx] = useState(
    String(initialModel?.spec?.widthPx ?? 64),
  );
  const [heightPx, setHeightPx] = useState(
    String(initialModel?.spec?.heightPx ?? 64),
  );
  const [attributes, setAttributes] = useState<LedSpecAttributeInput[]>(() => {
    if (isEdit && Array.isArray(initialModel?.spec?.attributes)) {
      return initialModel.spec.attributes.map((a) => ({
        label: a.label ?? "",
        value: a.value ?? "",
      }));
    }
    return isEdit ? [] : DEFAULT_CREATE_ATTRIBUTES;
  });

  // Linked Store Product fields (Create: tạo kèm SP; Edit: đồng bộ SP khi productId != null)
  const [syncStoreProduct, setSyncStoreProduct] = useState(!isEdit);
  const [isHydratingProduct, setIsHydratingProduct] = useState(
    isEdit && linkedProductId != null,
  );
  const [productHydrated, setProductHydrated] = useState(false);

  const [productName, setProductName] = useState(initialModel?.modelName ?? "");
  const [productNameCustomized, setProductNameCustomized] = useState(false);
  const [basePrice, setBasePrice] = useState("1490000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrlsText, setGalleryUrlsText] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagsInitialized, setTagsInitialized] = useState(!isEdit);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
    isSubmittingRef.current = isSubmitting;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Hydrate existing Store Product when editing a linked LED model
  useEffect(() => {
    if (!isEdit || linkedProductId == null) return;
    let active = true;
    setIsHydratingProduct(true);

    Promise.all([
      fetchManagedStoreProducts({ productType: "LED", size: 200 })
        .then((res) => res.items.find((item) => Number(item.productId) === Number(linkedProductId)) ?? null)
        .catch(() => null),
      fetchStoreProductDetail(linkedProductId).catch(() => null),
      fetchStoreTags().catch(() => [] as TagItem[]),
    ])
      .then(([managedItem, detail, tags]) => {
        if (!active) return;
        setAvailableTags(tags);

        const applyTagSelection = (rawTags: Array<string | TagItem> | undefined) => {
          if (rawTags && rawTags.length > 0) {
            const matchedIds = rawTags
              .map((t) => {
                if (typeof t === "object" && t?.tagId) return t.tagId;
                const tagName = typeof t === "string" ? t : t?.name;
                return tags.find((avail) => avail.name === tagName)?.tagId;
              })
              .filter((id): id is number => typeof id === "number");
            setSelectedTagIds(matchedIds);
          } else {
            setSelectedTagIds([]);
          }
          setTagsInitialized(true);
        };

        if (managedItem) {
          setProductName(managedItem.productName || initialModel?.modelName || "");
          setProductNameCustomized(false);
          setBasePrice(String(managedItem.basePrice ?? 0));
          setDescription(managedItem.description ?? "");
          setThumbnailUrl(managedItem.thumbnailUrl ?? "");
          setGalleryUrlsText((managedItem.galleryUrls ?? []).join("\n"));
          applyTagSelection(managedItem.tags);
          setProductHydrated(true);
          setSyncStoreProduct(true);
          return;
        }

        if (detail) {
          setProductName(detail.name || initialModel?.modelName || "");
          setProductNameCustomized(false);
          setBasePrice(String(detail.price ?? 0));
          setDescription(detail.description ?? "");
          setThumbnailUrl(detail.previewUrl ?? "");
          setGalleryUrlsText((detail.galleryUrls ?? []).join("\n"));
          applyTagSelection(detail.tags);
          setProductHydrated(true);
          setSyncStoreProduct(true);
          return;
        }

        // Fallback to locally cached created product
        const cached = getCreatedStoreProducts().find(
          (item) => Number(item.productId) === Number(linkedProductId),
        );
        if (cached) {
          setProductName(cached.productName ?? initialModel?.modelName ?? "");
          setProductNameCustomized(false);
          setBasePrice(String(cached.basePrice ?? 0));
          setDescription(cached.description ?? "");
          setThumbnailUrl(cached.thumbnailUrl ?? "");
          setGalleryUrlsText((cached.galleryUrls ?? []).join("\n"));
          if (Array.isArray(cached.tagIds)) {
            setSelectedTagIds(cached.tagIds);
            setTagsInitialized(true);
          }
          setProductHydrated(true);
          setSyncStoreProduct(true);
        } else {
          setProductName(initialModel?.modelName ?? "");
          setProductNameCustomized(false);
          setProductHydrated(false);
          setSyncStoreProduct(false);
        }
      })
      .finally(() => {
        if (active) setIsHydratingProduct(false);
      });

    return () => {
      active = false;
    };
  }, [isEdit, linkedProductId, initialModel?.modelName]);

  // Load tags for Create mode when syncStoreProduct is active
  useEffect(() => {
    if (isEdit || !syncStoreProduct || availableTags.length > 0) return;
    let active = true;
    setIsLoadingTags(true);
    fetchStoreTags()
      .then((tags) => {
        if (active) setAvailableTags(tags);
      })
      .finally(() => {
        if (active) setIsLoadingTags(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, syncStoreProduct, availableTags.length]);

  const handleModelNameChange = (value: string) => {
    setModelName(value);
    if (!productNameCustomized) {
      setProductName(value);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumb(true);
    setError(null);
    try {
      const res = await uploadMediaFile(file, "PRODUCT_LED");
      setThumbnailUrl(res.publicUrl);
    } catch (err: any) {
      setError(err?.message || "Không thể tải ảnh đại diện lên.");
    } finally {
      setIsUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingGallery(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const res = await uploadMediaFile(file, "PRODUCT_LED");
        if (res.publicUrl) uploaded.push(res.publicUrl);
      }
      setGalleryUrlsText((prev) => {
        const existing = prev.trim();
        const joined = uploaded.join("\n");
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedModelName = modelName.trim();
    if (!trimmedModelName) {
      setError("Vui lòng nhập tên mẫu LED.");
      return;
    }
    if (trimmedModelName.length > 255) {
      setError("Tên mẫu LED không được vượt quá 255 ký tự.");
      return;
    }

    const parsedStock = resolvedStockQuantity;

    const parsedWidth = Number(widthPx);
    const parsedHeight = Number(heightPx);
    if (
      !Number.isInteger(parsedWidth) ||
      parsedWidth <= 0 ||
      !Number.isInteger(parsedHeight) ||
      parsedHeight <= 0
    ) {
      setError("Kích thước ma trận (Rộng, Cao) phải là số nguyên dương lớn hơn 0.");
      return;
    }

    const cleanedAttributes: LedSpecAttributeInput[] = [];
    for (let i = 0; i < attributes.length; i += 1) {
      const label = attributes[i].label.trim();
      const value = attributes[i].value.trim();
      if (!label && !value) continue;
      if (!label) {
        setError(`Thông số dòng #${i + 1} chưa có tên thông số.`);
        return;
      }
      if (label.length > 100) {
        setError(`Tên thông số dòng #${i + 1} tối đa 100 ký tự.`);
        return;
      }
      if (value.length > 500) {
        setError(`Giá trị thông số dòng #${i + 1} tối đa 500 ký tự.`);
        return;
      }
      cleanedAttributes.push({ label, value });
    }

    const shouldSyncProduct =
      (!isEdit && syncStoreProduct) ||
      (isEdit && linkedProductId != null && syncStoreProduct);

    let resolvedProductName = trimmedModelName;
    let resolvedPrice = 0;
    let resolvedThumb: string | undefined;
    const resolvedGallery: string[] = [];

    if (shouldSyncProduct) {
      resolvedProductName = productName.trim() || trimmedModelName;
      if (resolvedProductName.length > 255) {
        setError("Tên sản phẩm bày bán không được vượt quá 255 ký tự.");
        return;
      }
      resolvedPrice = Number(basePrice);
      if (basePrice.trim() === "" || !Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
        setError("Giá bán sản phẩm trên Cửa hàng phải là số lớn hơn hoặc bằng 0 VNĐ.");
        return;
      }
      const thumbCheck = normalizeOptionalHttpUrl(thumbnailUrl, "Ảnh đại diện");
      if (thumbCheck.error) {
        setError(thumbCheck.error);
        return;
      }
      resolvedThumb = thumbCheck.value;

      const rawGallery = galleryUrlsText
        .split(/[\n,]/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      for (let i = 0; i < rawGallery.length; i += 1) {
        const gCheck = normalizeOptionalHttpUrl(rawGallery[i], `Ảnh thư viện #${i + 1}`);
        if (gCheck.error) {
          setError(gCheck.error);
          return;
        }
        if (gCheck.value) resolvedGallery.push(gCheck.value);
      }
    }

    setIsSubmitting(true);
    try {
      const specPayload = {
        widthPx: parsedWidth,
        heightPx: parsedHeight,
        attributes: cleanedAttributes,
      };

      if (isEdit && initialModel) {
        const productUpdatePayload: UpdateStoreProductRequest | undefined =
          shouldSyncProduct
            ? {
                productName: resolvedProductName,
                basePrice: resolvedPrice,
                description: description.trim() || undefined,
                thumbnailUrl: resolvedThumb,
                galleryUrls: resolvedGallery,
                tagIds: tagsInitialized ? selectedTagIds : undefined,
              }
            : undefined;

        // DEV-03 + PUT /api/management/admin/store/products/{productId}
        const result = await apiUpdateLedModelWithProduct(
          initialModel.modelId,
          {
            modelName: trimmedModelName,
            stockQuantity: parsedStock,
            spec: specPayload,
          },
          productUpdatePayload && linkedProductId != null
            ? { productId: linkedProductId, payload: productUpdatePayload }
            : undefined,
        );

        if (result.product) {
          saveCreatedStoreProduct({
            productId: result.product.productId,
            productName: result.product.productName,
            productType: result.product
              .productType as CreatedStoreProductResponse["productType"],
            basePrice: result.product.basePrice,
            description: result.product.description,
            thumbnailUrl: result.product.thumbnailUrl,
            galleryUrls: result.product.galleryUrls,
            status: result.product.status as CreatedStoreProductResponse["status"],
            tagIds: result.product.tagIds,
          });
        }

        onSuccess(result.model, {
          linkedProductId: result.product?.productId,
          productError: result.productSyncError,
        });
        onClose();
        return;
      }

      // DEV-02: POST /api/management/admin/led-models
      const createdModel = await apiCreateLedModel({
        modelName: trimmedModelName,
        stockQuantity: parsedStock,
        spec: specPayload,
      });

      if (!shouldSyncProduct) {
        onSuccess(createdModel);
        onClose();
        return;
      }

      try {
        let createdProduct = await apiCreateStoreProduct({
          productName: resolvedProductName,
          productType: CreateStoreProductRequest.productType.LED,
          basePrice: resolvedPrice,
          description: description.trim() || undefined,
          thumbnailUrl: resolvedThumb,
          galleryUrls: resolvedGallery.length > 0 ? resolvedGallery : undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          ledModelId: createdModel.modelId,
        });
        if (publishImmediately && createdProduct.productId) {
          try {
            await apiUpdateProductStatus(createdProduct.productId, "PUBLISHED");
            createdProduct = {
              ...createdProduct,
              status: "PUBLISHED" as typeof createdProduct.status,
            };
          } catch {
            // Keep UNPUBLISHED if publish call fails
          }
        }
        saveCreatedStoreProduct(createdProduct);
        onSuccess(
          { ...createdModel, productId: createdProduct.productId ?? createdModel.productId },
          { linkedProductId: createdProduct.productId },
        );
        onClose();
      } catch (productErr) {
        onSuccess(createdModel, {
          productError: formatLedModelError(
            productErr,
            "Đã tạo mẫu LED trong kho nhưng chưa tạo được sản phẩm Cửa hàng đi kèm.",
          ),
        });
        onClose();
      }
    } catch (err) {
      setError(
        formatLedModelError(
          err,
          isEdit
            ? "Cập nhật mẫu LED thất bại. Vui lòng thử lại."
            : "Tạo mới mẫu LED thất bại. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showProductSection = !isEdit || linkedProductId != null;

  const modalTitle = isEdit
    ? `Cập nhật mẫu LED #${initialModel?.modelId}`
    : "Thêm mẫu LED mới";
  const modalDescription = isEdit
    ? linkedProductId != null
      ? `Chỉnh sửa thông tin Mẫu LED và đồng bộ trực tiếp sang sản phẩm Cửa hàng #${linkedProductId}.`
      : "Chỉnh sửa tên mẫu LED, tồn kho và danh sách thông số kỹ thuật."
    : "Đăng ký mẫu phần cứng LED mới vào kho và tùy chọn tạo đồng thời sản phẩm bày bán trên Cửa hàng.";

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans text-text-main"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-black bg-primary/20 px-6 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              {isEdit ? `MẪU LED #${initialModel?.modelId}` : "ĐĂNG KÝ MẪU LED MỚI"}
            </span>
            <h2
              id={titleId}
              className="mt-1.5 text-base font-black uppercase tracking-tight text-black sm:text-lg"
            >
              {modalTitle}
            </h2>
            <p id={descriptionId} className="mt-0.5 text-xs font-medium text-text-muted">
              {modalDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form id="led-model-form" onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Tên & Tồn kho */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="led-model-name-input"
                  className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black"
                >
                  Tên mẫu LED <span className="text-red-600">*</span>
                </label>
                <input
                  id="led-model-name-input"
                  type="text"
                  required
                  maxLength={255}
                  value={modelName}
                  onChange={(e) => handleModelNameChange(e.target.value)}
                  placeholder="Ví dụ: Lumintra Matrix 64x64 Pro V2"
                  className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-bold text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black">
                  Số lượng tồn kho (theo thiết bị thực tế)
                </label>
                <div className="flex items-center justify-between gap-2 border-2 border-black bg-gray-100 px-3 py-1.5 text-xs">
                  <span className="font-black text-black tabular-nums">
                    {resolvedStockQuantity} thiết bị
                  </span>
                  <span className="border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                    Chỉ tăng qua nhập kho Serial
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-text-muted">
                  {isEdit
                    ? "Để nhập thêm hàng vào kho, hãy bấm vào mẫu LED và chọn \"Nhập kho thiết bị\" kèm Serial/MAC."
                    : "Mẫu mới bắt đầu từ 0 thiết bị. Sau khi tạo, mở mẫu LED để nhập kho theo từng Serial & MAC."}
                </p>
              </div>
            </div>

            {/* Kích thước ma trận */}
            <div className="border-2 border-black bg-[#f3faf5] p-3.5 shadow-[2px_2px_0_0_#000]">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-black/20 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  Kích thước ma trận LED (Pixel)
                </span>
                {isEdit && (
                  <span className="inline-flex items-center gap-1 border border-black bg-[#fef08a] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                    <Info size={12} aria-hidden="true" />
                    Khóa nếu đã có thiết bị trong kho
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="led-model-width-px"
                    className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                  >
                    Chiều rộng (widthPx) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="led-model-width-px"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={widthPx}
                    onChange={(e) => setWidthPx(e.target.value)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-black text-black tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                </div>
                <div>
                  <label
                    htmlFor="led-model-height-px"
                    className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                  >
                    Chiều cao (heightPx) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="led-model-height-px"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={heightPx}
                    onChange={(e) => setHeightPx(e.target.value)}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-black text-black tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  />
                </div>
              </div>
            </div>

            {/* Danh sách thông số kỹ thuật có thứ tự */}
            <LedSpecAttributesEditor
              attributes={attributes}
              onChange={setAttributes}
              disabled={isSubmitting}
            />

            {isEdit && initialModel && (
              <div className="flex items-start gap-2.5 border-2 border-black bg-[#e0f2fe] p-3 text-xs font-medium text-black shadow-[2px_2px_0_0_#000]">
                <Info size={15} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
                <p>
                  {initialModel.status === "DEPRECATED" ? (
                    <>
                      Mẫu này hiện đang ở trạng thái <strong className="font-black">Ngừng kinh doanh</strong> và sẽ giữ nguyên trạng thái này dù thay đổi tồn kho.
                    </>
                  ) : (
                    <>
                      Trạng thái mẫu LED sẽ tự động cập nhật theo tồn kho: <strong className="font-black">Đang kinh doanh</strong> khi tồn kho &gt; 0 và <strong className="font-black">Hết hàng</strong> khi tồn kho = 0.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Đồng bộ / Tạo kèm Sản phẩm trên Cửa hàng */}
            {showProductSection && (
              <div className="space-y-3 border-2 border-black bg-[#f3faf5] p-3.5 shadow-[2px_2px_0_0_#000]">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                      <Sparkles size={14} className="text-primary-ink" aria-hidden="true" />
                      {isEdit
                        ? `Đồng bộ cập nhật sản phẩm Cửa hàng (SP #${linkedProductId})`
                        : "Tạo đồng thời sản phẩm bày bán trên Cửa hàng"}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-text-muted">
                      {isEdit
                        ? "Khi bật, thông tin tên, giá bán, mô tả, hình ảnh và thẻ của sản phẩm Cửa hàng liên kết sẽ được cập nhật cùng lúc."
                        : "Tắt tùy chọn này nếu chỉ muốn đăng ký mẫu phần cứng LED độc lập trong kho (chưa gắn sản phẩm)."}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncStoreProduct}
                    disabled={isHydratingProduct}
                    onChange={(e) => setSyncStoreProduct(e.target.checked)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-black"
                  />
                </label>

                {isHydratingProduct ? (
                  <div className="flex items-center gap-2 border-t-2 border-dashed border-black/20 pt-3 text-xs font-bold text-text-muted">
                    <Loader2 size={14} className="animate-spin text-primary-ink" aria-hidden="true" />
                    Đang tải thông tin sản phẩm Cửa hàng #{linkedProductId}...
                  </div>
                ) : (
                  syncStoreProduct && (
                    <div className="space-y-3 border-t-2 border-dashed border-black/20 pt-3">
                      {isEdit && !productHydrated && (
                        <div className="flex items-start gap-2 border-2 border-black bg-[#fef08a] p-2.5 text-[11px] font-bold text-black shadow-[2px_2px_0_0_#000]">
                          <Info size={14} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
                          <span>
                            Sản phẩm #{linkedProductId} đang ở trạng thái chưa mở bán nên không tự tải được dữ liệu cũ. Hãy kiểm tra kỹ giá bán, mô tả và hình ảnh bên dưới trước khi lưu đồng bộ.
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="led-store-product-name"
                            className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                          >
                            Tên sản phẩm trên Cửa hàng <span className="text-red-600">*</span>
                          </label>
                          <input
                            id="led-store-product-name"
                            type="text"
                            maxLength={255}
                            value={productName}
                            onChange={(e) => {
                              setProductName(e.target.value);
                              setProductNameCustomized(true);
                            }}
                            placeholder="Mặc định trùng tên mẫu LED"
                            className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="led-store-base-price"
                            className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                          >
                            Giá bán trên Cửa hàng (VNĐ) <span className="text-red-600">*</span>
                          </label>
                          <input
                            id="led-store-base-price"
                            type="number"
                            min={0}
                            step={1000}
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-black text-primary-ink tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="led-store-description"
                          className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                        >
                          Mô tả sản phẩm
                        </label>
                        <textarea
                          id="led-store-description"
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Mô tả hiển thị trên Cửa hàng..."
                          className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2 border-2 border-black bg-white p-2.5 shadow-[2px_2px_0_0_#000]">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-black">
                              <ImageIcon size={13} aria-hidden="true" /> Ảnh đại diện
                            </label>
                            <button
                              type="button"
                              disabled={isUploadingThumb}
                              onClick={() => thumbInputRef.current?.click()}
                              className="btn-primary inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                            >
                              {isUploadingThumb ? (
                                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Upload size={11} aria-hidden="true" />
                              )}
                              Chọn ảnh
                            </button>
                            <input
                              ref={thumbInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={handleThumbUpload}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={thumbnailUrl}
                              onChange={(e) => setThumbnailUrl(e.target.value)}
                              placeholder="/images/products/led/matrix-64.png"
                              aria-label="Đường dẫn ảnh đại diện"
                              className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            />
                            {thumbnailUrl && (
                              <button
                                type="button"
                                onClick={() => setThumbnailUrl("")}
                                aria-label="Xóa ảnh đại diện"
                                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center border-2 border-black bg-white text-red-700 hover:bg-[#fecaca]"
                              >
                                <X size={12} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 border-2 border-black bg-white p-2.5 shadow-[2px_2px_0_0_#000]">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-black">
                              <ImageIcon size={13} aria-hidden="true" /> Thư viện ảnh
                            </label>
                            <button
                              type="button"
                              disabled={isUploadingGallery}
                              onClick={() => galleryInputRef.current?.click()}
                              className="btn-primary inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
                            >
                              {isUploadingGallery ? (
                                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Upload size={11} aria-hidden="true" />
                              )}
                              Tải ảnh
                            </button>
                            <input
                              ref={galleryInputRef}
                              type="file"
                              multiple
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={handleGalleryUpload}
                            />
                          </div>
                          {(() => {
                            const list = galleryUrlsText
                              .split(/[\n,]/)
                              .map((u) => u.trim())
                              .filter((u) => u.length > 0);
                            if (list.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1.5">
                                {list.map((url, idx) => (
                                  <div
                                    key={idx}
                                    className="relative h-10 w-10 overflow-hidden border-2 border-black bg-gray-50"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt={`Gallery ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGalleryUrl(idx)}
                                      aria-label={`Xóa ảnh thư viện ${idx + 1}`}
                                      className="absolute right-0 top-0 cursor-pointer border-b border-l border-black bg-black p-0.5 text-white hover:bg-red-600"
                                    >
                                      <X size={9} aria-hidden="true" />
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
                            placeholder="Mỗi dòng 1 URL ảnh"
                            aria-label="Danh sách URL thư viện ảnh"
                            className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                          />
                        </div>
                      </div>

                      <CategoryTagSelector
                        availableTags={availableTags}
                        selectedTagIds={selectedTagIds}
                        isLoading={isLoadingTags}
                        label="Thẻ phân loại sản phẩm"
                        onToggleTag={(tagId) => {
                          setTagsInitialized(true);
                          setSelectedTagIds((prev) =>
                            prev.includes(tagId)
                              ? prev.filter((id) => id !== tagId)
                              : [...prev, tagId],
                          );
                        }}
                        onTagCreated={(created) => {
                          setTagsInitialized(true);
                          setAvailableTags((prev) =>
                            prev.some((t) => t.tagId === created.tagId) ? prev : [...prev, created],
                          );
                          if (created.tagId) {
                            setSelectedTagIds((prev) =>
                              prev.includes(created.tagId!) ? prev : [...prev, created.tagId!],
                            );
                          }
                        }}
                      />

                      {!isEdit && (
                        <label className="flex cursor-pointer items-center justify-between gap-2 border-2 border-black bg-white px-3 py-2 text-xs shadow-[2px_2px_0_0_#000]">
                          <span className="font-black text-black">
                            Mở bán ngay trên Cửa hàng (mặc định: Chưa mở bán)
                          </span>
                          <input
                            type="checkbox"
                            checked={publishImmediately}
                            onChange={(e) => setPublishImmediately(e.target.checked)}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-black"
                          />
                        </label>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </form>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 bg-white px-6 py-4">
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
            form="led-model-form"
            disabled={
              isSubmitting ||
              isUploadingThumb ||
              isUploadingGallery ||
              isHydratingProduct
            }
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang lưu...
              </>
            ) : isEdit ? (
              <>
                <Save size={14} aria-hidden="true" />
                {linkedProductId != null && syncStoreProduct
                  ? "Lưu Mẫu LED & Sản phẩm"
                  : "Lưu cập nhật"}
              </>
            ) : (
              <>
                <Cpu size={14} aria-hidden="true" />
                {syncStoreProduct ? "Tạo mẫu LED & Sản phẩm" : "Tạo mẫu LED"}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
