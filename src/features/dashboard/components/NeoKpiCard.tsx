"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import type { NeoRetroColor } from "../types";

export interface NeoKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorTheme?: NeoRetroColor;
  growth?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  badge?: {
    text: string;
    tone?: "alert" | "success" | "warning" | "neutral" | "purple";
  };
  helperText?: string;
  isWarning?: boolean;
  actionButton?: {
    label: string;
    onClick?: () => void;
  };
}

const COLOR_MAP: Record<NeoRetroColor, { bg: string; accent: string }> = {
  mint: { bg: "bg-[#a7f3d0]", accent: "bg-[#34d399]" },
  yellow: { bg: "bg-[#fef08a]", accent: "bg-[#facc15]" },
  lavender: { bg: "bg-[#e9d5ff]", accent: "bg-[#c084fc]" },
  coral: { bg: "bg-[#fed7aa]", accent: "bg-[#fb923c]" },
  cyan: { bg: "bg-[#bae6fd]", accent: "bg-[#38bdf8]" },
  white: { bg: "bg-white", accent: "bg-gray-100" },
};

export default function NeoKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorTheme = "white",
  growth,
  badge,
  helperText,
  isWarning = false,
  actionButton,
}: NeoKpiCardProps) {
  const theme = COLOR_MAP[colorTheme];

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden border-3 border-black p-5 transition-all duration-150 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 ${
        theme.bg
      } shadow-[4px_4px_0_0_#000]`}
    >
      {/* Retro decorative corner pixel notch */}
      <div className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 border-b-2 border-l-2 border-black bg-black" />

      {/* Header section with Icon, Title and Badges */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
              <Icon size={22} className="text-black stroke-[2.2]" />
            </div>
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-wider text-black">
                {title}
              </p>
              {subtitle && (
                <p className="text-[11px] font-semibold text-neutral-700">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Alert / Status Badge */}
          {badge && (
            <span
              className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 font-mono text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000] ${
                badge.tone === "alert"
                  ? "bg-[#fda4af] text-black"
                  : badge.tone === "warning"
                  ? "bg-[#fed7aa] text-black"
                  : badge.tone === "success"
                  ? "bg-[#86efac] text-black"
                  : badge.tone === "purple"
                  ? "bg-[#d8b4fe] text-black"
                  : "bg-white text-black"
              }`}
            >
              {isWarning && <AlertTriangle size={12} className="stroke-[3]" />}
              {badge.text}
            </span>
          )}
        </div>

        {/* Main Metric Value */}
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <div className="font-mono text-3xl font-black tracking-tight text-black sm:text-4xl">
            {value}
          </div>

          {/* Growth Rate Indicator */}
          {growth && (
            <div
              className={`inline-flex items-center gap-0.5 border-2 border-black px-2 py-0.5 font-mono text-xs font-black shadow-[2px_2px_0_0_#000] ${
                growth.isPositive
                  ? "bg-[#6ee7b7] text-black"
                  : "bg-[#fca5a5] text-black"
              }`}
            >
              {growth.isPositive ? (
                <ArrowUpRight size={14} className="stroke-[3]" />
              ) : (
                <ArrowDownRight size={14} className="stroke-[3]" />
              )}
              <span>{growth.value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Helper Text / Action */}
      <div className="mt-4 flex items-center justify-between border-t-2 border-black/80 pt-3">
        {growth?.label ? (
          <span className="font-mono text-[11px] font-bold text-black/80">
            {growth.label}
          </span>
        ) : helperText ? (
          <span className="font-mono text-[11px] font-bold text-black/80">
            {helperText}
          </span>
        ) : (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/60">
            ● Realtime Synced
          </span>
        )}

        {actionButton && (
          <button
            type="button"
            onClick={actionButton.onClick}
            className="border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {actionButton.label}
          </button>
        )}
      </div>
    </div>
  );
}
