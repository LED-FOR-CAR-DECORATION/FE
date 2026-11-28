import CustomerSidebar from "@/components/layout/CustomerSidebar";
import Header from "@/components/layout/Header";
import CommissionRequestList from "@/features/commission/components/CommissionRequestList";

export default function ProfileCommissionsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-5 text-text-main lg:h-[calc(100dvh-106px)] lg:flex-none lg:overflow-hidden lg:py-3">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 lg:h-full lg:min-h-0 lg:flex-row lg:items-stretch">
          <div className="shrink-0">
            <CustomerSidebar />
          </div>
          <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
            <CommissionRequestList />
          </div>
        </div>
      </main>
    </>
  );
}
