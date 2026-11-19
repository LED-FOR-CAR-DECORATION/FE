import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CommissionChatRoom from "@/features/commission-chat/components/CommissionChatRoom";

export const metadata: Metadata = {
  title: "Chat Commission | MIRAGE Staff",
};

export default async function StaffCommissionChatPage({ params }: {
  params: Promise<{ commissionId: string }>;
}) {
  const { commissionId } = await params;
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) notFound();

  return (
    <section className="mx-auto max-w-6xl space-y-3 text-[#26352f]">
      <Link href="/staff/commission" className="inline-block font-semibold text-[#155e59] underline">Về hàng đợi Commission</Link>
      <CommissionChatRoom commissionId={id} viewer="STAFF" />
    </section>
  );
}
