/** Menu entries and role helpers for the internal (back-office) shell. */
import {
  Boxes,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  MessageCircle,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/features/auth/types";

export type MenuItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const menuItems: MenuItem[] = [
  {
    label: "Danh sách nhân vật",
    description: "Quản lý danh sách nhân vật & phiên bản",
    href: "/designer/characters",
    icon: Sparkles,
    roles: ["DESIGNER"],
  },
  {
    label: "Đăng bán",
    description: "Chỉnh sửa thông tin và gửi phiên bản nhân vật lên Store",
    href: "/designer/publish",
    icon: Store,
    roles: ["DESIGNER"],
  },
  {
    label: "Đăng tải yêu cầu thiết kế",
    description: "Tải bản thiết kế cho yêu cầu được giao",
    href: "/designer/commissions",
    icon: ClipboardList,
    roles: ["DESIGNER"],
  },
  {
    label: "Tổng quan",
    description: "Thống kê và tình trạng hoạt động hệ thống",
    href: "/",
    icon: LayoutDashboard,
    roles: ["DESIGNER", "STAFF", "MANAGER", "ADMIN"],
  },
  {
    label: "Quản lý đơn hàng",
    description: "Xác nhận đơn và chuẩn bị giao hàng",
    href: "/staff/orders",
    icon: ShoppingCart,
    roles: ["STAFF"],
  },
  {
    label: "Quản lý Yêu cầu thiết kế nhân vật",
    description: "Duyệt yêu cầu, báo giá và phân công nhà thiết kế",
    href: "/staff/commission",
    icon: ClipboardList,
    roles: ["STAFF", "ADMIN"],
  },
  {
    label: "Tin nhắn khách hàng",
    description: "Trao đổi với khách, duyệt bản nháp và gửi thẻ chỉnh sửa",
    href: "/staff/chat",
    icon: MessageCircle,
    roles: ["STAFF"],
  },
  {
    label: "Quản lý kho LED",
    description: "Theo dõi mẫu thiết bị và số lượng tồn kho",
    href: "/manager/inventory",
    icon: Boxes,
    roles: ["MANAGER"],
  },

  {
    label: "Quản lý cửa hàng sản phẩm",
    description: "Quản lý sản phẩm, giá bán và hiển thị",
    href: "/staff/pricing",
    icon: Store,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý thẻ sản phẩm",
    description: "Tạo, sửa và xóa thẻ danh mục phân loại",
    href: "/staff/tags",
    icon: Tag,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    label: "Quản lý bảo hành",
    description: "Tra cứu và cập nhật thông tin bảo hành",
    href: "/staff/warranty",
    icon: ShieldCheck,
    roles: ["MANAGER", "STAFF", "ADMIN"],
  },
  {
    label: "Cấu hình giá Yêu cầu thiết kế",
    description: "Thiết lập tiêu chí, tùy chọn và phụ thu",
    href: "/staff/commission/pricing",
    icon: Settings2,
    roles: ["MANAGER"],
  },
  {
    label: "Quản lý người dùng",
    description: "Xem danh sách tài khoản nội bộ",
    href: "/admin/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    label: "Quản lý firmware",
    description: "Phát hành, theo dõi và thu hồi firmware OTA cho mẫu LED",
    href: "/admin/firmware",
    icon: Cpu,
    roles: ["ADMIN"],
  },
];

export const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Khách hàng",
  DESIGNER: "Designer",
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
};

export function getRoleHome(role: UserRole | undefined): string {
  if (role === "STAFF") return "/staff";
  if (role === "MANAGER") return "/manager";
  if (role === "ADMIN") return "/admin";
  if (role === "DESIGNER") return "/designer/dashboard";
  return "/";
}
