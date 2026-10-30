import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import ManagementShell from "@/components/layout/ManagementShell";
import AdminDashboard from "@/features/dashboard/components/AdminDashboard";

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <ManagementShell>
        <AdminDashboard />
      </ManagementShell>
    </AdminRouteGuard>
  );
}
