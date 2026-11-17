"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import FirmwareDetailsModal from "./FirmwareDetailsModal";
import {
  ADMIN_KPI_MOCK,
  FIRMWARE_DISTRIBUTION_MOCK,
  FIRMWARE_RELEASES_MOCK,
  RBAC_ACTIVITIES_MOCK,
  USER_ROLE_BREAKDOWN_MOCK,
} from "../mockData";
import type { FirmwareReleaseItem, RbacActivityItem } from "../types";

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  iconBgClass?: string;
  iconColorClass?: string;
  badge: {
    label: string;
    className: string;
  };
  growth?: {
    value: string;
    isPositive: boolean;
  };
  footerText: string;
  footerAction?: React.ReactNode;
}

function MetricCard({
  title,
  subtitle,
  value,
  icon: Icon,
  iconBgClass = "bg-blue-50",
  iconColorClass = "text-blue-600",
  badge,
  growth,
  footerText,
  footerAction,
}: MetricCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}
            >
              <Icon className={`h-5 w-5 ${iconColorClass}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {title}
              </p>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-2.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
            {value}
          </span>

          {growth && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                growth.isPositive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {growth.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {growth.value}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">{footerText}</span>
        {footerAction}
      </div>
    </div>
  );
}

const RBAC_STATUS_MAP: Record<
  RbacActivityItem["status"],
  { label: string; className: string }
> = {
  SUCCESS: { label: "Thành công", className: "bg-green-50 text-green-700" },
  FLAGGED: { label: "Cảnh báo", className: "bg-red-50 text-red-700" },
  PENDING_APPROVAL: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-700" },
};

const FIRMWARE_STATUS_MAP: Record<
  FirmwareReleaseItem["status"],
  { label: string; className: string }
> = {
  Released: { label: "Đã phát hành", className: "bg-green-50 text-green-700" },
  Staged: { label: "Thử nghiệm", className: "bg-amber-50 text-amber-700" },
  Draft: { label: "Bản nháp", className: "bg-slate-100 text-slate-700" },
  Deprecated: { label: "Ngừng hỗ trợ", className: "bg-red-50 text-red-700" },
};

export default function AdminDashboard() {
  const [selectedFirmware, setSelectedFirmware] =
    useState<FirmwareReleaseItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const featuredRelease =
    FIRMWARE_RELEASES_MOCK.find((item) => item.status === "Released") ??
    FIRMWARE_RELEASES_MOCK[0] ??
    null;

  return (
    <div className="mx-auto w-full max-w-[1440px] font-sans text-slate-900">
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Top Row: Clean SaaS Header */}
        <header className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <nav
                aria-label="Đường dẫn"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
              >
                <span>Quản trị hệ thống</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-900">Tổng quan</span>
              </nav>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                TỔNG QUAN QUẢN TRỊ HỆ THỐNG
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Quản trị tài khoản nội bộ, kiểm soát phân quyền hệ thống và phân
                phối bản cập nhật thiết bị LED.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  showToast("Đã đồng bộ dữ liệu quản trị hệ thống mới nhất.")
                }
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </button>

              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <UserCog className="h-4 w-4 text-slate-500" />
                Quản lý người dùng
              </Link>

              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Hệ thống cập nhật đã sẵn sàng tiếp nhận gói phần mềm mới."
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                Tải lên bản cập nhật
              </button>

              <Link
                href="/manager"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                Trang quản lý
              </Link>
            </div>
          </div>
        </header>

        {/* Second Row: 4 Equal-Width Summary Cards */}
        <MetricCard
          title="Tổng người dùng & nhân sự"
          subtitle="Cơ sở dữ liệu tài khoản"
          value={`${ADMIN_KPI_MOCK.totalUsers.toLocaleString("vi-VN")} Tài khoản`}
          icon={Users}
          badge={{
            label: "Đang hoạt động",
            className: "bg-blue-50 text-blue-700",
          }}
          growth={{
            value: `+${ADMIN_KPI_MOCK.userGrowthPercent}%`,
            isPositive: true,
          }}
          footerText={`${ADMIN_KPI_MOCK.totalEmployees.toLocaleString("vi-VN")} nhân viên & nhà thiết kế`}
        />

        <MetricCard
          title="Thiết bị LED kết nối"
          subtitle="Phần cứng đang trực tuyến"
          value={`${ADMIN_KPI_MOCK.activePairedDevices.toLocaleString("vi-VN")} Thiết bị`}
          icon={Cpu}
          iconBgClass="bg-green-50"
          iconColorClass="text-green-600"
          badge={{
            label: "Trực tuyến",
            className: "bg-green-50 text-green-700",
          }}
          growth={{
            value: "+12.4%",
            isPositive: true,
          }}
          footerText={`${ADMIN_KPI_MOCK.devicesOnlineRate}% thiết bị đang truyền tín hiệu`}
        />

        <MetricCard
          title="Độ phủ phần mềm v2.4"
          subtitle="Phiên bản ổn định mới nhất"
          value={`${ADMIN_KPI_MOCK.latestFirmwareAdoptionPercent}%`}
          icon={HardDrive}
          iconBgClass="bg-amber-50"
          iconColorClass="text-amber-600"
          badge={{
            label: "Đã cập nhật",
            className: "bg-amber-50 text-amber-700",
          }}
          footerText="Đồng bộ tự động tới thiết bị"
          footerAction={
            <button
              type="button"
              disabled={!featuredRelease}
              onClick={() => {
                if (featuredRelease) {
                  setSelectedFirmware(featuredRelease);
                }
              }}
              className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xem chi tiết
            </button>
          }
        />

        <MetricCard
          title="Vai trò & phân quyền"
          subtitle="Kiểm soát truy cập hệ thống"
          value={`${ADMIN_KPI_MOCK.activeRolesCount} Vai trò`}
          icon={ShieldCheck}
          iconBgClass="bg-slate-100"
          iconColorClass="text-slate-700"
          badge={{
            label: "An toàn",
            className: "bg-slate-100 text-slate-700",
          }}
          footerText={`${ADMIN_KPI_MOCK.totalPermissionsCount.toLocaleString("vi-VN")} quyền hạn chức năng được kiểm soát`}
        />

        {/* Third Row: 2 Equal-Width Analytics Cards */}
        <section
          aria-label="Phân bổ phiên bản phần mềm thiết bị"
          className="col-span-1 flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2"
        >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Phân bổ phiên bản phần mềm thiết bị
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tỷ lệ phiên bản đang vận hành trên thiết bị LED
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 tabular-nums">
                Tổng:{" "}
                {ADMIN_KPI_MOCK.activePairedDevices.toLocaleString("vi-VN")} thiết bị
              </span>
            </div>

            {FIRMWARE_DISTRIBUTION_MOCK.length > 0 ? (
              <div className="my-6 space-y-4">
                {FIRMWARE_DISTRIBUTION_MOCK.map((item) => (
                  <div key={item.version} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label} ({item.version})
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {item.deviceCount.toLocaleString("vi-VN")} thiết bị (
                        {item.percentage}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(item.percentage, 4)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Phát hành: {item.releaseDate}</span>
                      <span>
                        {item.isCurrent ? "Phiên bản hiện hành" : "Phiên bản cũ"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <HardDrive className="mb-2 h-6 w-6 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">
                  Chưa có dữ liệu phân bổ phiên bản
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Dữ liệu sẽ tự động cập nhật khi có thiết bị LED kết nối.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <span className="font-medium text-slate-600">
              Trạng thái đồng bộ
            </span>
            <span className="font-semibold text-slate-800">
              Phiên bản mặc định {ADMIN_KPI_MOCK.latestFirmwareVersion}
            </span>
          </div>
        </section>

        <section
          aria-label="Cơ cấu tài khoản theo vai trò"
          className="col-span-1 flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2"
        >
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Cơ cấu tài khoản theo vai trò
                  </h2>
                  <p className="text-xs text-slate-500">
                    Phân bổ người dùng và nhân sự nội bộ
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 tabular-nums">
                {ADMIN_KPI_MOCK.activeRolesCount} vai trò hoạt động
              </span>
            </div>

            {USER_ROLE_BREAKDOWN_MOCK.length > 0 ? (
              <div className="my-6 space-y-4">
                {USER_ROLE_BREAKDOWN_MOCK.map((roleItem) => (
                  <div key={roleItem.role} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: roleItem.color }}
                        />
                        {roleItem.roleNameVi}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {roleItem.count.toLocaleString("vi-VN")} tài khoản (
                        {roleItem.percentage}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(roleItem.percentage, 4)}%`,
                          backgroundColor: roleItem.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Hoạt động tuần này:{" "}
                        {roleItem.activeThisWeek.toLocaleString("vi-VN")}
                      </span>
                      <span>Tỷ trọng: {roleItem.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <Users className="mb-2 h-6 w-6 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">
                  Chưa có dữ liệu cơ cấu tài khoản
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Biểu đồ phân bổ vai trò sẽ hiển thị khi có tài khoản trong hệ
                  thống.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <span className="font-medium text-slate-600">
              Nhân sự nội bộ
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {ADMIN_KPI_MOCK.totalEmployees.toLocaleString("vi-VN")} tài khoản
            </span>
          </div>
        </section>

        {/* Bottom Row Table 1: RBAC Audit Trail */}
        <section
          aria-label="Nhật ký phân quyền và tài khoản gần đây"
          className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-semibold text-slate-900">
                    NHẬT KÝ PHÂN QUYỀN &amp; TÀI KHOẢN GẦN ĐÂY
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
                    {RBAC_ACTIVITIES_MOCK.length} sự kiện
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Theo dõi thay đổi vai trò, quyền hạn và trạng thái tài khoản
                  trong hệ thống.
                </p>
              </div>
            </div>

            <Link
              href="/admin/assignments"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Cấu hình vai trò
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 text-left">Thời gian</th>
                  <th className="px-4 py-3.5 text-left">Người thực hiện</th>
                  <th className="px-4 py-3.5 text-left">Tài khoản tác động</th>
                  <th className="px-4 py-3.5 text-left">Nội dung thay đổi</th>
                  <th className="px-4 py-3.5 text-left">Chi tiết</th>
                  <th className="px-4 py-3.5 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {RBAC_ACTIVITIES_MOCK.length > 0 ? (
                  RBAC_ACTIVITIES_MOCK.map((row) => {
                    const timestamp = new Date(row.timestamp);
                    const statusBadge = RBAC_STATUS_MAP[row.status];

                    return (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3.5 tabular-nums">
                          <p className="font-medium text-slate-900">
                            {timestamp.toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {timestamp.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {row.actor.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.actor.email}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {row.targetUser.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.targetUser.email}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {row.actionLabel}
                          </span>
                          {row.previousRole && row.newRole && (
                            <p className="mt-1 text-xs text-slate-500">
                              {row.previousRole} →{" "}
                              <span className="font-medium text-slate-800">
                                {row.newRole}
                              </span>
                            </p>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-xs leading-5 text-slate-600">
                          {row.details}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-slate-900">
                        Chưa có sự kiện phân quyền nào được ghi nhận
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Các thay đổi tài khoản và phân quyền mới sẽ hiển thị tại
                        đây.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Row Table 2: Firmware Release History */}
        <section
          aria-label="Lịch sử phát hành phần mềm thiết bị"
          className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base font-semibold text-slate-900">
                    LỊCH SỬ PHÁT HÀNH PHẦN MỀM THIẾT BỊ
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
                    {FIRMWARE_RELEASES_MOCK.length} bản dựng
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Quản lý các bản cập nhật không dây gửi tới bộ điều khiển LED.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5 text-left">
                    Phiên bản &amp; mã bản dựng
                  </th>
                  <th className="px-4 py-3.5 text-left">Mẫu thiết bị hỗ trợ</th>
                  <th className="px-4 py-3.5 text-right">Dung lượng</th>
                  <th className="px-4 py-3.5 text-left">Ngày phát hành</th>
                  <th className="px-4 py-3.5 text-left">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Tỷ lệ triển khai</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {FIRMWARE_RELEASES_MOCK.length > 0 ? (
                  FIRMWARE_RELEASES_MOCK.map((row) => {
                    const statusBadge = FIRMWARE_STATUS_MAP[row.status];

                    return (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {row.version}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.buildNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {row.targetModels.map((model) => (
                              <span
                                key={model}
                                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-700 tabular-nums">
                          {row.binarySize}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 tabular-nums">
                          {row.releaseDate}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          <span className="font-semibold text-slate-900">
                            {row.rolloutPercentage}%
                          </span>
                          <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${row.rolloutPercentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedFirmware(row)}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-slate-900">
                        Chưa có bản phát hành phần mềm nào
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Lịch sử bản dựng cập nhật cho thiết bị LED sẽ hiển thị
                        tại đây.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <FirmwareDetailsModal
        firmware={selectedFirmware}
        isOpen={Boolean(selectedFirmware)}
        onClose={() => setSelectedFirmware(null)}
      />
    </div>
  );
}
