"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Image,
  LayoutDashboard,
  MessageCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/features/auth/types";

type MenuItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  {
    label: "Tổng quan",
    description: "Thống kê và tình trạng hoạt động hệ thống",
    href: "/",
    icon: LayoutDashboard,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    label: "Quản lý đơn hàng",
    description: "Xác nhận đơn và chuẩn bị giao hàng",
    href: "/staff/orders",
    icon: ShoppingCart,
    roles: ["STAFF"],
  },
  {
    label: "Quản lý giao hàng",
    description: "Tạo yêu cầu và theo dõi vận chuyển",
    href: "/staff/deliveries",
    icon: Truck,
    roles: ["STAFF"],
  },
  {
    label: "Chatbox hỗ trợ",
    description: "Trả lời khách hàng và hỗ trợ sau bán hàng",
    href: "/staff/chat",
    icon: MessageCircle,
    roles: ["STAFF"],
  },
  {
    label: "Quản lý Commission",
    description: "Duyệt yêu cầu, báo giá và phân công Designer",
    href: "/staff/commission",
    icon: ClipboardList,
    roles: ["STAFF"],
  },
  {
    label: "Quản lý kho LED",
    description: "Theo dõi mẫu thiết bị và số lượng tồn kho",
    href: "/staff/inventory",
    icon: Boxes,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý đơn Character",
    description: "Theo dõi doanh thu và cấp quyền Character",
    href: "/manager/character-orders",
    icon: Image,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý Store Listing",
    description: "Quản lý sản phẩm, giá bán và hiển thị",
    href: "/staff/pricing",
    icon: Store,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý bảo hành",
    description: "Tra cứu và cập nhật thông tin bảo hành",
    href: "/staff/warranty",
    icon: ShieldCheck,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý trả thiết bị",
    description: "Tiếp nhận và cập nhật tình trạng trả",
    href: "/staff/returns",
    icon: RotateCcw,
    roles: ["MANAGER"],
  },
  {
    label: "Cấu hình giá Commission",
    description: "Thiết lập tiêu chí, tùy chọn và phụ thu",
    href: "/staff/commission/pricing",
    icon: Settings2,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý người dùng",
    description: "Xem, tạo, cập nhật và khóa tài khoản",
    href: "/admin/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    label: "Quản lý vai trò",
    description: "Quản lý Customer, Staff, Manager và Designer",
    href: "/admin/roles",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  {
    label: "Quản lý quyền hạn",
    description: "Thiết lập quyền truy cập chức năng",
    href: "/admin/permissions",
    icon: ShieldCheck,
    roles: ["ADMIN"],
  },
  {
    label: "Gán vai trò và quyền",
    description: "Gán role và cấu hình quyền cho role",
    href: "/admin/assignments",
    icon: Settings2,
    roles: ["ADMIN"],
  },
  {
    label: "Báo cáo và thống kê",
    description: "Số liệu đơn hàng, doanh thu và Commission",
    href: "/admin/reports",
    icon: ChartNoAxesCombined,
    roles: ["ADMIN"],
  },
];

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Khách hàng",
  DESIGNER: "Designer",
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
};

function getRoleHome(role: UserRole | undefined): string {
  if (role === "STAFF") return "/staff";
  if (role === "MANAGER") return "/manager";
  if (role === "ADMIN") return "/admin";
  return "/";
}

function MenuLink({ item, activeHref }: { item: MenuItem; activeHref?: string }) {
  const Icon = item.icon;
  const active = item.href === activeHref;

  return (
    <Link
      href={item.href}
      className={`manager-nav-link flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-primary border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          : "border-transparent hover:bg-primary/30"
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
  if (!items.length) return null;

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
  const { user } = useAuth();
  const role = user?.role;
  const visibleItems = menuItems.filter((item) => role && item.roles.includes(role));
  const overviewItem = visibleItems.find((item) => item.label === "Tổng quan");
  const roleOverviewItem = overviewItem
    ? { ...overviewItem, href: getRoleHome(role) }
    : undefined;
  const roleItems = visibleItems.filter((item) => item !== overviewItem);
  const profileItem: MenuItem | undefined = role === "ADMIN"
    ? {
        label: "Hồ sơ cá nhân",
        description: "Thông tin tài khoản của bạn",
        href: `${getRoleHome(role)}/profile`,
        icon: User,
        roles: [role],
      }
    : undefined;
  const activeHref = [...(roleOverviewItem ? [roleOverviewItem] : []), ...roleItems, ...(profileItem ? [profileItem] : [])]
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
          {role ? roleLabels[role] : "Quản trị"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Menu quản trị">
        <MenuSection label="Tổng quan" items={roleOverviewItem ? [roleOverviewItem] : []} activeHref={activeHref} />
        <MenuSection label={role === "ADMIN" ? "Quản trị hệ thống" : "Nghiệp vụ"} items={roleItems} activeHref={activeHref} />
      </nav>

      <div className="border-t px-2 py-3">
        <MenuSection label="Tài khoản" items={profileItem ? [profileItem] : []} activeHref={activeHref} />
      </div>
    </aside>
  );
}
