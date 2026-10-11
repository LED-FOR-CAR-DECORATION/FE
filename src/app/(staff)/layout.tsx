import React, { Suspense } from "react";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerTopBar from "@/components/layout/ManagerTopBar";
import ManagerRouteGuard from "@/features/auth/components/ManagerRouteGuard";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>}>
      <ManagerRouteGuard>
        <div className="manager-shell flex min-h-screen bg-background">
          <Suspense fallback={<ManagerSidebarFallback />}>
            <ManagerSidebar />
          </Suspense>
          <div className="flex-1 flex flex-col min-w-0">
            <ManagerTopBar />
            <main className="manager-main flex-1 overflow-y-auto p-6 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </ManagerRouteGuard>
    </Suspense>
  );
}

function ManagerSidebarFallback() {
  return (
    <aside className="manager-sidebar w-60 min-h-screen bg-white border-r flex flex-col flex-shrink-0" aria-label="Đang tải menu quản lý">
      <div className="manager-brand h-[73px] border-b" />
      <div className="flex-1 p-3">
        <div className="h-10 rounded-lg bg-green-100 animate-pulse" />
      </div>
    </aside>
  );
}
