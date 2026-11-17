import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CustomerCommissionPayment from "@/features/commission/components/CustomerCommissionPayment";

export default async function CommissionPaymentPage({ params }: {
  params: Promise<{ commissionId: string }>;
}) {
  const { commissionId } = await params;
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 text-[#26352f] md:py-8">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Link href="/commission" className="mb-5 inline-block font-semibold text-[#155e59] underline">Về danh sách Commission</Link>
          <CustomerCommissionPayment commissionId={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
