"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== "ADMIN") {
      router.replace(user?.role === "CUSTOMER" ? "/" : user?.role === "MANAGER" ? "/manager" : "/staff");
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-text-muted">Đang kiểm tra quyền truy cập...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-md border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-xl font-black">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-sm text-text-muted">Vui lòng đăng nhập bằng tài khoản Admin để truy cập khu vực quản trị.</p>
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="btn-primary mt-6 inline-block">
            Trở về trang đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-text-muted">Đang chuyển đến khu vực phù hợp...</main>;
  }

  return <>{children}</>;
}
