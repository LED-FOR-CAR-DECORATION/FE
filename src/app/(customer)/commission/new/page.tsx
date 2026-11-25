import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ApiCommissionForm from "@/features/commission/components/ApiCommissionForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCommissionPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-6 text-text-main md:py-10">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <Link
            href="/commission"
            className="btn-secondary mb-6 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase"
          >
            <ArrowLeft size={15} />
            Quay lại danh sách
          </Link>
          <ApiCommissionForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
