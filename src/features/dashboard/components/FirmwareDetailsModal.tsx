"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cpu, Download, X } from "lucide-react";
import type { FirmwareReleaseItem } from "../types";

export interface FirmwareDetailsModalProps {
  firmware: FirmwareReleaseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRolloutChange?: (item: FirmwareReleaseItem, percentage: number) => void;
}

const RELEASE_STATUS_LABELS: Record<FirmwareReleaseItem["status"], string> = {
  Released: "Đã phát hành",
  Staged: "Thử nghiệm",
  Draft: "Bản nháp",
  Deprecated: "Ngừng hỗ trợ",
};

export default function FirmwareDetailsModal({
  firmware,
  isOpen,
  onClose,
}: FirmwareDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !firmware) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] h-screen w-screen font-sans text-slate-900">
      <div
        className="fixed inset-0 z-[100] h-screen w-screen bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="firmware-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7"
      >
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Thông tin bản cập nhật thiết bị
              </span>
              <h2
                id="firmware-modal-title"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900"
              >
                {firmware.version}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-xs font-medium text-slate-500">
              Mã bản dựng
            </span>
            <span className="mt-1 block font-semibold text-slate-900">
              {firmware.buildNumber}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-xs font-medium text-slate-500">
              Trạng thái phát hành
            </span>
            <span className="mt-1 block font-semibold text-slate-900">
              {RELEASE_STATUS_LABELS[firmware.status]}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-xs font-medium text-slate-500">
              Dung lượng tệp
            </span>
            <span className="mt-1 block font-semibold text-slate-900 tabular-nums">
              {firmware.binarySize}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-xs font-medium text-slate-500">
              Tỷ lệ triển khai
            </span>
            <span className="mt-1 block font-semibold text-slate-900 tabular-nums">
              {firmware.rolloutPercentage}% (
              {firmware.downloadsCount.toLocaleString("vi-VN")} thiết bị)
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <span className="block text-xs font-medium text-slate-500">
            Mẫu thiết bị LED tương thích
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {firmware.targetModels.map((model) => (
              <span
                key={model}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {model}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600">
            Mã kiểm tra toàn vẹn (SHA-256)
          </label>
          <div className="mt-1.5 break-all rounded-xl border border-slate-200 bg-slate-900 px-3.5 py-2.5 text-xs text-emerald-400">
            {firmware.sha256}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600">
            Ghi chú thay đổi
          </label>
          <p className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-6 text-slate-700">
            {firmware.notes}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() =>
              alert(`Bắt đầu tải gói cài đặt: ${firmware.version}.bin`)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Tải gói cài đặt (.bin)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
