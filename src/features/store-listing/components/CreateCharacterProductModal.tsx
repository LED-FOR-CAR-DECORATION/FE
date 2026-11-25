"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  Info,
  Loader2,
  Palette,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import CategoryTagSelector from "./CategoryTagSelector";
import {
  apiCreateStoreProduct,
  apiUpdateProductStatus,
  fetchAdminCharacters,
  fetchStoreTags,
  type AdminCharacterSummary,
} from "@/lib/api/products";
import {
  fetchCharacterVersions,
  fetchMyCharacters,
  isStoreCharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { uploadMediaFile } from "@/lib/api/media";
import type { CreatedStoreProductResponse, TagItem } from "@/api_client";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import { saveCreatedStoreProduct } from "../services/store-listing.service";

interface CreateCharacterProductModalProps {
  onClose: () => void;
  onSuccess: (created: CreatedStoreProductResponse) => void;
  onBackToTypeSelect?: () => void;
}

const PRICE_PRESETS = [49000, 99000, 149000, 199000, 249000];

export default function CreateCharacterProductModal({
  onClose,
  onSuccess,
  onBackToTypeSelect,
}: CreateCharacterProductModalProps) {
  // Step 1: Designer Characters & Versions
  const [characters, setCharacters] = useState<AdminCharacterSummary[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [characterSearch, setCharacterSearch] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  const [versions, setVersions] = useState<CharacterVersionItem[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<CharacterVersionItem | null>(null);

  // Step 2: Commercial Product details
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState<string>("149000");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Tags
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Media upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Submit & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Designer Characters (trying Admin endpoint, fallback to Designer endpoint)
  const loadCharacters = async () => {
    setIsLoadingCharacters(true);
    setError(null);
    try {
      let list = await fetchAdminCharacters({ characterType: "STORE", size: 100 });
      if (!list || list.length === 0) {
        // Fallback to designer endpoint for local/mock compatibility
        const designerRes = await fetchMyCharacters({ characterType: "STORE", size: 100 });
        list = designerRes.items.map((item: DesignerCharacterItem) => ({
          characterId: item.characterId,
          characterName: item.characterName,
          description: item.description,
          characterType: item.characterType ?? "STORE",
          commissionId: item.commissionId ?? null,
          author: {
            employeeId: 1,
            fullName: "Designer",
            email: "designer@lumintra.com",
          },
          totalVersions: item.totalVersions,
          createdAt: item.createdAt,
        }));
      }
      setCharacters(list.filter((item) => isStoreCharacterType(item.characterType)));
    } catch (err: any) {
      console.error("Failed to load designer characters:", err);
      setError("Không thể tải danh sách Character của Designer. Vui lòng thử lại.");
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  // Load Tags
  useEffect(() => {
    setIsLoadingTags(true);
    fetchStoreTags()
      .then((tags) => setAvailableTags(tags))
      .catch((err) => console.warn("Failed to load store tags:", err))
      .finally(() => setIsLoadingTags(false));
  }, []);

  // When selectedCharacterId changes, fetch versions
  useEffect(() => {
    if (!selectedCharacterId) {
      setVersions([]);
      setSelectedVersion(null);
      return;
    }

    const selectedChar = characters.find((c) => c.characterId === selectedCharacterId);
    if (selectedChar) {
      setProductName(selectedChar.characterName);
      setDescription(selectedChar.description ?? "");
    }

    setIsLoadingVersions(true);
    setSelectedVersion(null);

    fetchCharacterVersions(selectedCharacterId)
      .then((verList) => {
        setVersions(verList);
        // Auto-select first available unlisted version if exists
        const available = verList.find((v) => !v.isListedOnStore);
        if (available) {
          setSelectedVersion(available);
          if (available.previewGifUrl) {
            setThumbnailUrl(available.previewGifUrl);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load versions:", err);
        setError(`Không thể tải phiên bản của nhân vật #${selectedCharacterId}.`);
      })
      .finally(() => setIsLoadingVersions(false));
  }, [selectedCharacterId, characters]);

  // Handle version select
  const handleSelectVersion = (v: CharacterVersionItem) => {
    if (v.isListedOnStore) return; // Prevent selecting already linked version
    setSelectedVersion(v);
    if (v.previewGifUrl) {
      setThumbnailUrl(v.previewGifUrl);
    }
  };

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

  // Upload thumbnail from machine
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WEBP, GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng hình ảnh không được vượt quá 10MB.");
      return;
    }

    setIsUploadingImage(true);
    setUploadNotice(null);
    setError(null);

    try {
      const res = await uploadMediaFile(file, "CHARACTER_ASSET");
      setThumbnailUrl(res.publicUrl);
      setUploadNotice("Tải ảnh lên máy chủ Media thành công.");
    } catch (err: any) {
      console.error("Upload thumbnail failed:", err);
      setError(err?.message || "Không thể tải ảnh lên máy chủ Media.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCharacterId) {
      setError("Vui lòng chọn một Nhân vật từ danh sách.");
      return;
    }

    if (!selectedVersion) {
      setError("Vui lòng chọn một Phiên bản animation khả dụng để niêm yết bán.");
      return;
    }

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên sản phẩm hiển thị trên Store.");
      return;
    }

    const priceNum = Number(basePrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Giá bán cơ bản phải là số hợp lệ và lớn hơn hoặc bằng 0 VNĐ.");
      return;
    }

    const trimmedThumb = thumbnailUrl.trim();

    setIsSubmitting(true);
    try {
      const payload: CreateStoreProductRequest = {
        productName: trimmedName,
        productType: CreateStoreProductRequest.productType.CHARACTER,
        basePrice: priceNum,
        description: description.trim() || undefined,
        thumbnailUrl: trimmedThumb || undefined,
        characterVersionId: selectedVersion.versionId,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      };

      const created = await apiCreateStoreProduct(payload);

      // If user chose to publish immediately
      if (publishImmediately && created.productId) {
        try {
          await apiUpdateProductStatus(created.productId, "PUBLISHED");
          created.status = "PUBLISHED" as any;
        } catch (publishErr) {
          console.warn("Auto-publish failed, product remains UNPUBLISHED:", publishErr);
        }
      }

      // Save versionNumber for display
      (created as any).characterVersionNumber = selectedVersion.versionNumber;
      saveCreatedStoreProduct(created);

      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error("Create Character product error:", err);
      const serverMessage = err?.response?.data?.message || err?.message;
      if (err?.response?.status === 409) {
        setError(
          `Phiên bản #${selectedVersion.versionId} đã được liên kết với một sản phẩm khác trên Store (409). Vui lòng chọn phiên bản khác.`,
        );
      } else if (err?.response?.status === 403) {
        setError("Chỉ tài khoản Quản lý hoặc Quản trị viên mới có quyền tạo sản phẩm Cửa hàng (403).");
      } else {
        setError(serverMessage || "Tạo sản phẩm thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCharacters = characters.filter((c) => {
    if (!characterSearch.trim()) return true;
    const q = characterSearch.toLowerCase();
    return (
      c.characterName.toLowerCase().includes(q) ||
      String(c.characterId).includes(q) ||
      (c.author?.fullName && c.author.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      title="Tạo sản phẩm Nhân vật"
      description="Chọn nhân vật & phiên bản có sẵn từ Designer để định giá, gắn thẻ và bày bán lên Cửa hàng."
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0d4] bg-white px-3.5 py-2 text-xs font-bold text-[#1f432b] transition hover:bg-[#eef8f0] disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Đổi loại sản phẩm
            </button>
          )}
          <p className="mr-auto text-xs font-medium text-text-muted">
            {selectedVersion
              ? `Đã chọn: Phiên bản ${selectedVersion.versionNumber} (ID #${selectedVersion.versionId})`
              : "Vui lòng chọn phiên bản để tiếp tục"}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold transition hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedVersion}
            className="inline-flex items-center gap-2 rounded-lg border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-5 py-2 text-sm font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang xử lý...
              </>
            ) : publishImmediately ? (
              <>
                <Rocket size={16} />
                Tạo &amp; Mở bán ngay
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Tạo sản phẩm (Chưa mở bán)
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 2 COLUMNS LAYOUT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: CHỌN CHARACTER & PHIÊN BẢN (5/12) */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-xl border border-[#cfe0d4] bg-[#f8fdf9] p-4">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#215732]">
                  <Palette size={15} />
                  1. Chọn Nhân Vật ({characters.length})
                </label>
                <button
                  type="button"
                  onClick={loadCharacters}
                  disabled={isLoadingCharacters}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                  title="Làm mới danh sách nhân vật"
                >
                  <RefreshCw size={11} className={isLoadingCharacters ? "animate-spin" : ""} />
                  Tải lại
                </button>
              </div>

              {/* Character Search input */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã nhân vật..."
                  value={characterSearch}
                  onChange={(e) => setCharacterSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[#3f9660]"
                />
              </div>

              {/* Character list */}
              {isLoadingCharacters ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-[#3f9660]" />
                  <span className="mt-2 text-xs">Đang tải danh sách nhân vật...</span>
                </div>
              ) : filteredCharacters.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                  Không tìm thấy nhân vật nào phù hợp.
                </div>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {filteredCharacters.map((c) => {
                    const isSelected = selectedCharacterId === c.characterId;
                    return (
                      <button
                        key={c.characterId}
                        type="button"
                        onClick={() => setSelectedCharacterId(c.characterId)}
                        className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition ${
                          isSelected
                            ? "border-[#3f9660] bg-[#eefaf1] shadow-sm"
                            : "border-slate-200 bg-white hover:border-[#a3d7b2] hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-slate-800">
                            #{c.characterId} · {c.characterName}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            Tác giả: {c.author?.fullName || "Designer"} · {c.totalVersions} phiên bản
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="shrink-0 text-[#3f9660]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Versions Selection */}
            {selectedCharacterId && (
              <div className="rounded-xl border border-[#cfe0d4] bg-[#f8fdf9] p-4">
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-[#215732]">
                  2. Chọn Phiên Bản Animation
                </label>

                {isLoadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <Loader2 size={20} className="animate-spin text-[#3f9660]" />
                    <span className="mt-2 text-xs">Đang tải các phiên bản...</span>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    Nhân vật này chưa có phiên bản GIF nào được Designer đăng tải.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => {
                      const isSelected = selectedVersion?.versionId === v.versionId;
                      const isListed = v.isListedOnStore;

                      return (
                        <div
                          key={v.versionId}
                          onClick={() => handleSelectVersion(v)}
                          className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                            isListed
                              ? "cursor-not-allowed border-slate-200 bg-slate-100/70 opacity-60"
                              : isSelected
                              ? "cursor-pointer border-[#3f9660] bg-[#eefaf1] shadow-sm ring-2 ring-[#3f9660]/20"
                              : "cursor-pointer border-slate-200 bg-white hover:border-[#a3d7b2] hover:bg-slate-50"
                          }`}
                        >
                          {/* Version thumbnail/GIF */}
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {v.previewGifUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v.previewGifUrl}
                                alt={`Version ${v.versionNumber}`}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </div>

                          {/* Version info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">
                                Version {v.versionNumber}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                (#{v.versionId})
                              </span>
                              {v.isCurrent && (
                                <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800">
                                  Mới nhất
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {v.frameCount} khung hình · {v.frameDelayMs}ms/frame
                            </p>
                            <div className="mt-1">
                              {isListed ? (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-700">
                                  Đã gắn Store #{v.productId}
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                                  ✓ Sẵn sàng niêm yết
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle2 size={18} className="shrink-0 text-[#3f9660]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: THÔNG TIN NIÊM YẾT STORE (7/12) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <Sparkles size={15} className="text-[#3f9660]" />
                3. Thông Tin Sản Phẩm Cửa Hàng
              </label>

              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Tên sản phẩm Store <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Nhập tên sản phẩm hiển thị trên Store..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none transition focus:border-[#3f9660] focus:ring-2 focus:ring-[#3f9660]/20"
                  />
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Giá bán ưu đãi (VND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-primary-dark outline-none transition focus:border-[#3f9660] focus:ring-2 focus:ring-[#3f9660]/20"
                  />
                  {/* Price Presets */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRICE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBasePrice(String(preset))}
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition ${
                          basePrice === String(preset)
                            ? "border-[#3f9660] bg-[#eefaf1] text-[#215732]"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {preset.toLocaleString("vi-VN")} VNĐ
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Mô tả thương mại (Store Description)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả phong cách pixel, độ phân giải LED tương thích, trải nghiệm..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none transition focus:border-[#3f9660] focus:ring-2 focus:ring-[#3f9660]/20"
                  />
                </div>

                {/* Thumbnail Preview & URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Ảnh đại diện sản phẩm (Thumbnail)
                  </label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
                      {thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://... hoặc dùng ảnh từ animation của Designer"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none transition focus:border-[#3f9660]"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                          {isUploadingImage ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Upload size={12} />
                          )}
                          Thay đổi ảnh từ máy
                        </button>
                        {selectedVersion?.previewGifUrl && (
                          <button
                            type="button"
                            onClick={() => setThumbnailUrl(selectedVersion.previewGifUrl)}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            Dùng lại GIF gốc
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {uploadNotice && (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">{uploadNotice}</p>
                  )}
                </div>

                {/* Tags */}
                <CategoryTagSelector
                  availableTags={availableTags}
                  selectedTagIds={selectedTagIds}
                  isLoading={isLoadingTags}
                  label="Thẻ phân loại sản phẩm"
                  onToggleTag={toggleTag}
                  onTagCreated={handleTagCreated}
                />

                {/* Publish Immediately Option */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#3f9660]"
                    />
                    <div className="text-xs">
                      <span className="font-black text-emerald-950">
                        Duyệt mở bán ngay lập tức (PUBLISHED)
                      </span>
                      <p className="mt-0.5 text-slate-600">
                        {publishImmediately
                          ? "Sản phẩm sẽ được Publish ngay sau khi tạo và xuất hiện trực tiếp trên Store cho khách hàng mua."
                          : "Sản phẩm sẽ được lưu ở trạng thái Chờ duyệt (UNPUBLISHED) để Manager kiểm tra và Publish sau trên Dashboard."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
