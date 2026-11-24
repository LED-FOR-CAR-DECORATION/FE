import { redirect } from "next/navigation";

/** Lịch sử bản nộp đã nằm trong trang commission của designer. */
export default async function DesignerSubmissionDetailsPage({ params }: { params: Promise<{ commissionId: string; submissionId: string }> }) {
  const { commissionId } = await params;
  redirect(`/designer/commissions/${encodeURIComponent(commissionId)}`);
}
