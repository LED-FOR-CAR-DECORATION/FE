import Link from "next/link";
import { INFO_LINKS, SHOP_LINKS, SITE } from "@/config/site";
import SocialLinks from "./SocialLinks";
import CopyrightYear from "./CopyrightYear";
import FooterContactList from "./FooterContactList";

const linkClass = "inline-flex min-h-8 items-center hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black";

export default function Footer() {
  return (
    <footer className="border-t-2 border-black bg-primary pt-12 pb-8 text-black">
      <div className="container mx-auto grid grid-cols-1 gap-10 px-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Thương hiệu */}
        <div className="lg:col-span-4">
          <Link href="/" className="inline-block border-2 border-black bg-white px-3 py-1 text-2xl font-black tracking-tighter shadow-[3px_3px_0_#000]">
            {SITE.name}
          </Link>
          <p className="mt-4 max-w-md text-sm font-medium leading-6">{SITE.description}</p>
          <Link href="/contact" className="btn-secondary neo-box-no-hover mt-5 inline-flex min-h-11 items-center px-4 text-sm">
            Liên hệ với chúng tôi
          </Link>
        </div>

        {/* Mua sắm */}
        <nav aria-labelledby="footer-shop" className="lg:col-span-2">
          <h2 id="footer-shop" className="mb-3 text-base font-black uppercase">Mua sắm</h2>
          <ul className="flex flex-col gap-1 text-sm font-medium">
            {SHOP_LINKS.map((link) => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}
          </ul>
        </nav>

        {/* Thông tin & chính sách */}
        <nav aria-labelledby="footer-info" className="lg:col-span-2">
          <h2 id="footer-info" className="mb-3 text-base font-black uppercase">Thông tin</h2>
          <ul className="flex flex-col gap-1 text-sm font-medium">
            {INFO_LINKS.map((link) => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}
          </ul>
        </nav>

        {/* Liên hệ + mạng xã hội */}
        <div className="lg:col-span-4">
          <h2 className="mb-3 text-base font-black uppercase">Kết nối</h2>
          <SocialLinks />
          <FooterContactList />
        </div>
      </div>

      <div className="container mx-auto mt-8 flex flex-col items-center justify-between gap-3 border-t-2 border-black px-4 pt-6 md:flex-row">
        <p className="text-xs font-bold uppercase tracking-wider">© <CopyrightYear /> {SITE.team}. Bảo lưu mọi quyền.</p>
        <p className="text-xs font-semibold">Thanh toán bằng mã QR chuyển khoản</p>
      </div>
    </footer>
  );
}
