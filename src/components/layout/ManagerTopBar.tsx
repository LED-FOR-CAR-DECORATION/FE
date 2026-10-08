"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ManagerTopBar() {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-white border-b-2 border-black flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 flex items-center bg-gray-50 border-2 border-black px-3 py-1.5 gap-2 max-w-md">
        <Search size={15} className="text-text-muted flex-shrink-0" />
        <input
          type="text"
          placeholder="Tìm đơn hàng, bảng LED, nhân vật..."
          className="bg-transparent outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 border-2 border-transparent hover:border-black transition-colors" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 border-2 border-black px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors">
          {/* Avatar placeholder */}
          <div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center text-xs font-black flex-shrink-0">
            {user?.name?.charAt(0) ?? "M"}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black">{user?.name ?? "Manager"}</p>
            <p className="text-[10px] text-text-muted font-semibold">Quản lý cửa hàng</p>
          </div>
          <ChevronDown size={13} className="ml-1" />
        </div>
      </div>
    </header>
  );
}
