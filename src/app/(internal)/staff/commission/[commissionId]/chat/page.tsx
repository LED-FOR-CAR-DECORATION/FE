import { notFound, redirect } from "next/navigation";

/** Phòng chat của staff đã gộp vào hộp thư /staff/chat (bố cục kiểu Messenger). */
export default async function StaffCommissionChatPage({ params }: { params: Promise<{ commissionId: string }> }) {
  const { commissionId } = await params;
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) notFound();
  redirect(`/staff/chat?commissionId=${id}`);
}
