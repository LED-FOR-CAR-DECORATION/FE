import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import FirmwareReleasesPage from "@/features/firmware/components/FirmwareReleasesPage";

// Client-only page driven by `?modelId=` (useSearchParams); same opt-out as the other admin pages.
export const instant = false;

export default function AdminFirmwarePage() {
  return (
    <AdminRouteGuard>
      <FirmwareReleasesPage />
    </AdminRouteGuard>
  );
}
