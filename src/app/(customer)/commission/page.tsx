import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FixedCommissionFlow from "@/features/commission/components/FixedCommissionFlow";

export default function CommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 text-[#26352f] md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />
          <FixedCommissionFlow />
        </div>
      </main>
      <Footer />
    </>
  );
}
