"use client";

import { useState, type KeyboardEvent } from "react";
import { Check, Loader2, Plus, Tag } from "lucide-react";
import type { TagItem } from "@/api_client";
import { apiCreateStoreTag } from "@/lib/api/products";
import { getApiErrorMessage } from "@/lib/api/auth";

interface CategoryTagSelectorProps {
  availableTags: TagItem[];
  selectedTagIds: number[];
  isLoading?: boolean;
  label?: string;
  onToggleTag: (tagId: number) => void;
  onTagCreated: (created: TagItem) => void;
}

export default function CategoryTagSelector({
  availableTags,
  selectedTagIds,
  isLoading = false,
  label = "Thẻ phân loại",
  onToggleTag,
  onTagCreated,
}: CategoryTagSelectorProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagNotice, setTagNotice] = useState<string | null>(null);

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    const trimmedDesc = newTagDescription.trim();
    if (!trimmed) {
      setTagError("Vui lòng nhập tên thẻ mới.");
      return;
    }
    if (trimmed.length > 100) {
      setTagError("Tên thẻ không được vượt quá 100 ký tự.");
      return;
    }

    setTagError(null);
    setTagNotice(null);

    const existing = availableTags.find(
      (tag) => tag.name?.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing?.tagId) {
      if (!selectedTagIds.includes(existing.tagId)) {
        onToggleTag(existing.tagId);
      }
      setNewTagName("");
      setNewTagDescription("");
      setTagNotice(`Thẻ "${existing.name}" đã có sẵn — đã tự động chọn.`);
      return;
    }

    setIsCreating(true);
    try {
      const created = await apiCreateStoreTag({
        name: trimmed,
        description: trimmedDesc || undefined,
      });
      onTagCreated(created);
      setNewTagName("");
      setNewTagDescription("");
      setTagNotice(`Đã tạo và chọn thẻ "${created.name ?? trimmed}".`);
    } catch (err) {
      setTagError(
        getApiErrorMessage(err, "Không thể tạo thẻ mới. Vui lòng thử lại."),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isCreating) {
        void handleCreateTag();
      }
    }
  };

  return (
    <div className="rounded-lg border border-[#dbece0] bg-[#f9fdfa] p-3">
      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#1f432b]">
        <Tag size={14} /> {label}
      </label>

      {isLoading ? (
        <p className="text-xs text-text-muted">Đang tải danh sách thẻ...</p>
      ) : availableTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const tagId = tag.tagId;
            if (!tagId) return null;
            const isSelected = selectedTagIds.includes(tagId);
            return (
              <button
                key={tagId}
                type="button"
                onClick={() => onToggleTag(tagId)}
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
      ) : (
        <p className="text-xs text-text-muted">
          Chưa có thẻ nào trên hệ thống. Bạn có thể tạo nhanh thẻ mới ở bên dưới.
        </p>
      )}

      {/* Quick inline tag creation */}
      <div className="mt-3 space-y-2 border-t border-[#e5efe8] pt-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newTagName}
            maxLength={100}
            disabled={isCreating}
            onChange={(e) => {
              setNewTagName(e.target.value);
              if (tagError) setTagError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tên thẻ mới (ví dụ: hoạt hình, xe cộ)..."
            aria-label="Tên thẻ phân loại mới"
            className="min-w-0 flex-1 rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660] disabled:bg-neutral-100"
          />
          <input
            type="text"
            value={newTagDescription}
            maxLength={255}
            disabled={isCreating}
            onChange={(e) => setNewTagDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mô tả thẻ (tùy chọn)..."
            aria-label="Mô tả thẻ phân loại mới"
            className="min-w-0 flex-1 rounded-md border border-[#d8e6dc] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#439660] disabled:bg-neutral-100"
          />
          <button
            type="button"
            disabled={isCreating || !newTagName.trim()}
            onClick={() => void handleCreateTag()}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-[#439660] bg-[#eaf7ee] px-3 py-1.5 text-xs font-bold text-[#1c4b2b] transition hover:bg-[#d8efe0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            {isCreating ? "Đang tạo..." : "Tạo thẻ"}
          </button>
        </div>

        {tagError && (
          <p className="mt-1.5 text-[11px] font-semibold text-red-600">{tagError}</p>
        )}
        {tagNotice && !tagError && (
          <p className="mt-1.5 text-[11px] font-semibold text-[#2b6f44]">{tagNotice}</p>
        )}
      </div>
    </div>
  );
}
