import ManagementShell from "@/components/layout/ManagementShell";
import UserDetailPage from "@/features/managed-users/components/UserDetailPage";

export default async function UserDetailRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <ManagementShell>
      <UserDetailPage userId={userId} />
    </ManagementShell>
  );
}

