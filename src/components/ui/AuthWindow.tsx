"use client";

import { Minus, X } from "lucide-react";
import Link from "next/link";

interface AuthWindowProps {
  title: string;
  children: React.ReactNode;
}

export default function AuthWindow({ title, children }: AuthWindowProps) {
  return (
    <div className="w-full bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#d9d9d9] border-b-2 border-black">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary border-2 border-black flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black" />
          </div>
          <span className="text-xs font-bold tracking-wide text-black">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-gray-100 transition-colors">
            <Minus size={12} />
          </button>
          <Link href="/" className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center hover:bg-red-100 transition-colors">
            <X size={12} />
          </Link>
        </div>
      </div>
      {/* Body */}
      <div>{children}</div>
    </div>
  );
}
