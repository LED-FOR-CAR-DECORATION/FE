import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CustomerCommissionChatRoom from "@/features/commission-chat/components/CustomerCommissionChatRoom";

export const metadata: Metadata = {
  title: "Chat Commission | MIRAGE",
  description: "Trao đổi với nhân viên MIRAGE về yêu cầu thiết kế nhân vật Pixel Art.",
};

export default async function CommissionChatPage({ params }: {
  params: Promise<{ commissionId: string }>;
}) {
  const { commissionId } = await params;
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 text-[#26352f] md:py-8">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Link href="/commission" className="mb-4 inline-block font-semibold text-[#155e59] underline">Về danh sách Commission</Link>
          <CustomerCommissionChatRoom commissionId={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
