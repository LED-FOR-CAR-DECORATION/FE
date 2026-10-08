"use client";

import Link from "next/link";
import { Search, ShoppingBag, Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

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
        aria-label="User menu"
      >
        <User size={22} />
        <span className="hidden md:inline max-w-[100px] truncate">{user?.name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 border-b-2 border-black"
          >
            <User size={15} /> My Profile
          </Link>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-red-50 text-red-600"
          >
            <LogOut size={15} /> Log out
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
        Login
      </Link>
      <Link
        href="/register"
        className="btn-primary text-sm px-4 py-1.5 font-bold"
      >
        Sign up
      </Link>
    </div>
  );
}

/* ── Header ── */
export default function Header() {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b-2 border-black">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="bg-white border-2 border-black px-4 py-1 font-bold text-xl neo-box-no-hover shadow-none"
          >
            Mirage
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-semibold">
            <Link href="/"        className="hover:underline underline-offset-4">SHOP</Link>
            <Link href="/about"   className="hover:underline underline-offset-4">ABOUT</Link>
            <Link href="/products" className="hover:underline underline-offset-4">PRODUCTS</Link>
          </nav>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="hidden md:flex items-center bg-white border-2 border-black px-3 py-1">
            <input
              type="text"
              placeholder="Search products..."
              className="outline-none bg-transparent w-48 text-sm"
            />
            <Search size={18} />
          </div>

          {/* Auth-aware zone */}
          {isAuthenticated ? (
            <>
              {/* Cart (only for logged-in users) */}
              <Link
                href="/cart"
                className="p-2 border-2 border-transparent hover:border-black rounded-md transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingBag size={24} />
                <span className="absolute top-0 right-0 bg-white text-black text-xs font-bold border-2 border-black rounded-full h-5 w-5 flex items-center justify-center translate-x-1 -translate-y-1">
                  2
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
            className="md:hidden p-2 border-2 border-black bg-white"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t-2 border-black px-4 py-4 flex flex-col gap-4 font-semibold">
          <Link href="/"         onClick={() => setMobileOpen(false)}>SHOP</Link>
          <Link href="/about"    onClick={() => setMobileOpen(false)}>ABOUT</Link>
          <Link href="/products" onClick={() => setMobileOpen(false)}>PRODUCTS</Link>
          {!isAuthenticated && (
            <div className="flex gap-2 pt-2 border-t-2 border-black">
              <Link href="/login"    onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center text-sm py-1.5">Login</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-primary  flex-1 text-center text-sm py-1.5">Sign up</Link>
            </div>
          )}
        </div>
      )}

      {/* Marquee banner */}
      <div className="w-full bg-white border-t-2 border-black h-8 flex items-center overflow-hidden">
        <div className="flex gap-8 whitespace-nowrap animate-pulse text-xs font-bold text-primary-dark tracking-widest uppercase">
          <span>NEW DESIGNS AVAILABLE</span>
          <span>FLASH SALE: 20% OFF 32x32 PANELS</span>
          <span>FREE SHIPPING ON ORDERS OVER $50</span>
          <span>NEW DESIGNS AVAILABLE</span>
          <span>FLASH SALE: 20% OFF 32x32 PANELS</span>
          <span>FREE SHIPPING ON ORDERS OVER $50</span>
        </div>
      </div>
    </header>
  );
}
