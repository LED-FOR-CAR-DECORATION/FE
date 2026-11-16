"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
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
    if (!isLoading && isInternalUser) {
      router.replace(getRoleHomePath(user?.role));
    }
  }, [isInternalUser, isLoading, router, user?.role]);

  if (protectedPage && isLoading) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang kiểm tra phiên đăng nhập...</main>;
  }
  if (protectedPage && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <section className="w-full max-w-md border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl font-black">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-sm text-text-muted">Vui lòng đăng nhập để tiếp tục sử dụng trang này.</p>
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="btn-primary mt-6 inline-block">
            Trở về trang đăng nhập
          </Link>
        </section>
      </main>
    );
  }
  if (isInternalUser) {
    return <main className="min-h-screen bg-background flex items-center justify-center text-sm font-semibold text-text-muted">Đang chuyển đến khu vực làm việc...</main>;
  }
  return <>{children}</>;
}
