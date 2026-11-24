"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getRoleHomePath } from "@/features/auth/services/auth.service";

const protectedRoutes = ["/cart", "/checkout", "/commission", "/profile"];

export default function CustomerRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const protectedPage = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isInternalUser = isAuthenticated && Boolean(user?.role) && user?.role !== "CUSTOMER";

  useEffect(() => {
    if (isLoading) return;
    if (protectedPage && !isAuthenticated) {
      router.replace("/");
      return;
    }
    if (isInternalUser) {
      router.replace(getRoleHomePath(user?.role));
    }
  }, [isAuthenticated, isInternalUser, isLoading, protectedPage, router, user?.role]);

  if (protectedPage && isLoading) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra phiên đăng nhập...</main>;
  }
  if (protectedPage && !isAuthenticated) {
    return null;
  }
  if (isInternalUser) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang chuyển đến khu vực làm việc...</main>;
  }
  return <>{children}</>;
}
