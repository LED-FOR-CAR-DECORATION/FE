"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (user?.role !== "ADMIN") {
      router.replace(user?.role === "CUSTOMER" ? "/" : user?.role === "MANAGER" ? "/manager" : "/staff");
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== "ADMIN") {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-text-muted">Đang chuyển đến khu vực phù hợp...</main>;
  }

  return <>{children}</>;
}
