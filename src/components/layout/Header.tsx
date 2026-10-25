"use client";

import Link from "next/link";
import { Search, ShoppingBag, Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCart } from "@/features/cart/context/CartContext";

/* ── User dropdown (shown when logged in) ── */
function UserDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Close when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 p-2 border-2 border-transparent hover:border-black rounded-md transition-colors font-semibold text-sm"
        aria-label="Trình đơn người dùng"
      >
        <User size={22} />
        <span className="hidden md:inline max-w-[100px] truncate">{user?.fullName}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 border-b-2 border-black"
          >
            <User size={15} /> Hồ sơ của tôi
          </Link>
          <Link
            href="/profile/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 border-b-2 border-black"
          >
            <ShoppingBag size={15} /> Lịch sử đơn hàng
          </Link>
          <Link
            href="/profile/gallery"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-b-2 border-black px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
          >
            <ShoppingBag size={15} /> Thư viện nhân vật
          </Link>
          {user?.role === "CUSTOMER" && (
            <Link
              href="/commission"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-b-2 border-black px-4 py-2.5 text-sm font-semibold hover:bg-[#eaf5e8]"
            >
              Yêu cầu thiết kế
            </Link>
          )}
          <button
            onClick={async () => { await logout(); setOpen(false); window.location.assign("/"); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-red-50 text-red-600"
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Guest buttons (shown when NOT logged in) ── */
function GuestButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="btn-secondary text-sm px-4 py-1.5 font-bold"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="btn-primary text-sm px-4 py-1.5 font-bold"
      >
        Đăng ký
      </Link>
    </div>
  );
}

/* ── Header ── */
export default function Header() {
  const { isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#d7e2d8] bg-[#8fc7a0]">
      <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-4 lg:px-8">
        
        {/* Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="rounded-lg border-2 border-[#155e59] bg-[#fffdf5] px-4 py-1.5 text-xl font-black tracking-tight text-[#155e59] shadow-[3px_3px_0_#155e59]">
            MIRAGE
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-[#155e59] md:flex">
            <Link href="/" className="transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white">CỬA HÀNG</Link>
            <Link href="/about" className="transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white">GIỚI THIỆU</Link>
          </nav>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="hidden items-center rounded-lg border border-[#b7d1ba] bg-white px-3 py-2 md:flex">
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              className="w-64 bg-transparent text-sm text-[#26352f] outline-none placeholder:text-[#66736b]"
            />
            <Search size={18} className="text-[#155e59]" />
          </div>

          {/* Auth-aware zone */}
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse bg-white/60 border-2 border-black" aria-label="Đang tải phiên đăng nhập" />
          ) : isAuthenticated ? (
            <>
              {/* Cart (only for logged-in users) */}
              <Link
                href="/cart"
                className="relative rounded-lg p-2 text-[#155e59] transition-colors hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Giỏ hàng"
              >
                <ShoppingBag size={24} />
                <span className="absolute right-0 top-0 flex h-5 w-5 -translate-y-1 translate-x-1 items-center justify-center rounded-full border border-[#155e59] bg-[#f2a65a] text-xs font-bold text-[#26352f]">
                  {itemCount}
                </span>
              </Link>
              <UserDropdown />
            </>
          ) : (
            <GuestButtons />
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="border border-[#155e59] bg-white p-2 text-[#155e59] md:hidden"
            aria-label="Mở trình đơn"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t-2 border-black px-4 py-4 flex flex-col gap-4 font-semibold">
          <Link href="/"         onClick={() => setMobileOpen(false)}>CỬA HÀNG</Link>
          <Link href="/about"    onClick={() => setMobileOpen(false)}>GIỚI THIỆU</Link>
          {!isLoading && !isAuthenticated && (
            <div className="flex gap-2 pt-2 border-t-2 border-black">
              <Link href="/login"    onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center text-sm py-1.5">Đăng nhập</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-primary  flex-1 text-center text-sm py-1.5">Đăng ký</Link>
            </div>
          )}
        </div>
      )}

      {/* Marquee banner */}
      <div className="w-full bg-white border-t-2 border-black h-8 flex items-center overflow-hidden">
        <div className="flex gap-8 whitespace-nowrap animate-pulse text-xs font-bold text-primary-dark tracking-widest uppercase">
          <span>CÓ THIẾT KẾ MỚI</span>
          <span>GIẢM 20% BẢNG LED 32x32</span>
          <span>MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TRÊN $50</span>
          <span>CÓ THIẾT KẾ MỚI</span>
          <span>GIẢM 20% BẢNG LED 32x32</span>
          <span>MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TRÊN $50</span>
        </div>
      </div>
    </header>
  );
}
