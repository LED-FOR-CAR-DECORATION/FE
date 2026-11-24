import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CommissionRequestList from "@/features/commission/components/CommissionRequestList";

export default function CommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-6 text-text-main md:py-10">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <CommissionRequestList />
        </div>
      </main>
      <Footer />
    </>
  );
}
