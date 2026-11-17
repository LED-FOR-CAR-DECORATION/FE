import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FixedCommissionFlow from "@/features/commission/components/FixedCommissionFlow";
import Link from "next/link";

export default function NewCommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-6 text-[#26352f] md:py-8">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Link href="/commission" className="mb-5 inline-block font-semibold text-[#155e59] underline">Về danh sách Commission</Link>
          <FixedCommissionFlow />
        </div>
      </main>
      <Footer />
    </>
  );
}
