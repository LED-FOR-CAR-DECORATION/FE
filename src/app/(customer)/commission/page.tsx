import Header from "@/components/layout/Header";
import CommissionRequestList from "@/features/commission/components/CommissionRequestList";

export default function CommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-5 text-text-main lg:h-[calc(100dvh-106px)] lg:flex-none lg:overflow-hidden lg:py-3">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:h-full lg:min-h-0">
          <CommissionRequestList />
        </div>
      </main>
    </>
  );
}
