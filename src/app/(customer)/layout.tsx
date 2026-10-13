import React, { Suspense } from "react";
import CustomerRouteGuard from "@/features/auth/components/CustomerRouteGuard";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang tải...</main>}>
      <CustomerRouteGuard>{children}</CustomerRouteGuard>
    </Suspense>
  );
}
