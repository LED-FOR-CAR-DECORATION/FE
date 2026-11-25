"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, Loader2, ShieldOff, X } from "lucide-react";
import {
  apiDeprecateLedModel,
  formatLedModelError,
  type ManagedLedModelItem,
} from "@/lib/api/ledModels";

interface DeprecateLedModelModalProps {
  model: ManagedLedModelItem;
  onClose: () => void;
  onSuccess: (model: ManagedLedModelItem) => void;
}

export default function DeprecateLedModelModal({
  model,
  onClose,
  onSuccess,
}: DeprecateLedModelModalProps) {
  const [mounted, setMounted] = useState(false);
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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiDeprecateLedModel(model.modelId);
      onSuccess(model);
      onClose();
    } catch (err) {
      setError(
        formatLedModelError(err, "Không thể ngừng kinh doanh mẫu LED này."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-black bg-[#fef2f2] px-6 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center border border-black bg-[#fecaca] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              CẢNH BÁO NGỪNG KINH DOANH
            </span>
            <h2
              id={titleId}
              className="mt-1.5 text-base font-black uppercase tracking-tight text-black sm:text-lg"
            >
              Ngừng kinh doanh mẫu LED
            </h2>
            <p id={descriptionId} className="mt-0.5 text-xs font-medium text-text-muted">
              Xác nhận ngừng kinh doanh mẫu &quot;{model.modelName}&quot; (ID #{model.modelId}).
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
          <div className="space-y-3 text-sm">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-start gap-2.5 border-2 border-black bg-[#fef08a] p-3.5 text-xs font-medium text-black shadow-[2px_2px_0_0_#000]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-black" aria-hidden="true" />
              <ul className="list-disc space-y-1.5 pl-4">
                <li>
                  Mẫu LED <strong className="font-black">{model.modelName}</strong> sẽ chuyển sang trạng thái{" "}
                  <strong className="font-black">Ngừng kinh doanh</strong> (xóa mềm, không xóa lịch sử dữ liệu) và ngừng cấp phát thiết bị mới.
                </li>
                {model.productId != null && (
                  <li>
                    Sản phẩm Cửa hàng đang liên kết (<strong className="font-black">Mã SP #{model.productId}</strong>) nếu đang mở bán sẽ tự động chuyển sang trạng thái <strong className="font-black">Đã lưu trữ</strong>.
                  </li>
                )}
                <li>
                  Toàn bộ thiết bị vật lý khách hàng đã mua hoặc đang kích hoạt vẫn hoạt động, cập nhật firmware và bảo hành bình thường.
                </li>
              </ul>
            </div>
          </div>
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
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="btn-danger inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ShieldOff size={14} aria-hidden="true" />
                Xác nhận ngừng kinh doanh
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
