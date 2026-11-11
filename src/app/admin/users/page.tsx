import ManagementShell from "@/components/layout/ManagementShell";
import ManagedUsersPanel from "@/features/managed-users/components/ManagedUsersPanel";

export default function ManagedUsersPage() {
  return (
    <ManagementShell>
      <ManagedUsersPanel />
    </ManagementShell>
  );
}
