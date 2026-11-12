"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Cpu,
  ShieldCheck,
  Activity,
  Terminal,
  Upload,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  UserCog,
  FileCode,
  Key,
  ShieldAlert,
} from "lucide-react";
import NeoKpiCard from "./NeoKpiCard";
import NeoTable, { type NeoTableColumn } from "./NeoTable";
import { FirmwareDistributionChart, UserRoleBreakdownChart } from "./NeoCharts";
import FirmwareDetailsModal from "./FirmwareDetailsModal";
import {
  ADMIN_KPI_MOCK,
  FIRMWARE_DISTRIBUTION_MOCK,
  USER_ROLE_BREAKDOWN_MOCK,
  RBAC_ACTIVITIES_MOCK,
  FIRMWARE_RELEASES_MOCK,
} from "../mockData";
import type {
  FirmwareReleaseItem,
  RbacActivityItem,
} from "../types";

export default function AdminDashboard() {
  const [selectedFirmware, setSelectedFirmware] =
    useState<FirmwareReleaseItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------------------
  // Table Columns: Recent Account & RBAC Activities
  // -------------------------------------------------------------------------
  const rbacColumns: NeoTableColumn<RbacActivityItem>[] = [
    {
      id: "time",
      header: "Thời gian",
      accessor: (row) => {
        const d = new Date(row.timestamp);
        return (
          <div className="font-mono text-xs">
            <span className="font-black text-black">
              {d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="block text-[10px] text-neutral-500">
              {d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      id: "actor",
      header: "Admin thực hiện",
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-black text-black">
            {row.actor.name}
          </span>
          <span className="block font-mono text-[10px] text-neutral-500">
            {row.actor.email}
          </span>
        </div>
      ),
    },
    {
      id: "target",
      header: "Tài khoản đối tượng",
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-black text-black">
            {row.targetUser.name}
          </span>
          <span className="block font-mono text-[10px] text-neutral-500">
            {row.targetUser.email}
          </span>
        </div>
      ),
    },
    {
      id: "action",
      header: "Hành vi / Thay đổi vai trò",
      accessor: (row) => (
        <div>
          <span className="border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black uppercase">
            {row.actionLabel}
          </span>
          {row.previousRole && row.newRole && (
            <div className="mt-1 flex items-center gap-1 font-mono text-[11px] font-black">
              <span className="text-neutral-500">{row.previousRole}</span>
              <span>➔</span>
              <span className="border border-black bg-[#e9d5ff] px-1 text-black">
                {row.newRole}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "details",
      header: "Chi tiết / Lý do",
      width: "28%",
      accessor: (row) => (
        <p className="line-clamp-2 font-mono text-xs text-neutral-700">
          {row.details}
        </p>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      align: "center",
      accessor: (row) => (
        <span
          className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000] ${
            row.status === "SUCCESS"
              ? "bg-[#a7f3d0] text-black"
              : row.status === "FLAGGED"
              ? "bg-[#fda4af] text-black"
              : "bg-[#fef08a] text-black"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Table Columns: Firmware Release History
  // -------------------------------------------------------------------------
  const firmwareColumns: NeoTableColumn<FirmwareReleaseItem>[] = [
    {
      id: "version",
      header: "Phiên bản & Build",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center border-2 border-black bg-[#fef08a] font-mono text-xs font-black shadow-[2px_2px_0_0_#000]">
            OTA
          </div>
          <div>
            <span className="font-mono text-xs font-black text-black">
              {row.version}
            </span>
            <span className="block font-mono text-[10px] text-neutral-500">
              {row.buildNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "targetModels",
      header: "Mẫu LED hỗ trợ",
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.targetModels.map((m) => (
            <span
              key={m}
              className="border border-black bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase"
            >
              {m}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "binarySize",
      header: "Dung lượng",
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-neutral-700">
          {row.binarySize}
        </span>
      ),
    },
    {
      id: "releaseDate",
      header: "Ngày tải lên",
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-neutral-800">
          {row.releaseDate}
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      accessor: (row) => (
        <span
          className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000] ${
            row.status === "Released"
              ? "bg-[#a7f3d0] text-black"
              : row.status === "Staged"
              ? "bg-[#fef08a] text-black"
              : row.status === "Draft"
              ? "bg-neutral-200 text-black"
              : "bg-[#fed7aa] text-black"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      id: "rollout",
      header: "Rollout",
      accessor: (row) => (
        <div>
          <div className="font-mono text-xs font-black text-black">
            {row.rolloutPercentage}%
          </div>
          <div className="mt-0.5 h-1.5 w-16 border border-black bg-neutral-200">
            <div
              className="h-full bg-[#10b981]"
              style={{ width: `${row.rolloutPercentage}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Hành động",
      align: "right",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => setSelectedFirmware(row)}
          className="border-2 border-black bg-[#a7f3d0] px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border-3 border-black bg-[#fef08a] px-4 py-3 font-mono text-xs font-black text-black shadow-[5px_5px_0_0_#000] animate-bounce">
          <CheckCircle2 size={18} className="stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / System Console Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
        <div>
          <div className="flex items-center gap-2">
            <span className="border-2 border-black bg-[#e9d5ff] px-2.5 py-0.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000]">
              PIXEL HUB • ROOT CONSOLE
            </span>
            <span className="border border-black bg-[#a7f3d0] px-2 py-0.5 font-mono text-[11px] font-black text-black">
              ● ALL SYSTEMS NOMINAL (100%)
            </span>
          </div>
          <h1 className="mt-2 font-mono text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-0.5 font-mono text-xs font-semibold text-neutral-600 sm:text-sm">
            Quản trị hệ thống, kiểm soát phân quyền RBAC & phân phối Firmware OTA cho thiết bị LED ô tô.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/manager"
            className="border-2 border-black bg-[#fef08a] px-3 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Chuyển qua Manager Dashboard ➔
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <UserCog size={14} className="stroke-[2.5]" /> Quản lý Users & Roles
          </Link>
          <button
            type="button"
            onClick={() => showToast("Hệ thống OTA đã sẵn sàng nhận bản build nhị phân mới.")}
            className="flex items-center gap-1.5 border-2 border-black bg-[#a7f3d0] px-3.5 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Upload size={14} className="stroke-[2.5]" /> Upload Firmware
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. KPI CARDS ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="System Metrics Overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {/* Card 1: Total Users & Employees */}
          <NeoKpiCard
            title="Tổng Users & Nhân sự"
            subtitle="Cơ sở dữ liệu người dùng"
            value={ADMIN_KPI_MOCK.totalUsers.toLocaleString()}
            icon={Users}
            colorTheme="lavender"
            growth={{
              value: `+${ADMIN_KPI_MOCK.userGrowthPercent}%`,
              isPositive: true,
              label: `${ADMIN_KPI_MOCK.totalEmployees} Nhân viên & Designer`,
            }}
            badge={{ text: "ACTIVE USERS", tone: "purple" }}
          />

          {/* Card 2: Active Paired Devices (LED hardware) */}
          <NeoKpiCard
            title="Thiết bị LED kết nối"
            subtitle="Phần cứng đang online"
            value={ADMIN_KPI_MOCK.activePairedDevices.toLocaleString()}
            icon={Cpu}
            colorTheme="mint"
            growth={{
              value: "+12.4%",
              isPositive: true,
              label: `${ADMIN_KPI_MOCK.devicesOnlineRate}% Đang truyền tín hiệu`,
            }}
            badge={{ text: "BLE / WI-FI LIVE", tone: "success" }}
            helperText="Đồng bộ hiệu ứng kính xe theo thời gian thực"
          />

          {/* Card 3: Latest Firmware Adoption (%) */}
          <NeoKpiCard
            title="Độ phủ Firmware v2.4"
            subtitle="Bản OTA ổn định nhất"
            value={`${ADMIN_KPI_MOCK.latestFirmwareAdoptionPercent}%`}
            icon={HardDrive}
            colorTheme="yellow"
            badge={{ text: "91.4% ADOPTED", tone: "warning" }}
            helperText="6,395 thiết bị đã cập nhật tự động"
            actionButton={{
              label: "Chi tiết OTA",
              onClick: () => {
                const latest = FIRMWARE_RELEASES_MOCK.find(
                  (f) => f.version === "v2.4.0-stable"
                );
                if (latest) setSelectedFirmware(latest);
              },
            }}
          />

          {/* Card 4: Active Security / RBAC Roles */}
          <NeoKpiCard
            title="Vai trò bảo mật RBAC"
            subtitle="Phân quyền hệ thống"
            value={`${ADMIN_KPI_MOCK.activeRolesCount} Roles`}
            icon={ShieldCheck}
            colorTheme="white"
            badge={{ text: "0 THREATS", tone: "neutral" }}
            helperText={`${ADMIN_KPI_MOCK.totalPermissionsCount} Quyền hạn chức năng được kiểm soát`}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHARTS ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Firmware Distribution and RBAC Breakdown">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Firmware Distribution (Donut Chart) */}
          <FirmwareDistributionChart
            items={FIRMWARE_DISTRIBUTION_MOCK}
            totalDevices={ADMIN_KPI_MOCK.activePairedDevices}
          />

          {/* User Registration & Role Breakdown (Bar / Breakdown Grid) */}
          <UserRoleBreakdownChart
            items={USER_ROLE_BREAKDOWN_MOCK}
            totalUsers={ADMIN_KPI_MOCK.totalUsers}
            totalEmployees={ADMIN_KPI_MOCK.totalEmployees}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTIONABLE TABLES ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Audit and Release Tables" className="space-y-6">
        {/* Table 1: Recent Account & RBAC Activities */}
        <NeoTable
          title="Nhật ký phân quyền & Tài khoản gần đây (RBAC Audit Trail)"
          icon={UserCog}
          badgeCount={RBAC_ACTIVITIES_MOCK.length}
          badgeLabel="EVENTS"
          headerColor="lavender"
          columns={rbacColumns}
          data={RBAC_ACTIVITIES_MOCK}
          keyExtractor={(row) => row.id}
          footerNote="Ghi nhận tự động bởi hệ thống bảo mật PIXEL HUB. Bất biến trong 90 ngày."
          actions={
            <Link
              href="/admin/assignments"
              className="border-2 border-black bg-white px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white"
            >
              Cấu hình Role ➔
            </Link>
          }
        />

        {/* Table 2: Firmware Release History */}
        <NeoTable
          title="Lịch sử phát hành Firmware OTA (LED Hardware Releases)"
          icon={HardDrive}
          badgeCount={FIRMWARE_RELEASES_MOCK.length}
          badgeLabel="BUILDS"
          headerColor="mint"
          columns={firmwareColumns}
          data={FIRMWARE_RELEASES_MOCK}
          keyExtractor={(row) => row.id}
          footerNote="Được bảo vệ bằng mã hash SHA-256 chống giả mạo khi đẩy OTA xuống ESP32."
          actions={
            <span className="font-mono text-xs font-bold text-neutral-700">
              ⚡ Giao thức: ESP-IDF OTA Dual Bank
            </span>
          }
        />
      </section>

      {/* Firmware Inspector Dialog */}
      <FirmwareDetailsModal
        firmware={selectedFirmware}
        isOpen={Boolean(selectedFirmware)}
        onClose={() => setSelectedFirmware(null)}
      />
    </div>
  );
}
