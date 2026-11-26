"use client";

import { useState } from "react";
import { AlertCircle, Grid, Loader2, Lock, Sparkles } from "lucide-react";
import StoreModal from "@/features/store-listing/components/StoreModal";
import {
  useDesignerCharacters,
  type MatrixSize,
} from "../context/DesignerCharactersContext";
import {
  formatDesignerApiError,
  type CharacterType,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";

interface CreateCharacterModalProps {
  onClose: () => void;
  onCreated: (character: DesignerCharacterItem) => void;
  defaultCharacterType?: CharacterType;
  defaultMatrixSize?: MatrixSize;
  commissionId?: number;
}

const MOCK_MATRIX_OPTIONS: Array<{ value: MatrixSize; label: string }> = [
  { value: "32x32", label: "32 × 32 px (Vuông tiêu chuẩn)" },
  { value: "64x64", label: "64 × 64 px (Vuông độ phân giải cao)" },
  { value: "64x32", label: "64 × 32 px (Màn hình rộng)" },
];

export default function CreateCharacterModal({
  onClose,
  onCreated,
  defaultCharacterType = "STORE",
  defaultMatrixSize = "32x32",
  commissionId,
}: CreateCharacterModalProps) {
  const { createCharacter } = useDesignerCharacters();
  const [characterName, setCharacterName] = useState("");
  const [description, setDescription] = useState("");
  const [matrixSize, setMatrixSize] = useState<MatrixSize>(defaultMatrixSize);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = characterName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên nhân vật (tên file).");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCharacter({
        characterName: trimmedName,
        description: description.trim() || undefined,
        matrixSize,
        characterType: defaultCharacterType,
        commissionId: defaultCharacterType === "COMMISSION" ? commissionId : undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(formatDesignerApiError(err, "Không thể tạo nhân vật mới."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      onClose={onClose}
      title="Tạo nhân vật mới"
      badge="Pixel Studio"
      description="Khởi tạo file nhân vật và cấu hình kích thước ma trận LED."
      icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
      size="md"
      busy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-character-modal-form"
            disabled={isSubmitting}
            className="btn-primary inline-flex items-center gap-2 text-sm"
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
      <form
        id="create-character-modal-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-sm text-black"
      >
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 border-2 border-black bg-red-50 p-3 text-xs font-bold text-red-700 shadow-[2px_2px_0_0_#000]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="create-character-name"
            className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black"
          >
            Tên nhân vật (Tên file) <span className="text-red-600">*</span>
          </label>
          <input
            id="create-character-name"
            type="text"
            required
            autoFocus
            maxLength={255}
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Ví dụ: neon-samurai hoặc Cyberpunk Cat..."
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-black placeholder:font-normal placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="create-character-description"
            className="mb-1.5 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-black"
          >
            <span>Mô tả</span>
            <span className="border border-black bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-gray-700">
              Tùy chọn
            </span>
          </label>
          <textarea
            id="create-character-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Phong cách pixel art, chủ đề, gợi ý hiển thị trên LED..."
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium text-black placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="create-character-matrix"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black"
          >
            <Grid size={14} aria-hidden="true" />
            <span>
              Kích thước ma trận (Matrix Size) <span className="text-red-600">*</span>
            </span>
          </label>
          <select
            id="create-character-matrix"
            value={matrixSize}
            onChange={(e) => setMatrixSize(e.target.value as MatrixSize)}
            className="w-full cursor-pointer border-2 border-black bg-white px-3 py-2 font-mono text-sm font-bold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
          >
            {MOCK_MATRIX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-2 flex items-start gap-1.5 border border-black bg-[#fef9e7] px-2.5 py-1.5 text-[11px] font-semibold text-black">
            <Lock size={12} className="mt-0.5 shrink-0" />
            <span>
              Mock tạm thời hỗ trợ 32×32, 64×64 và 64×32 · Kích thước ma trận được cố định cho nhân vật sau khi tạo.
            </span>
          </p>
        </div>
      </form>
    </StoreModal>
  );
}
