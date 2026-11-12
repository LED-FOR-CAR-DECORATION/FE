"use client";

import { useState } from "react";
import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/features/auth/types";

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Khách hàng",
  DESIGNER: "Thiết kế",
  STAFF: "Nhân viên vận hành",
  MANAGER: "Quản lý cửa hàng",
  ADMIN: "Quản trị viên",
};

export default function ManagerTopBar() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      window.location.assign("/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Không thể đăng xuất. Vui lòng thử lại.");
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="manager-topbar h-16 bg-white border-b flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 flex items-center bg-gray-50 border-2 border-black px-3 py-1.5 gap-2 max-w-md">
        <Search size={15} className="text-primary-dark flex-shrink-0" />
        <input
          type="text"
          placeholder="Tìm đơn hàng, bảng LED, nhân vật..."
          className="bg-transparent outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 border border-transparent hover:border-primary-dark rounded-lg transition-colors" aria-label="Thông báo">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-lg cursor-pointer hover:bg-green-50 transition-colors">
          {/* Avatar placeholder */}
          <div className="w-7 h-7 bg-primary border flex items-center justify-center text-xs font-black flex-shrink-0 rounded-md">
            {user?.fullName?.charAt(0) ?? "M"}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black">{user?.fullName ?? "Người dùng"}</p>
            <p className="text-[10px] font-semibold text-text-muted">{user ? roleLabels[user.role] : "Khu vực quản trị"}</p>
          </div>
          <ChevronDown size={13} className="ml-1" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 text-xs font-black transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          aria-label="Đăng xuất"
        >
          <LogOut size={15} />
          {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
        </button>
      </div>
      {logoutError && <p role="alert" className="absolute right-6 top-[4.25rem] z-10 border-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{logoutError}</p>}
    </header>
  );
}
