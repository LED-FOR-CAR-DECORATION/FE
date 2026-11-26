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
    <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
      <label className="mb-2.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
        <Tag size={14} className="text-primary-ink" aria-hidden="true" /> {label}
      </label>

      {isLoading ? (
        <p className="text-xs font-medium text-text-muted">Đang tải danh sách thẻ...</p>
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
                aria-pressed={isSelected}
                onClick={() => onToggleTag(tagId)}
                className={`inline-flex cursor-pointer items-center gap-1.5 border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wide transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  isSelected
                    ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-gray-50 text-black hover:bg-primary/20"
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                {tag.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-medium text-text-muted">
          Chưa có thẻ nào trên hệ thống. Bạn có thể tạo nhanh thẻ mới ở bên dưới.
        </p>
      )}

      {/* Quick inline tag creation */}
      <div className="mt-3.5 space-y-2 border-t-2 border-dashed border-gray-200 pt-3">
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
            className="min-w-0 flex-1 border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-black disabled:opacity-50"
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
            className="min-w-0 flex-1 border-2 border-black bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-black disabled:opacity-50"
          />
          <button
            type="button"
            disabled={isCreating || !newTagName.trim()}
            onClick={() => void handleCreateTag()}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-1 px-3! py-1.5! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
          >
            {isCreating ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={13} aria-hidden="true" />
            )}
            {isCreating ? "Đang tạo..." : "Tạo thẻ"}
          </button>
        </div>

        {tagError && (
          <p role="alert" className="mt-1.5 text-[11px] font-bold text-red-700">
            {tagError}
          </p>
        )}
        {tagNotice && !tagError && (
          <p role="status" className="mt-1.5 text-[11px] font-bold text-primary-ink">
            {tagNotice}
          </p>
        )}
      </div>
    </div>
  );
}
