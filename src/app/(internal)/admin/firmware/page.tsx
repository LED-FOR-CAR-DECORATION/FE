import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import FirmwareReleasesPage from "@/features/firmware/components/FirmwareReleasesPage";

export default function AdminFirmwarePage() {
  return (
    <AdminRouteGuard>
      <FirmwareReleasesPage />
    </AdminRouteGuard>
  );
}
