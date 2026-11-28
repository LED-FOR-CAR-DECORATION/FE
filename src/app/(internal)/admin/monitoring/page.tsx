import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import SystemMonitoringPage from "@/features/monitoring/components/SystemMonitoringPage";

export default function AdminMonitoringPage() {
  return (
    <AdminRouteGuard>
      <SystemMonitoringPage />
    </AdminRouteGuard>
  );
}
