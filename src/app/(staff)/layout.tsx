import React, { Suspense } from "react";
import ManagementShell from "@/components/layout/ManagementShell";
import ManagerRouteGuard from "@/features/auth/components/ManagerRouteGuard";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>}>
      <ManagerRouteGuard>
        <ManagementShell>{children}</ManagementShell>
      </ManagerRouteGuard>
    </Suspense>
  );
}
