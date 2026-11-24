import { notFound, redirect } from "next/navigation";

/** Phòng chat của khách đã gộp vào hộp thư /messages (bố cục kiểu Messenger). */
export default async function CommissionChatPage({ params }: { params: Promise<{ commissionId: string }> }) {
  const { commissionId } = await params;
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) notFound();
  redirect(`/messages?commissionId=${id}`);
}
