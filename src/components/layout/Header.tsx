"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Menu,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  MessageCircle,
  ClipboardList,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleHomePath } from "@/features/auth/services/auth.service";
import { useCart } from "@/features/cart/context/CartContext";
import { SITE } from "@/config/site";

/* ── User dropdown (shown when logged in) ── */
function UserDropdown() {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInternalRole = Boolean(user?.role) && user?.role !== "CUSTOMER";

  const customerMenuItems = [
    {
      href: "/profile",
      label: "Tài khoản của tôi",
      icon: User,
      active:
        pathname === "/profile" ||
        pathname.startsWith("/profile/account") ||
        pathname.startsWith("/profile/addresses"),
    },
    {
      href: "/profile/orders",
      label: "Lịch sử đơn mua",
      icon: ClipboardList,
      active: pathname.startsWith("/profile/orders"),
    },
    {
      href: "/profile/gallery",
      label: "Thư viện nhân vật",
      icon: ImageIcon,
      active: pathname.startsWith("/profile/gallery"),
    },
    {
      href: "/profile/warranty",
      label: "Bảo hành thiết bị",
      icon: ShieldCheck,
      active: pathname.startsWith("/profile/warranty"),
    },
    {
      href: "/profile/commissions",
      label: "Yêu cầu thiết kế",
      icon: Sparkles,
      active: pathname.startsWith("/profile/commissions") || pathname.startsWith("/commission"),
    },
    {
      href: "/messages",
      label: "Hộp thư tin nhắn",
      icon: MessageCircle,
      active: pathname.startsWith("/messages"),
    },
  ];

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        aria-label="Trình đơn người dùng"
      >
        <User size={18} />
        <span className="hidden max-w-[120px] truncate md:inline">{user?.fullName}</span>
        <ChevronDown size={14} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] z-50">
          {isInternalRole ? (
            <Link
              href={getRoleHomePath(user?.role)}
              onClick={() => setOpen(false)}
              className="cursor-pointer flex items-center gap-2 border-b-2 border-black px-4 py-2.5 text-xs font-bold uppercase text-black transition-colors hover:bg-primary/20"
            >
              <LayoutDashboard size={15} /> Khu vực làm việc
            </Link>
          ) : (
            <>
              {customerMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`cursor-pointer flex items-center gap-2.5 border-b-2 border-black px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-colors ${
                      item.active ? "bg-primary" : "hover:bg-primary/20"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={item.active ? "text-black" : "text-primary-ink"}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              setOpen(false);
              window.location.assign(isInternalRole ? "/login" : "/");
            }}
            className="cursor-pointer flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
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
        className="btn-secondary px-3.5 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="btn-primary px-3.5 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
      >
        Đăng ký
      </Link>
    </div>
  );
}

/* ── Header ── */
export default function Header() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { user, isAuthenticated, isLoading } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isCustomer = !user?.role || user.role === "CUSTOMER";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else if (pathname.startsWith("/products")) {
      router.push("/products");
    } else {
      router.push("/products");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-primary">
      <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-4 lg:px-8">
        
        {/* Logo + Nav */}
        <div className="flex items-center gap-7">
          <Link
            href="/"
            className="cursor-pointer whitespace-nowrap border-2 border-black bg-white px-3 py-1.5 text-lg font-black uppercase tracking-wider text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:px-4 sm:text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {SITE.name}
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-wider text-black md:flex">
            <Link
              href="/products"
              className={`cursor-pointer transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                pathname.startsWith("/products") ? "border-b-2 border-black pb-0.5" : ""
              }`}
            >
              Cửa hàng
            </Link>
            <Link
              href="/subscriptions"
              className={`cursor-pointer transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                pathname === "/subscriptions" ? "border-b-2 border-black pb-0.5" : ""
              }`}
            >
              Gói hội viên
            </Link>
            <Link
              href="/about"
              className={`cursor-pointer transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                pathname === "/about" ? "border-b-2 border-black pb-0.5" : ""
              }`}
            >
              Giới thiệu
            </Link>
            <Link
              href="/commission"
              className={`cursor-pointer inline-flex items-center gap-1.5 transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                pathname.startsWith("/commission") ? "border-b-2 border-black pb-0.5" : ""
              }`}
            >
              <Sparkles size={14} aria-hidden="true" />
              Thiết kế riêng
            </Link>
          </nav>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden items-center border-2 border-black bg-white px-3 py-1.5 shadow-[2px_2px_0_0_#000] transition-shadow focus-within:shadow-[3px_3px_0_0_#000] md:flex"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-52 bg-transparent text-xs font-bold text-text-main placeholder:text-text-muted focus:outline-none"
            />
            <button type="submit" aria-label="Tìm kiếm" className="cursor-pointer text-black hover:text-primary-ink">
              <Search size={16} />
            </button>
          </form>

          {/* Auth-aware zone */}
          {isLoading ? (
            <div
              className="h-9 w-24 animate-pulse border-2 border-black bg-white/70 shadow-[2px_2px_0_0_#000]"
              aria-label="Đang tải phiên đăng nhập"
            />
          ) : isAuthenticated ? (
            <>
              {isCustomer && (
                <Link
                  href="/cart"
                  className="cursor-pointer relative flex items-center justify-center border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-label={`Giỏ hàng (${itemCount} sản phẩm)`}
                >
                  <ShoppingBag size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center border-2 border-black bg-primary px-1 text-[11px] font-black text-black shadow-[1px_1px_0_0_#000]">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}
              <UserDropdown />
            </>
          ) : (
            <GuestButtons />
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="cursor-pointer border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            aria-label={mobileOpen ? "Đóng trình đơn" : "Mở trình đơn"}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="flex flex-col gap-3 border-t-2 border-black bg-white px-5 py-4 text-xs font-black uppercase tracking-wider md:hidden">
          <form
            onSubmit={(e) => {
              handleSearchSubmit(e);
              setMobileOpen(false);
            }}
            className="mb-2 flex items-center border-2 border-black bg-gray-50 px-3 py-2 shadow-[2px_2px_0_0_#000]"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full bg-transparent text-xs font-bold text-text-main placeholder:text-text-muted focus:outline-none"
            />
            <button type="submit" aria-label="Tìm kiếm" className="cursor-pointer text-black">
              <Search size={16} />
            </button>
          </form>
          <Link
            href="/products"
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer border-b-2 border-black pb-2 text-black hover:text-primary-ink"
          >
            Cửa hàng
          </Link>
          <Link
            href="/subscriptions"
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer border-b-2 border-black pb-2 text-black hover:text-primary-ink"
          >
            Gói hội viên
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer border-b-2 border-black pb-2 text-black hover:text-primary-ink"
          >
            Giới thiệu
          </Link>
          <Link
            href="/commission"
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer border-b-2 border-black pb-2 text-black hover:text-primary-ink"
          >
            Thiết kế riêng
          </Link>
          {!isLoading && !isAuthenticated && (
            <div className="flex gap-2 border-t-2 border-black pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-secondary flex-1 text-center text-xs font-black uppercase py-2"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="btn-primary flex-1 text-center text-xs font-black uppercase py-2"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Marquee banner */}
      <div className="flex h-8 w-full items-center overflow-hidden border-t-2 border-black bg-white">
        <div className="animate-marquee text-[11px] font-black uppercase tracking-wider text-black">
          {[0, 1].map((loopIdx) => (
            <div key={loopIdx} aria-hidden={loopIdx === 1} className="flex shrink-0 items-center gap-8 pr-8 whitespace-nowrap">
              <span>BỘ SƯU TẬP NHÂN VẬT MỚI</span>
              <span aria-hidden="true">•</span>
              <span>BẢNG LED CHÍNH HÃNG</span>
              <span aria-hidden="true">•</span>
              <span>NHẬN THIẾT KẾ RIÊNG</span>
              <span aria-hidden="true">•</span>
              <span>BỘ SƯU TẬP NHÂN VẬT MỚI</span>
              <span aria-hidden="true">•</span>
              <span>BẢNG LED CHÍNH HÃNG</span>
              <span aria-hidden="true">•</span>
              <span>NHẬN THIẾT KẾ RIÊNG</span>
              <span aria-hidden="true">•</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
