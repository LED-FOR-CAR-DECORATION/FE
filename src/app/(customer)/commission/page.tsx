import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FixedCommissionFlow from "@/features/commission/components/FixedCommissionFlow";

export default function CommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 text-[#26352f] md:py-8">
        <div className="mx-auto w-full max-w-4xl px-4">
          <FixedCommissionFlow />
        </div>
      </main>
      <Footer />
    </>
  );
}
