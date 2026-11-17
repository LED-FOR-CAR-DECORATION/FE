"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { fetchStoreTags } from "@/lib/api/products";
import {
  formatDesignerApiError,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { useDesignerCharacters } from "../context/DesignerCharactersContext";
import type { CreatedStoreProductResponse, TagItem } from "@/api_client";

interface PublishToStoreModalProps {
  character: DesignerCharacterItem;
  versions: CharacterVersionItem[];
  onClose: () => void;
  onSuccess: (created: CreatedStoreProductResponse) => void;
}

export default function PublishToStoreModal({
  character,
  versions,
  onClose,
  onSuccess,
}: PublishToStoreModalProps) {
  const { publishVersionToStore } = useDesignerCharacters();

  const availableVersions = versions.filter((v) => !v.isListedOnStore);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    availableVersions[0]?.versionId ?? null,
  );
  const selectedVersion =
    versions.find((v) => v.versionId === selectedVersionId) ?? null;

  const [productName, setProductName] = useState(
    selectedVersion
      ? `${character.characterName} (v${selectedVersion.versionNumber})`
      : character.characterName,
  );
  const [basePrice, setBasePrice] = useState("49000");
  const [description, setDescription] = useState(character.description ?? "");
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
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

  const handleSelectVersion = (ver: CharacterVersionItem) => {
    if (ver.isListedOnStore) return;
    setSelectedVersionId(ver.versionId);
    setProductName(`${character.characterName} (v${ver.versionNumber})`);
  };

  const toggleTag = (tagId?: number) => {
    if (!tagId) return;
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedVersion) {
      setError("Vui lòng chọn 1 phiên bản hợp lệ (chưa đăng bán) để gửi lên Store.");
      return;
    }

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên sản phẩm hiển thị trên Store.");
      return;
    }

    const priceNum = Number(basePrice);
    if (basePrice.trim() === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Giá bán phải là số lớn hơn hoặc bằng 0 đ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await publishVersionToStore({
        character,
        version: selectedVersion,
        productName: trimmedName,
        basePrice: priceNum,
        description: description.trim() || undefined,
        tagIds: selectedTagIds,
      });
      onSuccess(created);
    } catch (err) {
      setError(
        formatDesignerApiError(
          err,
          "Không thể đăng phiên bản lên Store. Kiểm tra lại quyền hoặc thông tin sản phẩm.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={`Đăng bán lên Store: ${character.characterName}`}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="publish-to-store-form"
            disabled={isSubmitting || !selectedVersion}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1f432b] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Đang gửi duyệt...
              </>
            ) : (
              <>
                <Store size={15} /> Gửi đăng bán (UNPUBLISHED)
              </>
            )}
          </button>
        </>
      }
    >
      <form id="publish-to-store-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-700" />
          <div>
            <p className="font-bold">
              Trạng thái mặc định: UNPUBLISHED (Chờ Manager duyệt) & Bảo vệ Watermark
            </p>
            <p className="mt-0.5 text-sky-800">
              Hệ thống sẽ yêu cầu Backend tự động tạo ảnh xem trước có Watermark (GIF/PNG) cho
              phiên bản được chọn để bảo vệ tài sản trên Store công khai.
            </p>
          </div>
        </div>

        {/* Step 1: Select ONE Version */}
        <div>
          <label className="mb-2 block font-bold text-[#1f432b]">
            1. Chọn 1 phiên bản để đăng bán <span className="text-red-500">*</span>
          </label>
          {versions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Nhân vật này chưa có phiên bản nào. Hãy vẽ ít nhất 1 phiên bản trước.
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {versions.map((ver) => {
                const isSelected = ver.versionId === selectedVersionId;
                const locked = ver.isListedOnStore;
                return (
                  <button
                    key={ver.versionId}
                    type="button"
                    disabled={locked}
                    onClick={() => handleSelectVersion(ver)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      locked
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : isSelected
                          ? "border-[#2d6a4f] bg-[#eaf7ee] ring-1 ring-[#2d6a4f]"
                          : "border-[#d8e6dc] bg-white hover:bg-[#f8fcf9]"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                      {ver.previewGifUrl ? (
                        <img
                          src={ver.previewGifUrl}
                          alt={`v${ver.versionNumber}`}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-[#1f432b]">
                          v{ver.versionNumber}
                        </span>
                        {ver.isCurrent && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Mới nhất
                          </span>
                        )}
                        {locked && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            <Lock size={10} /> Đã đăng
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {ver.frameCount ?? 1} frames •{" "}
                        {new Date(ver.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    {isSelected && !locked && (
                      <CheckCircle2 size={16} className="shrink-0 text-[#2d6a4f]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Store Listing Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              2. Tên sản phẩm trên Store <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-[#1f432b]">
              Giá bán (VNĐ) <span className="text-red-500">*</span>
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

        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Mô tả bày bán</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả phong cách, điểm nổi bật của nhân vật..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        {/* Tags */}
        <div className="rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-[#1f432b]">
            <Tag size={14} /> Thẻ phân loại (Tags)
          </label>
          {isLoadingTags ? (
            <p className="text-xs text-slate-500">Đang tải danh sách thẻ...</p>
          ) : availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId ?? -1);
                return (
                  <button
                    key={tag.tagId}
                    type="button"
                    onClick={() => toggleTag(tag.tagId)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition ${
                      isSelected
                        ? "border-[#439660] bg-[#eaf7ee] text-[#1c4b2b]"
                        : "border-[#d8e6dc] bg-white text-slate-600 hover:bg-neutral-50"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Chưa có thẻ phân loại nào.</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
