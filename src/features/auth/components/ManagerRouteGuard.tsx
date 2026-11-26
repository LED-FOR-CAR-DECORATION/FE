"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ManagerRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isAllowedPath =
    user?.role === "ADMIN" ||
    (user?.role === "STAFF" && pathname === "/staff") ||
    (user?.role === "MANAGER" && pathname === "/manager") ||
    (user?.role === "STAFF" && pathname.startsWith("/staff/profile")) ||
    (user?.role === "MANAGER" && pathname.startsWith("/manager/profile")) ||
    (user?.role === "STAFF" && ["/staff/orders", "/staff/deliveries", "/staff/commission", "/staff/chat", "/staff/warranty"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) ||
    (user?.role === "MANAGER" && ["/staff/pricing", "/staff/commission", "/staff/chat"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) ||
    (user?.role === "MANAGER" && ["/manager/inventory", "/manager/character-orders", "/manager/warranty", "/manager/tags"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) ||
    (user?.role === "DESIGNER" && (pathname === "/designer" || pathname.startsWith("/designer/")));

  const isInternalRole =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "STAFF" ||
    user?.role === "DESIGNER";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (!isInternalRole || !isAllowedPath) {
      router.replace(
        user?.role === "CUSTOMER"
          ? "/"
          : user?.role === "ADMIN"
            ? "/admin"
            : user?.role === "MANAGER"
              ? "/manager"
              : user?.role === "DESIGNER"
                ? "/designer/dashboard"
                : "/staff"
      );
    }
  }, [isAllowedPath, isAuthenticated, isInternalRole, isLoading, router, user?.role]);

  if (isLoading) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>;
  }
  if (!isAuthenticated) {
    return null;
  }
  if (!isInternalRole || !isAllowedPath) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang chuyển đến khu vực phù hợp...</main>;
  }

  return <>{children}</>;
}
