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
        className="fixed inset-0 z-[100] h-screen w-screen bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {draft.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.thumbnailUrl}
                  alt={draft.productName}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Xét duyệt nhân vật #{draft.productId}
              </span>
              <h2
                id="review-modal-title"
                className="mt-1 text-lg font-semibold text-slate-900"
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <div className="mb-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
              {draft.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.thumbnailUrl}
                  alt={draft.productName}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-slate-500" />
              )}
            </div>
            <p className="text-xs font-medium text-slate-500">
              Gửi lúc {new Date(draft.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="block text-xs font-medium text-slate-500">
                Mô tả sản phẩm
              </span>
              <p className="mt-1 text-sm text-slate-800">
                {draft.description || "Chưa có mô tả chi tiết."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <label
                htmlFor="review-base-price"
                className="block text-xs font-medium text-slate-500"
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
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập giá bán (0 = Miễn phí)"
              />
            </div>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {submitError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={isSubmitting}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            Lưu trữ / Từ chối
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Đang xử lý..." : "Duyệt & Mở bán"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
