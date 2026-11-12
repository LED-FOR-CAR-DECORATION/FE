"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Sparkles, Layers, Tag, DollarSign, Calendar } from "lucide-react";
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
    }, 400);
  };

  const handleReject = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onReject(character);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen">
      {/* 1. Full-viewport backdrop covering 100vw & 100vh including sidebar & header */}
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Modal card centered with fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000] sm:p-7"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b-3 border-black pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border-2 border-black bg-[#fef08a] text-xl shadow-[2px_2px_0_0_#000]">
              {character.thumbnailUrl}
            </span>
            <div>
              <span className="border border-black bg-[#a7f3d0] px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                STORE REVIEW QUEUE
              </span>
              <h2
                id="review-modal-title"
                className="mt-1 font-mono text-xl font-black text-black"
              >
                {character.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="border-2 border-black bg-neutral-100 p-1.5 shadow-[2px_2px_0_0_#000] transition-transform hover:bg-[#fda4af] active:translate-x-0.5 active:translate-y-0.5"
          >
            <X size={18} className="stroke-[3]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Character Preview Box */}
          <div className="flex flex-col items-center justify-center border-3 border-black bg-[#fdfaf0] p-6 text-center shadow-[4px_4px_0_0_#000]">
            <div className="relative mb-3 flex h-36 w-36 items-center justify-center border-3 border-black bg-neutral-900 text-6xl shadow-[4px_4px_0_0_#000]">
              {/* Retro scanlines effect */}
              <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)",
                  backgroundSize: "100% 4px",
                }}
              />
              <span className="animate-pulse">{character.thumbnailUrl}</span>
            </div>
            <div className="font-mono text-xs font-black text-black">
              {character.resolution} Matrix Panel • {character.frames} Frames
            </div>
            <div className="mt-1 font-mono text-[11px] text-neutral-600">
              Định dạng: {character.format} (Tương thích LED-32 / LED-64)
            </div>
          </div>

          {/* Metadata Specs */}
          <div className="space-y-3 font-mono text-xs">
            <div className="border-2 border-black bg-[#e9d5ff] p-3 shadow-[2px_2px_0_0_#000]">
              <span className="block font-bold uppercase text-neutral-700">
                Tác giả (Designer):
              </span>
              <span className="text-sm font-black text-black">
                {character.designer.name} ({character.designer.handle})
              </span>
            </div>

            <div className="border-2 border-black bg-[#fef08a] p-3 shadow-[2px_2px_0_0_#000]">
              <span className="block font-bold uppercase text-neutral-700">
                Giá bán dự kiến:
              </span>
              <span className="text-base font-black text-black">
                {character.isFree
                  ? "MIỄN PHÍ (0 đ)"
                  : `${character.price.toLocaleString("vi-VN")} đ`}
              </span>
            </div>

            <div className="border-2 border-black bg-neutral-50 p-3 shadow-[2px_2px_0_0_#000]">
              <span className="block font-bold uppercase text-neutral-700">
                Thẻ chủ đề (Tags):
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-black bg-white px-1.5 py-0.5 text-[10px] font-black"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Manager Review Notes */}
        <div className="mt-5">
          <label className="mb-1 block font-mono text-xs font-black uppercase text-black">
            Ghi chú phản hồi cho Designer:
          </label>
          <textarea
            rows={2}
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
            placeholder="Ví dụ: Thiết kế pixel rất mượt, màu sắc hiển thị tốt trên kính chắn gió ban đêm..."
            className="w-full border-2 border-black bg-neutral-50 p-2.5 font-mono text-xs shadow-[2px_2px_0_0_#000] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t-3 border-black pt-4">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black bg-white px-4 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-transform hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="border-2 border-black bg-[#fda4af] px-4 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-transform hover:bg-[#f43f5e] hover:text-white active:translate-x-0.5 active:translate-y-0.5"
          >
            Từ chối / Yêu cầu sửa
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="border-2 border-black bg-[#6ee7b7] px-5 py-2 font-mono text-xs font-black uppercase shadow-[4px_4px_0_0_#000] transition-transform hover:bg-[#10b981] hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            {isSubmitting ? "Đang xử lý..." : "✓ Duyệt & Publish lên Store"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
