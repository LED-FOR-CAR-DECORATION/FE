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
  { label: "Dashboard",      href: "/staff",             icon: LayoutDashboard },
  { label: "Orders",         href: "/staff/orders",      icon: ShoppingCart },
  { label: "LED Inventory",  href: "/staff/inventory",   icon: Layers },
  { label: "Store Pricing",  href: "/staff/pricing",     icon: Tag },
  { label: "Commission",     href: "/staff/commission",  icon: Percent },
  { label: "Deliveries",     href: "/staff/deliveries",  icon: Truck },
  { label: "Warranty",       href: "/staff/warranty",    icon: Shield },
  { label: "Device Returns", href: "/staff/returns",     icon: RotateCcw },
];

const accountItems = [
  { label: "Profile",  href: "/manager/profile",  icon: User },
  { label: "Settings", href: "/manager/settings", icon: Settings },
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
          Manager
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
        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-3 mb-1">Account</p>
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
