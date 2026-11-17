"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  ClipboardList,
  Edit2,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  User,
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
  const isCommissionActive = pathname.startsWith("/commission");

  const navItems = [
    {
      href: "/profile",
      label: "Tài Khoản Của Tôi",
      active: isAccountActive,
      icon: (
        <User
          size={17}
          className={isAccountActive ? "text-[#155e59]" : "text-blue-600"}
        />
      ),
    },
    {
      href: "/profile/orders",
      label: "Đơn Mua",
      active: isOrdersActive,
      icon: (
        <ClipboardList
          size={17}
          className={isOrdersActive ? "text-[#155e59]" : "text-[#155e59]/80"}
        />
      ),
    },
    {
      href: "/profile/gallery",
      label: "Thư Viện Nhân Vật",
      active: isGalleryActive,
      icon: (
        <ImageIcon
          size={17}
          className={isGalleryActive ? "text-[#155e59]" : "text-emerald-600"}
        />
      ),
    },
    {
      href: "/profile/warranty",
      label: "Bảo Hành Thiết Bị",
      active: isWarrantyActive,
      icon: (
        <ShieldCheck
          size={17}
          className={isWarrantyActive ? "text-[#155e59]" : "text-emerald-600"}
        />
      ),
    },
    {
      href: "/commission",
      label: "Yêu Cầu Thiết Kế",
      active: isCommissionActive,
      icon: (
        <Sparkles
          size={17}
          className={isCommissionActive ? "text-[#155e59]" : "text-amber-500"}
        />
      ),
    },
  ];

  return (
    <aside className="w-full shrink-0 lg:w-56">
      {/* User Info */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-[#155e59] text-lg font-black text-white shadow-sm">
          {avatarInitial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {displayName}
          </p>
          <Link
            href="/profile"
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-[#155e59]"
          >
            <Edit2 size={11} /> Sửa Hồ Sơ
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mt-4 flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible no-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              item.active
                ? "bg-white font-bold text-[#155e59] shadow-xs"
                : "font-medium text-gray-700 hover:bg-white hover:text-[#155e59]"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

