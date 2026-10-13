import React, { Suspense } from "react";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerTopBar from "@/components/layout/ManagerTopBar";

export default function ManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="manager-shell flex min-h-screen bg-background">
      <Suspense fallback={<ManagementSidebarFallback />}>
        <ManagerSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <ManagerTopBar />
        <main className="manager-main flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}

function ManagementSidebarFallback() {
  return (
    <aside className="manager-sidebar flex min-h-screen w-72 flex-shrink-0 flex-col border-r bg-white" aria-label="Đang tải menu quản trị">
      <div className="manager-brand h-[73px] border-b" />
      <div className="flex-1 p-3">
        <div className="h-10 animate-pulse rounded-lg bg-green-100" />
      </div>
    </aside>
  );
}
