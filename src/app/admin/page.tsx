import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <main className="flex min-h-screen items-center justify-center bg-[#f5faf6] px-6">
        <section className="w-full max-w-2xl border border-[#d8e6dc] bg-white p-8 text-center shadow-[0_8px_22px_rgba(32,94,53,.07)]">
          <p className="text-xs font-black uppercase tracking-widest text-[#198653]">Admin</p>
          <h1 className="mt-2 text-2xl font-black text-[#173b28]">Khu vực quản trị</h1>
          <p className="mt-3 text-sm text-text-muted">Các chức năng quản trị hệ thống sẽ được triển khai tại đây.</p>
        </section>
      </main>
    </AdminRouteGuard>
  );
}
