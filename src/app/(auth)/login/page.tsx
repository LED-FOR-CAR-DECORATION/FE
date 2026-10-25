"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Cpu, Palette, ShieldCheck, Sparkles } from "lucide-react";
import AuthWindow from "@/components/ui/AuthWindow";
import LoginForm from "@/features/auth/components/LoginForm";

const safeRedirect = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/";

export default function LoginPage() {
  const [redirectTo, setRedirectTo] = useState("/");

  useEffect(() => {
    setRedirectTo(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
  }, []);

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#f5faf6]">
      {/* Left side: Pixel Art Branding Hero Banner */}
      <section className="hidden md:flex relative w-1/2 flex-col justify-between border-r-2 border-black bg-[#0d1f14] overflow-hidden p-8 lg:p-12 text-white">
        {/* Background Image with pixelated rendering */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth/login.png"
            alt="Banner Pixel Art"
            fill
            sizes="50vw"
            className="object-cover opacity-65"
            style={{ imageRendering: "pixelated" }}
            priority
          />
          {/* Subtle Cyberpunk/Retro Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1f15] via-[#0c1f15]/70 to-[#0c1f15]/80 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(137,200,155,0.25),transparent_60%)]" />
        </div>

        {/* Top Header: Logo & Back Link */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#89c89b] bg-[#165d3a] shadow-[2px_2px_0px_0px_#89c89b]">
              <span className="text-base font-black text-white">P</span>
            </div>
            <div>
              <span className="block text-lg font-black tracking-tight text-white leading-none">
                PIXEL HUB
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#89c89b]">
                LED Controller &amp; Store
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40"
          >
            <ArrowLeft size={13} />
            <span>Về trang chủ</span>
          </Link>
        </div>

        {/* Center: Highlights & Pitch */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#89c89b]/40 bg-[#165d3a]/60 px-3 py-1 text-xs font-black text-[#a3d7b2] backdrop-blur-md mb-4 shadow-sm">
            <Sparkles size={12} />
            <span>Hệ thống hiển thị LED kính xe thế hệ mới</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Tùy biến phong cách.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#89c89b] via-[#a3d7b2] to-white">
              Tỏa sáng trên mọi hành trình.
            </span>
          </h1>

          <p className="mt-4 text-sm font-medium text-gray-300 leading-relaxed">
            Nền tảng đồng bộ hóa phần cứng LED ma trận cùng kho Character Pixel Art độc quyền từ các Designer hàng đầu.
          </p>

          {/* Key Feature Cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <Cpu size={18} className="text-[#89c89b] mb-1.5" />
              <p className="text-xs font-bold text-white">Mô phỏng tức thì</p>
              <p className="text-[10px] text-gray-300">Đồng bộ trực tiếp thiết bị</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <Palette size={18} className="text-[#a3d7b2] mb-1.5" />
              <p className="text-xs font-bold text-white">Kho Character</p>
              <p className="text-[10px] text-gray-300">Pixel art động đa dạng</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <ShieldCheck size={18} className="text-[#89c89b] mb-1.5" />
              <p className="text-xs font-bold text-white">Quản lý Store</p>
              <p className="text-[10px] text-gray-300">Kiểm duyệt nghiêm ngặt</p>
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-4 text-[11px] font-semibold text-gray-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#27c93f] animate-pulse" />
            Hệ thống vận hành bình thường
          </span>
          <span>PIXEL HUB OS v2.4</span>
        </div>
      </section>

      {/* Right side: Login Window */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 min-h-screen relative overflow-y-auto">
        {/* Subtle grid pattern in the background */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#198653_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Mobile Header (shown only on small screens) */}
        <div className="md:hidden absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg border-2 border-black bg-primary flex items-center justify-center font-black">
              P
            </div>
            <span className="font-black text-sm tracking-tight">PIXEL HUB</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-md border border-black/20 bg-white px-2.5 py-1 text-xs font-bold text-text-muted hover:text-black"
          >
            <ArrowLeft size={12} /> Trang chủ
          </Link>
        </div>

        {/* Auth Window Container */}
        <div className="w-full max-w-md relative z-10 my-auto pt-12 md:pt-0">
          <AuthWindow title="Đăng nhập" subtitle="PIXEL HUB Authentication">
            <div className="px-5 py-6 sm:px-8 sm:py-7">
              <LoginForm redirectTo={redirectTo} />
            </div>
          </AuthWindow>

          {/* Guarantee / Security badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-text-muted">
            <ShieldCheck size={14} className="text-[#198653]" />
            <span>Hệ thống phân quyền an toàn &amp; phân định vai trò tự động</span>
          </div>
        </div>
      </section>
    </main>
  );
}
