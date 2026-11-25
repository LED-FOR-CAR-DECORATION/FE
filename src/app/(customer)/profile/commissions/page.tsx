import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import CommissionRequestList from "@/features/commission/components/CommissionRequestList";

export default function ProfileCommissionsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-6 text-text-main md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:flex-row lg:items-start">
          <CustomerSidebar />
          <div className="min-w-0 flex-1">
            <CommissionRequestList />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
