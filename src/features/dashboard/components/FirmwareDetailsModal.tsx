"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Cpu, Download, CheckCircle, ShieldCheck, Terminal, HardDrive } from "lucide-react";
import type { FirmwareReleaseItem } from "../types";

export interface FirmwareDetailsModalProps {
  firmware: FirmwareReleaseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRolloutChange?: (item: FirmwareReleaseItem, percentage: number) => void;
}

export default function FirmwareDetailsModal({
  firmware,
  isOpen,
  onClose,
}: FirmwareDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background page scrolling and listen to Escape key when modal is open
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
        aria-labelledby="firmware-modal-title"
        className="fixed left-1/2 top-1/2 z-[110] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000] sm:p-7"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-3 border-black pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border-2 border-black bg-[#a7f3d0] text-xl shadow-[2px_2px_0_0_#000]">
              <Cpu size={20} className="stroke-[2.5]" />
            </span>
            <div>
              <span className="border border-black bg-[#fef08a] px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                OTA FIRMWARE SPEC
              </span>
              <h2
                id="firmware-modal-title"
                className="mt-1 font-mono text-xl font-black text-black"
              >
                {firmware.version}
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

        {/* Specs Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2">
          <div className="border-2 border-black bg-[#e9d5ff] p-3 shadow-[2px_2px_0_0_#000]">
            <span className="block font-bold uppercase text-neutral-700">Mã Build:</span>
            <span className="text-sm font-black text-black">{firmware.buildNumber}</span>
          </div>

          <div className="border-2 border-black bg-[#a7f3d0] p-3 shadow-[2px_2px_0_0_#000]">
            <span className="block font-bold uppercase text-neutral-700">Trạng thái phát hành:</span>
            <span className="text-sm font-black uppercase text-black">{firmware.status}</span>
          </div>

          <div className="border-2 border-black bg-neutral-50 p-3 shadow-[2px_2px_0_0_#000]">
            <span className="block font-bold uppercase text-neutral-700">Dung lượng nhị phân:</span>
            <span className="text-sm font-black text-black">{firmware.binarySize}</span>
          </div>

          <div className="border-2 border-black bg-neutral-50 p-3 shadow-[2px_2px_0_0_#000]">
            <span className="block font-bold uppercase text-neutral-700">Tỷ lệ triển khai (Rollout):</span>
            <span className="text-sm font-black text-black">{firmware.rolloutPercentage}% ({firmware.downloadsCount.toLocaleString()} thiết bị)</span>
          </div>
        </div>

        {/* Target Models */}
        <div className="mt-4 border-2 border-black bg-[#fef08a] p-3 shadow-[2px_2px_0_0_#000]">
          <span className="block font-mono text-xs font-bold uppercase text-neutral-800">
            Phần cứng LED tương thích:
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {firmware.targetModels.map((m) => (
              <span
                key={m}
                className="border border-black bg-white px-2 py-0.5 font-mono text-[11px] font-black uppercase"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* SHA256 Checksum */}
        <div className="mt-4">
          <label className="block font-mono text-xs font-black uppercase text-black">
            Mã băm toàn vẹn SHA-256:
          </label>
          <div className="mt-1 break-all border-2 border-black bg-neutral-900 p-2.5 font-mono text-[10px] text-[#4ade80] shadow-[2px_2px_0_0_#000]">
            {firmware.sha256}
          </div>
        </div>

        {/* Release Notes */}
        <div className="mt-4">
          <label className="block font-mono text-xs font-black uppercase text-black">
            Ghi chú bản phát hành (Changelog):
          </label>
          <p className="mt-1 border-2 border-black bg-neutral-50 p-3 font-mono text-xs text-neutral-800 shadow-[2px_2px_0_0_#000]">
            {firmware.notes}
          </p>
        </div>

        {/* Footer Actions */}
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
            onClick={() => alert(`Bắt đầu tải file binary: ${firmware.version}.bin`)}
            className="flex items-center gap-1.5 border-2 border-black bg-[#a7f3d0] px-4 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-transform hover:bg-[#34d399] active:translate-x-0.5 active:translate-y-0.5"
          >
            <Download size={14} className="stroke-[2.5]" /> Tải Binary (.bin)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
