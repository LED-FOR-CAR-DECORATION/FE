import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <main className="flex-1 bg-background py-6 text-text-main md:py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Link
            href="/commission"
            className="btn-secondary mb-6 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
          >
            <ArrowLeft size={15} />
            Quay lại danh sách
          </Link>
          <CustomerCommissionPayment commissionId={id} />
        </div>
      </main>
      <Footer />
    </>
  );
}
