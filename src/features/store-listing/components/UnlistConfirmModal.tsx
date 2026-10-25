"use client";

import { useState } from "react";
import { AlertTriangle, EyeOff, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { StoreCharacterRow } from "../types";

interface UnlistConfirmModalProps {
  character: StoreCharacterRow;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function UnlistConfirmModal({ character, onClose, onConfirm }: UnlistConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Ẩn Character khỏi Store?"
      description={`${character.name} sẽ ngừng hiển thị công khai trên Store.`}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Giữ lại trên Store
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <EyeOff size={15} />}
            Ẩn (Unlist)
          </button>
        </>
      }
    >
      <p className="text-sm font-medium text-[#3d5a47]">
        Những khách hàng đã sở hữu Character này trước đó vẫn giữ toàn quyền sử dụng. Sau này nếu muốn mở bán lại, bạn sẽ
        cần chủ động chọn version khi thực hiện Publish lại.
      </p>
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </Modal>
  );
}
