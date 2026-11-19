import { redirect } from "next/navigation";

/** Commission dùng Studio của character thường; nộp version ở trang commission. */
export default async function DesignerDesignPage({ params }: { params: Promise<{ commissionId: string }> }) {
  const { commissionId } = await params;
  redirect(`/designer/commissions/${encodeURIComponent(commissionId)}`);
}
