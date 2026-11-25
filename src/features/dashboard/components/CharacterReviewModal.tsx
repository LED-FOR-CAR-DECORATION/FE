"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, X } from "lucide-react";
import type { StoreDraftItem } from "@/lib/api/dashboard";

export interface CharacterReviewModalProps {
  draft: StoreDraftItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (draft: StoreDraftItem, price: number) => Promise<void>;
  onReject: (draft: StoreDraftItem) => Promise<void>;
}

export default function CharacterReviewModal({
  draft,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: CharacterReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPriceInput(draft ? String(Number(draft.basePrice ?? 0)) : "");
    setSubmitError(null);
  }, [draft?.productId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!mounted || !isOpen || !draft) return null;

  const handleApprove = async () => {
    const parsedPrice = Number(priceInput);
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(priceInput.trim()) || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSubmitError("Vui lòng nhập giá bán hợp lệ (>= 0 VNĐ).");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onApprove(draft, parsedPrice);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không thể duyệt sản phẩm. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onReject(draft);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không thể lưu trữ/từ chối sản phẩm. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] h-screen w-screen font-sans">
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-black/50 transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-50 shadow-[2px_2px_0_0_#000]">
              {draft.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.thumbnailUrl}
                  alt={draft.productName}
                  className="h-full w-full object-contain [image-rendering:pixelated]"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-text-muted" aria-hidden="true" />
              )}
            </div>
            <div>
              <span className="inline-flex items-center border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                Xét duyệt nhân vật #{draft.productId}
              </span>
              <h2
                id="review-modal-title"
                className="mt-1 text-base font-black uppercase tracking-tight text-black sm:text-lg"
              >
                {draft.productName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col items-center justify-center border-2 border-black bg-gray-50 p-6 text-center">
            <div className="mb-3 flex h-40 w-40 items-center justify-center overflow-hidden border-2 border-black bg-[#111111] shadow-[4px_4px_0_0_#000]">
              {draft.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.thumbnailUrl}
                  alt={draft.productName}
                  className="h-full w-full object-contain [image-rendering:pixelated]"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted tabular-nums">
              Gửi lúc {new Date(draft.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="border-2 border-black bg-white p-3.5 shadow-[2px_2px_0_0_#000]">
              <span className="block text-[10px] font-black uppercase tracking-wider text-text-muted">
                Mô tả sản phẩm
              </span>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-black">
                {draft.description || "Chưa có mô tả chi tiết."}
              </p>
            </div>

            <div className="border-2 border-black bg-white p-3.5 shadow-[2px_2px_0_0_#000]">
              <label
                htmlFor="review-base-price"
                className="block text-[10px] font-black uppercase tracking-wider text-text-muted"
              >
                Giá bán trên cửa hàng (VNĐ)
              </label>
              <input
                id="review-base-price"
                type="number"
                min={0}
                max={9999999999.99}
                step={1000}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                disabled={isSubmitting}
                className="mt-2 w-full border-2 border-black bg-gray-50 px-3 py-2 text-sm font-black text-primary-ink tabular-nums focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
                placeholder="Nhập giá bán (0 = Miễn phí)"
              />
              <p className="mt-1.5 text-[11px] font-medium text-text-muted">
                Nhập <strong className="text-black">0</strong> nếu muốn mở bán miễn phí.
              </p>
            </div>
          </div>
        </div>

        {submitError && (
          <p
            role="alert"
            className="mt-4 border-2 border-black bg-[#fee2e2] px-3.5 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
          >
            {submitError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={isSubmitting}
            className="btn-danger px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Lưu trữ / Từ chối
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={isSubmitting}
            className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? "Đang xử lý..." : "Duyệt & Mở bán"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
