"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/features/auth/types";
import { getRoleHome, menuItems, roleLabels, type MenuItem } from "@/components/layout/internal-nav";

const COLLAPSE_KEY = "internal_rail_collapsed";

/** Paths that belong to another menu entry (e.g. the studio lives under "Danh sách nhân vật"). */
const PATH_ALIASES: Array<[prefix: string, owner: string]> = [["/designer/studio", "/designer/characters"]];

function buildNav(role: UserRole | undefined) {
  const visible = menuItems.filter((item) => role && item.roles.includes(role));
  const overview = visible.find((item) => item.label === "Tổng quan");
  const main: MenuItem[] = [
    ...(overview ? [{ ...overview, href: getRoleHome(role) }] : []),
    ...visible.filter((item) => item !== overview),
  ];
  const account: MenuItem[] =
    role === "ADMIN"
      ? [{ label: "Hồ sơ cá nhân", description: "Thông tin tài khoản của bạn", href: `${getRoleHome(role)}/profile`, icon: User, roles: [role] }]
      : [];
  return { main, account };
}

function findActive(pathname: string, items: MenuItem[]) {
  const alias = PATH_ALIASES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const path = alias ? alias[1] : pathname;
  return [...items]
    .sort((first, second) => second.href.length - first.href.length)
    .find(({ href }) => path === href || (href !== "/" && path.startsWith(`${href}/`)));
}

function NavLink({ item, active, collapsed }: { item: MenuItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      title={collapsed ? undefined : item.description}
      className={`ps-rail-btn group relative flex items-center gap-2.5 rounded-[4px] transition-colors ${
        collapsed ? "h-9 w-9 justify-center" : "min-h-9 w-full px-2.5 py-1.5"
      }`}
    >
      <Icon size={17} className="shrink-0" />
      {collapsed ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-[3px] border border-black/60 bg-[#1b1b1b] px-2 py-1 text-[11px] text-[#e3e3e3] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {item.label}
        </span>
      ) : (
        <span className="min-w-0 text-[13px] font-medium leading-tight">{item.label}</span>
      )}
    </Link>
  );
}

/**
 * Shared chrome for every internal role (designer, staff, manager, admin):
 * thin menu bar, collapsible icon rail, light workspace and a status bar.
 */
export default function InternalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role;
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const { main, account } = buildNav(role);
  const active = findActive(pathname, [...main, ...account]);
  const isStudio = pathname.startsWith("/designer/studio");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ps-theme");
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // storage unavailable
    }
    return () => root.classList.remove("ps-theme");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, current ? "0" : "1");
      } catch {
        // ignore
      }
      return !current;
    });
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      window.location.assign("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Không thể đăng xuất. Vui lòng thử lại.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="manager-shell flex h-dvh flex-col overflow-hidden text-[var(--ps-text)]">
      <header className="ps-menubar relative flex h-10 shrink-0 items-center gap-2 px-2 text-[12px]">
        <Link
          href={getRoleHome(role)}
          aria-label="Mirage — trang chủ nội bộ"
          className="flex items-center gap-2 rounded-[4px] px-1 py-0.5"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#2d6a4f] text-[11px] font-black text-white">M</span>
          <span className="hidden text-[13px] font-black tracking-tight sm:inline">MIRAGE</span>
        </Link>
        <span className="rounded-[3px] bg-[var(--ps-active)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2d6a4f]">
          {role ? roleLabels[role] : "Nội bộ"}
        </span>
        <span className="mx-1 hidden h-4 w-px bg-[var(--ps-edge)] md:block" aria-hidden="true" />
        <span className="hidden truncate text-[12px] text-[var(--ps-text-dim)] md:inline">{active?.label ?? ""}</span>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 px-1.5 py-0.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d6a4f] text-[10px] font-black text-white">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "M"}
            </span>
            <span className="hidden max-w-44 truncate text-[12px] font-medium sm:inline">{user?.fullName ?? "Người dùng"}</span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="ps-menu-item flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-[12px] disabled:opacity-50"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
          </button>
        </div>
        {logoutError && (
          <p role="alert" className="absolute right-2 top-11 z-50 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {logoutError}
          </p>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Menu nội bộ"
          className={`ps-rail flex shrink-0 flex-col gap-1 py-2 transition-[width] duration-200 ${
            collapsed ? "w-12 items-center" : "w-60 px-2"
          }`}
        >
          <div className={`flex flex-1 flex-col gap-0.5 overflow-y-auto ${collapsed ? "items-center" : ""}`}>
            {main.map((item) => (
              <NavLink key={item.href} item={item} active={item === active} collapsed={collapsed} />
            ))}
          </div>
          {account.length > 0 && (
            <div className={`flex flex-col gap-0.5 border-t border-[var(--ps-edge)] pt-2 ${collapsed ? "items-center" : ""}`}>
              {account.map((item) => (
                <NavLink key={item.href} item={item} active={item === active} collapsed={collapsed} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={`ps-rail-btn flex items-center gap-2 rounded-[4px] text-[12px] ${collapsed ? "h-9 w-9 justify-center" : "px-2.5 py-1.5"}`}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </nav>

        <main className={`manager-main min-w-0 flex-1 overflow-y-auto ${isStudio ? "p-0" : "p-6"}`}>{children}</main>
      </div>

      <footer className="ps-statusbar flex h-6 shrink-0 items-center gap-4 px-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2d6a4f]" aria-hidden="true" />
          Sẵn sàng
        </span>
        <span className="truncate">{active?.label ?? ""}</span>
        <span className="ml-auto hidden sm:inline">MIRAGE · {role ? roleLabels[role] : "Nội bộ"}</span>
      </footer>
    </div>
  );
}
