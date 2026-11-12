"use client";

import { Minus, Sparkles, X } from "lucide-react";
import Link from "next/link";

interface AuthWindowProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function AuthWindow({ title, subtitle, children, className = "" }: AuthWindowProps) {
  return (
    <div
      className={`w-full bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all ${className}`}
    >
      {/* Title bar - Retro OS Style */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-[#e3efe6] via-[#edf7f0] to-[#e3efe6] border-b-2 border-black select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black inline-block" />
          </div>
          <div className="h-4 w-px bg-black/20 mx-1" />
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles size={13} className="text-[#198653] shrink-0" />
            <span className="text-xs font-black tracking-wide text-[#173b28] truncate">{title}</span>
            {subtitle && (
              <span className="hidden sm:inline text-[10px] font-semibold text-text-muted truncate">
                · {subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
            className="w-5 h-5 border border-black bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
          >
            <Minus size={10} />
          </button>
          <Link
            href="/"
            title="Trở về trang chủ"
            aria-label="Trở về trang chủ"
            className="w-5 h-5 border border-black bg-white flex items-center justify-center hover:bg-red-100 hover:text-red-700 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
          >
            <X size={10} />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white">{children}</div>
    </div>
  );
}
