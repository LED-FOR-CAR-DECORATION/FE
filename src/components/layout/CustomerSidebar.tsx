"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  ClipboardList,
  Edit2,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  User,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CustomerSidebar() {
  const { user } = useAuth();
  const pathname = usePathname() ?? "";

  const displayName = user?.fullName ?? "Khách hàng";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "K";

  const isAccountActive =
    pathname === "/profile" ||
    pathname.startsWith("/profile/account") ||
    pathname.startsWith("/profile/addresses");
  const isOrdersActive = pathname.startsWith("/profile/orders");
  const isGalleryActive = pathname.startsWith("/profile/gallery");
  const isWarrantyActive = pathname.startsWith("/profile/warranty");
  const isCommissionActive =
    pathname.startsWith("/profile/commissions") || pathname.startsWith("/commission");
  const isMessagesActive = pathname.startsWith("/messages");

  const navItems = [
    {
      href: "/profile",
      label: "Tài khoản của tôi",
      active: isAccountActive,
      icon: <User size={16} className={isAccountActive ? "text-black" : "text-primary-ink"} />,
    },
    {
      href: "/profile/orders",
      label: "Lịch sử đơn mua",
      active: isOrdersActive,
      icon: <ClipboardList size={16} className={isOrdersActive ? "text-black" : "text-primary-ink"} />,
    },
    {
      href: "/profile/gallery",
      label: "Thư viện nhân vật",
      active: isGalleryActive,
      icon: <ImageIcon size={16} className={isGalleryActive ? "text-black" : "text-primary-ink"} />,
    },
    {
      href: "/profile/warranty",
      label: "Bảo hành thiết bị",
      active: isWarrantyActive,
      icon: <ShieldCheck size={16} className={isWarrantyActive ? "text-black" : "text-primary-ink"} />,
    },
    {
      href: "/profile/commissions",
      label: "Yêu cầu thiết kế",
      active: isCommissionActive,
      icon: <Sparkles size={16} className={isCommissionActive ? "text-black" : "text-primary-ink"} />,
    },
    {
      href: "/messages",
      label: "Hộp thư tin nhắn",
      active: isMessagesActive,
      icon: <MessageCircle size={16} className={isMessagesActive ? "text-black" : "text-primary-ink"} />,
    },
  ];

  return (
    <aside className="neo-box-no-hover w-full shrink-0 bg-white p-4 lg:w-60">
      {/* User Info */}
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-primary text-base font-black text-black shadow-[2px_2px_0_0_#000]">
          {avatarInitial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase text-black">
            {displayName}
          </p>
          <Link
            href="/profile"
            className="cursor-pointer mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-primary-ink hover:underline"
          >
            <Edit2 size={11} /> Sửa hồ sơ
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mt-4 flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible no-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`cursor-pointer flex shrink-0 items-center gap-2.5 border-2 px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              item.active
                ? "border-black bg-primary text-black shadow-[2px_2px_0_0_#000]"
                : "border-transparent text-text-main hover:border-black hover:bg-gray-50"
            }`}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
