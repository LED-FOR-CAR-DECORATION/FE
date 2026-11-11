import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import AdminDashboard from "@/features/dashboard/components/AdminDashboard";

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <AdminDashboard />
    </AdminRouteGuard>
  );
}
