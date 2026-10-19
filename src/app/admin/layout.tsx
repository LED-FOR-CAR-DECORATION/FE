import type { ReactNode } from "react";
import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import ManagementShell from "@/components/layout/ManagementShell";
export default function AdminLayout({ children }: { children: ReactNode }) { return <AdminRouteGuard><ManagementShell>{children}</ManagementShell></AdminRouteGuard>; }
