"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ManagerRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isAllowedPath =
    (user?.role === "STAFF" && pathname === "/staff") ||
    (user?.role === "MANAGER" && pathname === "/manager") ||
    (user?.role === "STAFF" && pathname.startsWith("/staff/profile")) ||
    (user?.role === "MANAGER" && pathname.startsWith("/manager/profile")) ||
    (user?.role === "STAFF" && ["/staff/orders", "/staff/deliveries", "/staff/chat", "/staff/commission"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) ||
    (user?.role === "MANAGER" && ["/staff/inventory", "/staff/pricing", "/staff/warranty", "/staff/returns", "/staff/commission/pricing"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) ||
    (user?.role === "MANAGER" && (pathname === "/manager/character-orders" || pathname.startsWith("/manager/character-orders/"))) ||
    (user?.role === "DESIGNER" && (pathname === "/designer/dashboard" || pathname === "/designer/commissions" || pathname.startsWith("/designer/commissions/")));

  useEffect(() => {
    if (!isLoading && isAuthenticated && (user?.role !== "MANAGER" && user?.role !== "STAFF" && user?.role !== "DESIGNER" || !isAllowedPath)) {
      router.replace(user?.role === "CUSTOMER" ? "/" : user?.role === "ADMIN" ? "/admin" : user?.role === "DESIGNER" ? "/designer/dashboard" : "/login");
    }
  }, [isAllowedPath, isAuthenticated, isLoading, router, user?.role]);

  if (isLoading) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>;
  }
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <section className="w-full max-w-md border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl font-black">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-sm text-text-muted">Vui lòng đăng nhập bằng tài khoản staff, manager hoặc designer để truy cập khu vực vận hành.</p>
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="btn-primary mt-6 inline-block">
            Trở về trang đăng nhập
          </Link>
        </section>
      </main>
    );
  }
  if ((user?.role !== "MANAGER" && user?.role !== "STAFF" && user?.role !== "DESIGNER") || !isAllowedPath) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang chuyển đến khu vực phù hợp...</main>;
  }

  return <>{children}</>;
}
