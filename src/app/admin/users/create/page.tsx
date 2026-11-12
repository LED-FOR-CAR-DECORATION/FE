import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import ManagementShell from "@/components/layout/ManagementShell";
import CreateUserPage from "@/features/managed-users/components/CreateUserPage";

export default function CreateManagedUserRoute() {
  return (
    <AdminRouteGuard>
      <ManagementShell>
        <CreateUserPage />
      </ManagementShell>
    </AdminRouteGuard>
  );
}

