import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import type { ReactNode } from "react";

export const profileLinks = [["/profile", "Tổng quan"], ["/profile/account", "Tài khoản"], ["/profile/orders", "Đơn hàng"], ["/profile/addresses", "Địa chỉ"], ["/profile/gallery", "Gallery"], ["/profile/subscriptions", "Đăng ký"], ["/profile/security", "Bảo mật"], ["/profile/devices", "Thiết bị"], ["/profile/settings", "Cài đặt"]];
export default function CustomerPage({ children, profile = false }: { children: ReactNode; profile?: boolean }) {
  return <><Header /><main className="profile-page flex-1 px-4 py-8 md:py-12"><div className="mx-auto max-w-6xl">{profile && <nav aria-label="Tài khoản" className="mb-7 flex gap-2 overflow-x-auto pb-2">{profileLinks.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded border border-green-200 bg-white px-4 py-2 text-sm font-bold hover:bg-green-50">{label}</Link>)}</nav>}{children}</div></main><Footer /></>;
}
