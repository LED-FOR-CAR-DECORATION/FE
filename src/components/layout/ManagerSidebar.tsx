"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";

type MenuItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const operationItems: MenuItem[] = [
  {
    label: "Quản lý đơn hàng",
    description: "Xem, xác nhận và chuẩn bị giao hàng",
    href: "/staff/orders",
    icon: ShoppingCart,
  },
  {
    label: "Quản lý giao hàng",
    description: "Tạo yêu cầu Ahamove và theo dõi vận chuyển",
    href: "/staff/deliveries",
    icon: Truck,
  },
  {
    label: "Chatbox hỗ trợ",
    description: "Trả lời khách hàng và hỗ trợ sau bán hàng",
    href: "/staff/chat",
    icon: MessageCircle,
  },
];

const managementItems: MenuItem[] = [
  {
    label: "Quản lý Commission",
    description: "Duyệt yêu cầu, báo giá và phân công Designer",
    href: "/staff/commission",
    icon: ClipboardList,
  },
  {
    label: "Quản lý kho LED",
    description: "Theo dõi mẫu thiết bị, tồn kho và kỹ thuật",
    href: "/staff/inventory",
    icon: Boxes,
  },
  {
    label: "Quản lý Store Listing",
    description: "Quản lý sản phẩm, giá bán và hiển thị",
    href: "/staff/pricing",
    icon: Store,
  },
  {
    label: "Quản lý bảo hành",
    description: "Tra cứu và cập nhật thông tin bảo hành",
    href: "/staff/warranty",
    icon: ShieldCheck,
  },
  {
    label: "Quản lý trả thiết bị",
    description: "Tiếp nhận và cập nhật tình trạng trả",
    href: "/staff/returns",
    icon: RotateCcw,
  },
  {
    label: "Cấu hình giá Commission",
    description: "Thiết lập tiêu chí, tùy chọn và phụ thu mặc định",
    href: "/staff/commission/pricing",
    icon: Settings2,
  },
];

const accountItems: MenuItem[] = [
  {
    label: "Hồ sơ cá nhân",
    description: "Thông tin tài khoản quản lý",
    href: "/manager/profile",
    icon: User,
  },
];

const allMenuItems = [
  { label: "Tổng quan", href: "/staff", icon: LayoutDashboard, description: "Bảng điều khiển vận hành" },
  ...operationItems,
  ...managementItems,
  ...accountItems,
];

function MenuLink({
  item,
  activeHref,
}: {
  item: MenuItem;
  activeHref?: string;
}) {
  const Icon = item.icon;
  const active = item.href === activeHref;

  return (
    <Link
      href={item.href}
      className={`manager-nav-link flex items-start gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
        active
          ? "bg-primary border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          : "hover:bg-primary/30 border-2 border-transparent"
      }`}
    >
      <Icon size={17} className="mt-0.5 flex-shrink-0" />
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{item.label}</span>
        <span className="mt-0.5 block text-[10px] font-medium leading-tight text-text-muted">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function MenuSection({
  label,
  items,
  activeHref,
}: {
  label: string;
  items: MenuItem[];
  activeHref?: string;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <h2 className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
        {label}
      </h2>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <MenuLink key={item.href} item={item} activeHref={activeHref} />
        ))}
      </div>
    </section>
  );
}

export default function ManagerSidebar() {
  const pathname = usePathname();
  const activeHref = [...allMenuItems]
    .sort((first, second) => second.href.length - first.href.length)
    .find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.href;

  return (
    <aside className="manager-sidebar flex min-h-screen w-72 flex-shrink-0 flex-col border-r bg-white">
      <div className="manager-brand flex items-center gap-2 border-b px-4 py-4">
        <div className="manager-brand-icon flex h-8 w-8 items-center justify-center border bg-primary text-xs font-black">
          M
        </div>
        <span className="text-base font-black tracking-tight">MIRAGE</span>
        <span className="ml-auto rounded-full border bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase">
          Quản lý
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Menu quản lý">
        <MenuSection
          label="Tổng quan"
          items={[allMenuItems[0]]}
          activeHref={activeHref}
        />
        <MenuSection label="Vận hành" items={operationItems} activeHref={activeHref} />
        <MenuSection label="Quản lý hệ thống" items={managementItems} activeHref={activeHref} />
      </nav>

      <div className="border-t px-2 py-3">
        <MenuSection label="Tài khoản" items={accountItems} activeHref={activeHref} />
      </div>
    </aside>
  );
}
