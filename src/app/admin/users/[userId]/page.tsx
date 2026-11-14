import { Suspense } from "react";
import ManagementShell from "@/components/layout/ManagementShell";
import UserDetailPage from "@/features/managed-users/components/UserDetailPage";

type Props = { params: Promise<{ userId: string }> };

export default function UserDetailRoute({ params }: Props) {
  return (
    <ManagementShell>
      <Suspense fallback={<p role="status">Đang tải chi tiết người dùng…</p>}>
        <UserDetailContent params={params} />
      </Suspense>
    </ManagementShell>
  );
}

async function UserDetailContent({ params }: Props) {
  const { userId } = await params;
  return <UserDetailPage userId={userId} />;
}
