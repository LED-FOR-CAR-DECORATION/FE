import Link from "next/link";

export default function AdminPage() {
  return (
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
          <div className="w-full max-w-2xl border border-[#d8e6dc] bg-white p-8 text-center shadow-[0_8px_22px_rgba(32,94,53,.07)]">
            <p className="text-xs font-black uppercase tracking-widest text-[#198653]">Admin</p>
            <h1 className="mt-2 text-2xl font-black text-[#173b28]">Khu vực quản trị</h1>
            <p className="mt-3 text-sm text-text-muted">Chọn một chức năng trong sidebar để quản lý hệ thống.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{[["users", "Người dùng"], ["roles", "Vai trò"], ["permissions", "Quyền hạn"], ["assignments", "Phân quyền"], ["reports", "Báo cáo"], ["profile", "Hồ sơ cá nhân"]].map(([path, title]) => <Link key={path} href={`/admin/${path}`} className="rounded-lg border border-green-200 bg-green-50 p-4 font-bold hover:bg-green-100">{title} →</Link>)}</div>
          </div>
        </section>
  );
}
