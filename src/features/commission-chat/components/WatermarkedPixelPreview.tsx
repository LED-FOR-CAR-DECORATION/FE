"use client";

import React from "react";

export default function WatermarkedPixelPreview({
  characterName,
  isApproved = false,
}: {
  characterName: string;
  isApproved?: boolean;
}) {
  const dragonGrid = [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 2, 2, 1, 1, 2, 2, 1],
    [1, 2, 3, 2, 2, 3, 2, 1],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [1, 3, 2, 4, 4, 2, 3, 1],
    [2, 3, 2, 2, 2, 2, 3, 2],
    [0, 1, 3, 1, 1, 3, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
  ];

  const colorMap: Record<number, string> = {
    0: "bg-[#1a2421]",
    1: "bg-[#991b1b]",
    2: "bg-[#ef4444]",
    3: "bg-[#f97316]",
    4: "bg-[#fde047]",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#cfe3d0] bg-[#141e1b] p-5 shadow-sm select-none">
      {/* Khung lưới Pixel Art */}
      <div className="mx-auto grid h-44 w-44 grid-cols-8 gap-1 rounded-lg border-2 border-[#263832] bg-[#0f1715] p-2.5 shadow-inner">
        {dragonGrid.flat().map((cell, idx) => (
          <div
            key={idx}
            className={`rounded-[2px] ${colorMap[cell]} transition-transform duration-300`}
          />
        ))}
      </div>

      {/* Lớp phủ Watermark (chỉ hiển thị khi chưa phê duyệt) */}
      {!isApproved && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/15">
          <div className="-rotate-12 space-y-2 text-center">
            <p className="rounded border border-white/40 bg-black/50 px-3 py-1 text-xs font-black tracking-[0.2em] text-white/90 uppercase backdrop-blur-[1px]">
              MIRAGE WATERMARK • PREVIEW
            </p>
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-white/80 uppercase">
              BẢN NGHIỆM THU • CHƯA MỞ KHÓA FILE GỐC
            </p>
          </div>
        </div>
      )}

      {/* Chú thích tác phẩm */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#bfe3c8]">
        <span className="font-semibold">Tác phẩm: {characterName}</span>
        <span className="rounded bg-[#155e59] px-2 py-0.5 font-bold text-white">
          64x64 PX
        </span>
      </div>
    </div>
  );
}

