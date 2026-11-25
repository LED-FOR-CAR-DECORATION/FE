"use client";

import { useState } from "react";
import { AlertTriangle, EyeOff, Loader2 } from "lucide-react";
import StoreModal from "./StoreModal";
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
    <StoreModal
      title="Chuyển nhân vật về Chờ duyệt?"
      description={`${character.name} sẽ chuyển sang trạng thái Chờ duyệt (UNPUBLISHED) và ngừng hiển thị trên cửa hàng.`}
      icon={<EyeOff size={18} />}
      iconBoxClassName="bg-[#fef08a]"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Giữ nguyên Đang bán
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
            Chuyển về Chờ duyệt
          </button>
        </>
      }
    >
      <p className="text-xs font-medium leading-relaxed text-black sm:text-sm">
        Những khách hàng đã sở hữu nhân vật này trước đó vẫn giữ toàn quyền sử dụng. Sau này nếu muốn mở bán lại, bạn sẽ
        cần chủ động chọn phiên bản khi thực hiện mở bán lại.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 border-2 border-black bg-[#fee2e2] px-3.5 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
          {error}
        </p>
      )}
    </StoreModal>
  );
}
