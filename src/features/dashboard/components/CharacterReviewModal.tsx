"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { PendingCharacterItem } from "../types";

export interface CharacterReviewModalProps {
  character: PendingCharacterItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (item: PendingCharacterItem) => void;
  onReject: (item: PendingCharacterItem) => void;
}

export default function CharacterReviewModal({
  character,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: CharacterReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setFeedbackNote("");
  }, [character?.id, isOpen]);

  // Lock background page scrolling and listen to Escape key when modal is open
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

  if (!mounted || !isOpen || !character) return null;

  const handleApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onApprove(character);
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  const handleReject = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onReject(character);
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] h-screen w-screen font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl">
              {character.thumbnailUrl}
            </span>
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Xét duyệt Character
              </span>
              <h2
                id="review-modal-title"
                className="mt-1 text-lg font-semibold text-slate-900"
              >
                {character.name}
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

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Preview Box */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <div className="mb-3 flex h-36 w-36 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-6xl shadow-sm">
              <span>{character.thumbnailUrl}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800">
              Ma trận {character.resolution} • {character.frames} khung hình
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Định dạng: {character.format} (Tương thích LED-32 / LED-64)
            </p>
          </div>

          {/* Metadata Specs */}
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="block text-xs font-medium text-slate-500">
                Nhà thiết kế
              </span>
              <span className="mt-0.5 block font-semibold text-slate-900">
                {character.designer.name} ({character.designer.handle})
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="block text-xs font-medium text-slate-500">
                Giá bán dự kiến
              </span>
              <span className="mt-0.5 block text-base font-semibold text-slate-900 tabular-nums">
                {character.isFree
                  ? "Miễn phí (0 đ)"
                  : `${character.price.toLocaleString("vi-VN")} đ`}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="block text-xs font-medium text-slate-500">
                Thẻ phân loại
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {character.tags.length > 0 ? (
                  character.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Không có thẻ</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review Notes */}
        <div className="mt-5">
          <label
            htmlFor="character-review-note"
            className="mb-1.5 block text-xs font-medium text-slate-700"
          >
            Ghi chú phản hồi cho nhà thiết kế
          </label>
          <textarea
            id="character-review-note"
            rows={2}
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder="Ví dụ: Thiết kế pixel mượt, màu sắc hiển thị rõ trên kính chắn gió ban đêm..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Footer Actions */}
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
            onClick={handleReject}
            disabled={isSubmitting}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            Từ chối / Yêu cầu sửa
          </button>
          <button
            type="button"
            onClick={handleApprove}
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
