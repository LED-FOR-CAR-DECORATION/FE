"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Tag,
  Percent,
  Truck,
  Shield,
  RotateCcw,
  User,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Tổng quan",          href: "/staff",             icon: LayoutDashboard },
  { label: "Đơn hàng",           href: "/staff/orders",      icon: ShoppingCart },
  { label: "Kho LED",             href: "/staff/inventory",   icon: Layers },
  { label: "Giá cửa hàng",       href: "/staff/pricing",     icon: Tag },
  { label: "Hoa hồng",            href: "/staff/commission",  icon: Percent },
  { label: "Đơn giao hàng",       href: "/staff/deliveries",  icon: Truck },
  { label: "Bảo hành",            href: "/staff/warranty",    icon: Shield },
  { label: "Đổi trả thiết bị",    href: "/staff/returns",     icon: RotateCcw },
];

const accountItems = [
  { label: "Hồ sơ",    href: "/manager/profile",  icon: User },
  { label: "Cài đặt",  href: "/manager/settings", icon: Settings },
];

export default function ManagerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-white border-r-2 border-black flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b-2 border-black">
        {/* Pixel icon placeholder */}
        <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center text-xs font-black">
          PH
        </div>
        <span className="font-black text-base tracking-tight">PIXEL HUB</span>
        <span className="ml-auto bg-primary border-2 border-black text-[10px] font-black px-1.5 py-0.5 uppercase">
          Quản lý
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/staff" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-none transition-colors
                ${active
                  ? "bg-primary border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "hover:bg-primary/30 border-2 border-transparent"
                }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Account section */}
      <div className="border-t-2 border-black px-2 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-3 mb-1">Tài khoản</p>
        {accountItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors
                ${active
                  ? "bg-primary border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "hover:bg-primary/30 border-2 border-transparent"
                }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
