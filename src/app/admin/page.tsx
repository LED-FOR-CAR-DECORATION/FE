import AdminRouteGuard from "@/features/auth/components/AdminRouteGuard";
import ManagementShell from "@/components/layout/ManagementShell";

export default function AdminPage() {
  return (
    <AdminRouteGuard>
      <ManagementShell>
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
          <div className="w-full max-w-2xl border border-[#d8e6dc] bg-white p-8 text-center shadow-[0_8px_22px_rgba(32,94,53,.07)]">
            <p className="text-xs font-black uppercase tracking-widest text-[#198653]">Admin</p>
            <h1 className="mt-2 text-2xl font-black text-[#173b28]">Khu vực quản trị</h1>
            <p className="mt-3 text-sm text-text-muted">Chọn một chức năng trong sidebar để quản lý hệ thống.</p>
          </div>
        </section>
      </ManagementShell>
    </AdminRouteGuard>
  );
}
