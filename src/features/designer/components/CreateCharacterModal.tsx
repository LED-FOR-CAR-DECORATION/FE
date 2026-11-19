"use client";

import { useState } from "react";
import { AlertCircle, Grid, Loader2, Lock, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  useDesignerCharacters,
  type MatrixSize,
} from "../context/DesignerCharactersContext";
import { formatDesignerApiError, type DesignerCharacterItem } from "@/lib/api/designerCharacters";

interface CreateCharacterModalProps {
  onClose: () => void;
  onCreated: (character: DesignerCharacterItem) => void;
}

export default function CreateCharacterModal({
  onClose,
  onCreated,
}: CreateCharacterModalProps) {
  const { createCharacter } = useDesignerCharacters();
  const [characterName, setCharacterName] = useState("");
  const [description, setDescription] = useState("");
  const [matrixSize, setMatrixSize] = useState<MatrixSize>("32x32");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = characterName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên nhân vật.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCharacter({
        characterName: trimmedName,
        description: description.trim() || undefined,
        matrixSize,
      });
      onCreated(created);
    } catch (err) {
      setError(formatDesignerApiError(err, "Không thể tạo nhân vật mới."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Tạo nhân vật mới"
      size="md"
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
            form="create-character-modal-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#1f432b] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Đang khởi tạo...
              </>
            ) : (
              <>
                <Sparkles size={15} /> Khởi tạo
              </>
            )}
          </button>
        </>
      }
    >
      <form id="create-character-modal-form" onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">
            Tên nhân vật <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={255}
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Ví dụ: Neon Samurai, Cyberpunk Cat..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        <div>
          <label className="mb-1 block font-bold text-[#1f432b]">Mô tả</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Phong cách pixel art, chủ đề, gợi ý hiển thị trên LED..."
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 outline-none focus:border-[#439660]"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 font-bold text-[#1f432b]">
            <Grid size={14} /> Kích thước Ma trận LED (Matrix Size){" "}
            <span className="text-red-500">*</span>
          </label>
          <select
            value={matrixSize}
            onChange={(e) => setMatrixSize(e.target.value as MatrixSize)}
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 font-semibold text-[#1f432b] outline-none focus:border-[#439660]"
          >
            <option value="32x32">32 x 32 px (Vuông tiêu chuẩn)</option>
            <option value="64x32">64 x 32 px (Màn hình rộng)</option>
          </select>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <Lock size={12} /> Kích thước ma trận sẽ được khóa cố định cho nhân vật này sau khi tạo.
          </p>
        </div>
      </form>
    </Modal>
  );
}

