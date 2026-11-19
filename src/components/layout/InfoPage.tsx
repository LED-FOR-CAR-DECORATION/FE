import Link from "next/link";
import type { ReactNode } from "react";
import { INFO_LINKS } from "@/config/site";
import Footer from "./Footer";
import Header from "./Header";

/**
 * Khung chung cho các trang thông tin công khai (Giới thiệu, Liên hệ, Hỗ trợ, Chính sách…):
 * Header + breadcrumb + tiêu đề + nội dung + điều hướng giữa các trang thông tin + Footer.
 */
export default function InfoPage({ title, intro, currentHref, updatedAt, children }: {
  title: string;
  intro?: string;
  currentHref: string;
  /** Ngày cập nhật hiển thị cho các trang chính sách. */
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#f5f5f5] py-8 text-[#26352f] md:py-12">
        <div className="container mx-auto px-4">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm">
            <ol className="flex flex-wrap items-center gap-1 text-[#526159]">
              <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="font-semibold text-[#26352f]">{title}</li>
            </ol>
          </nav>

          <header className="mb-8 border-2 border-black bg-primary p-6 shadow-[4px_4px_0_#000] md:p-8">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
            {intro && <p className="mt-3 max-w-3xl text-base font-medium leading-7">{intro}</p>}
            {updatedAt && <p className="mt-3 text-xs font-bold uppercase tracking-wider">Cập nhật lần cuối: {updatedAt}</p>}
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
            <article className="info-prose min-w-0 space-y-8">{children}</article>
            <nav aria-label="Trang thông tin" className="lg:sticky lg:top-6 lg:self-start">
              <ul className="overflow-hidden border-2 border-black bg-white shadow-[3px_3px_0_#000]">
                {INFO_LINKS.map((link) => (
                  <li key={link.href} className="border-b-2 border-black last:border-b-0">
                    <Link href={link.href} aria-current={link.href === currentHref ? "page" : undefined}
                      className={`flex min-h-11 items-center px-4 text-sm font-bold transition ${link.href === currentHref ? "bg-black text-white" : "hover:bg-[#eaf5e8]"}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Một mục nội dung có tiêu đề, dùng trong các trang thông tin. */
export function InfoSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="border-2 border-black bg-white p-5 shadow-[3px_3px_0_#000] md:p-6">
      <h2 id={id ? `${id}-title` : undefined} className="mb-3 text-xl font-black">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 [&_a]:font-semibold [&_a]:text-[#155e59] [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
