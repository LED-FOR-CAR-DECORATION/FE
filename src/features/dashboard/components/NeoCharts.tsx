"use client";

import React, { useState } from "react";
import { BarChart3, PieChart, TrendingUp, Sparkles, Layers, ShieldCheck, Users } from "lucide-react";
import type {
  FirmwareDistributionItem,
  RevenueCategoryItem,
  TopProductItem,
  UserRoleBreakdownItem,
} from "../types";

// =========================================================================
// 1. REVENUE BY CATEGORY (NEO-BRUTALIST BAR CHART)
// =========================================================================

export function RevenueCategoryBarChart({
  items,
  totalRevenue,
}: {
  items: RevenueCategoryItem[];
  totalRevenue: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatVnd = (val: number) => {
    return `${(val / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr đ`;
  };

  return (
    <div className="flex h-full flex-col justify-between border-3 border-black bg-white p-5 shadow-[5px_5px_0_0_#000]">
      {/* Title */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center border-2 border-black bg-[#a7f3d0] shadow-[2px_2px_0_0_#000]">
            <BarChart3 size={17} className="text-black stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
              Doanh thu theo danh mục
            </h3>
            <p className="font-mono text-[11px] text-neutral-600">
              LED Hardware vs. Pixel Art Assets
            </p>
          </div>
        </div>
        <span className="border-2 border-black bg-[#a7f3d0] px-2 py-0.5 font-mono text-xs font-black text-black shadow-[2px_2px_0_0_#000]">
          Total: {formatVnd(totalRevenue)}
        </span>
      </div>

      {/* Chunky Bars Container */}
      <div className="my-6 space-y-4">
        {items.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group cursor-pointer"
            >
              <div className="mb-1 flex items-center justify-between font-mono text-xs font-black">
                <span className="flex items-center gap-2 text-black">
                  <span
                    className="inline-block h-3 w-3 border border-black shadow-[1px_1px_0_0_#000]"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.category}
                </span>
                <span className="text-neutral-900">
                  {formatVnd(item.revenue)} ({item.percentage}%)
                </span>
              </div>

              {/* Bar Outer Track */}
              <div className="h-6 w-full border-2 border-black bg-neutral-100 p-0.5 shadow-[2px_2px_0_0_#000]">
                <div
                  className="h-full border border-black transition-all duration-300 group-hover:brightness-95"
                  style={{
                    width: `${Math.max(item.percentage, 4)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>

              {/* Sub-info on hover */}
              <div
                className={`mt-1 flex items-center justify-between font-mono text-[10px] text-neutral-600 transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-75"
                }`}
              >
                <span>Đã bán: {item.unitCount.toLocaleString()} đơn vị</span>
                <span>Tỷ trọng: {item.percentage}% tổng doanh số</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Pill */}
      <div className="flex items-center justify-between border-t-2 border-black bg-[#fef08a] px-3 py-2 font-mono text-xs font-black shadow-[2px_2px_0_0_#000]">
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="stroke-[2.5]" /> Điểm nổi bật:
        </span>
        <span>Hardware LED đóng góp 62% doanh thu</span>
      </div>
    </div>
  );
}

// =========================================================================
// 2. TOP-SELLING PRODUCTS (LEADERBOARD LIST)
// =========================================================================

export function TopSellingProductsList({ items }: { items: TopProductItem[] }) {
  const formatMoney = (val: number) => {
    return `${(val / 1000).toLocaleString("vi-VN")}k đ`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-[#fef08a] text-black";
    if (rank === 2) return "bg-[#e2e8f0] text-black";
    if (rank === 3) return "bg-[#fed7aa] text-black";
    return "bg-white text-black";
  };

  return (
    <div className="flex h-full flex-col justify-between border-3 border-black bg-white p-5 shadow-[5px_5px_0_0_#000]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center border-2 border-black bg-[#fef08a] shadow-[2px_2px_0_0_#000]">
            <TrendingUp size={17} className="text-black stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
              Top sản phẩm bán chạy
            </h3>
            <p className="font-mono text-[11px] text-neutral-600">
              Xếp hạng theo sản lượng & doanh thu
            </p>
          </div>
        </div>
        <span className="border-2 border-black bg-black px-2 py-0.5 font-mono text-xs font-black text-white shadow-[2px_2px_0_0_#fff]">
          TOP 5
        </span>
      </div>

      {/* Product Items List */}
      <div className="my-4 divide-y-2 divide-neutral-200">
        {items.map((prod) => (
          <div
            key={prod.id}
            className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#fffdf0]"
          >
            {/* Rank + Icon + Info */}
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`grid h-7 w-7 flex-shrink-0 place-items-center border-2 border-black font-mono text-xs font-black shadow-[2px_2px_0_0_#000] ${getRankBadge(
                  prod.rank
                )}`}
              >
                #{prod.rank}
              </span>

              <div className="grid h-9 w-9 flex-shrink-0 place-items-center border-2 border-black bg-neutral-100 text-lg shadow-[2px_2px_0_0_#000]">
                {prod.thumbnail}
              </div>

              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-black text-black group-hover:underline">
                  {prod.name}
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-600">
                  <span className="uppercase">{prod.category}</span>
                  <span>•</span>
                  <span>{prod.unitsSold.toLocaleString()} đơn đã bán</span>
                </div>
              </div>
            </div>

            {/* Sales Revenue */}
            <div className="text-right">
              <p className="font-mono text-xs font-black text-black">
                {formatMoney(prod.revenue)}
              </p>
              <span className="inline-block border border-black bg-[#a7f3d0] px-1.5 py-0.2 font-mono text-[9px] font-black uppercase">
                {prod.stockStatus || "Active"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stats summary */}
      <div className="flex items-center justify-between border-t-2 border-black bg-[#e9d5ff] px-3 py-2 font-mono text-xs font-black shadow-[2px_2px_0_0_#000]">
        <span>Chủ lực doanh số:</span>
        <span>64×64 Matrix Pro</span>
      </div>
    </div>
  );
}

// =========================================================================
// 3. FIRMWARE VERSION DISTRIBUTION (NEO-BRUTALIST DONUT CHART)
// =========================================================================

export function FirmwareDistributionChart({
  items,
  totalDevices,
}: {
  items: FirmwareDistributionItem[];
  totalDevices: number;
}) {
  // Compute SVG Donut stroke-dasharray offsets
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~ 339.29
  let accumulatedPercent = 0;

  return (
    <div className="flex h-full flex-col justify-between border-3 border-black bg-white p-5 shadow-[5px_5px_0_0_#000]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center border-2 border-black bg-[#a7f3d0] shadow-[2px_2px_0_0_#000]">
            <PieChart size={17} className="text-black stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
              Phân bổ Firmware thiết bị LED
            </h3>
            <p className="font-mono text-[11px] text-neutral-600">
              8,642 phần cứng LED đang online
            </p>
          </div>
        </div>
        <span className="border-2 border-black bg-[#a7f3d0] px-2 py-0.5 font-mono text-xs font-black text-black shadow-[2px_2px_0_0_#000]">
          91.4% v2.4+
        </span>
      </div>

      {/* Donut and Legend Grid */}
      <div className="my-4 grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
        {/* SVG Donut */}
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 140 140">
            {/* Background track circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="fill-transparent stroke-neutral-200"
              strokeWidth="20"
            />
            {/* Segment arcs */}
            {items.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              return (
                <circle
                  key={item.version}
                  cx="70"
                  cy="70"
                  r={radius}
                  className="fill-transparent transition-all duration-300 hover:opacity-80"
                  stroke={item.color}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
          </svg>

          {/* Donut Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-neutral-600">
              LATEST OTA
            </span>
            <span className="font-mono text-2xl font-black text-black">74%</span>
            <span className="border border-black bg-[#a7f3d0] px-1 font-mono text-[9px] font-black uppercase">
              v2.4.0
            </span>
          </div>
        </div>

        {/* Legend Cards */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.version}
              className="flex items-center justify-between border-2 border-black bg-neutral-50 px-3 py-1.5 shadow-[2px_2px_0_0_#000]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 border border-black shadow-[1px_1px_0_0_#000]"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <span className="font-mono text-xs font-black text-black">
                    {item.label}
                  </span>
                  {item.isCurrent && (
                    <span className="ml-1 border border-black bg-[#a7f3d0] px-1 font-mono text-[9px] font-black uppercase">
                      Current
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs font-black text-neutral-800">
                {item.percentage}% ({item.deviceCount.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Alert */}
      <div className="flex items-center justify-between border-t-2 border-black bg-[#fef08a] px-3 py-2 font-mono text-xs font-black shadow-[2px_2px_0_0_#000]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="stroke-[2.5]" />
          Tình trạng OTA:
        </span>
        <span>Chỉ còn 2% thiết bị chạy phiên bản cũ v1.9</span>
      </div>
    </div>
  );
}

// =========================================================================
// 4. USER REGISTRATION & ROLE BREAKDOWN (BAR / METRIC GRID)
// =========================================================================

export function UserRoleBreakdownChart({
  items,
  totalUsers,
  totalEmployees,
}: {
  items: UserRoleBreakdownItem[];
  totalUsers: number;
  totalEmployees: number;
}) {
  return (
    <div className="flex h-full flex-col justify-between border-3 border-black bg-white p-5 shadow-[5px_5px_0_0_#000]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center border-2 border-black bg-[#e9d5ff] shadow-[2px_2px_0_0_#000]">
            <Users size={17} className="text-black stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
              Cơ cấu người dùng & Phân quyền RBAC
            </h3>
            <p className="font-mono text-[11px] text-neutral-600">
              {totalUsers.toLocaleString()} Tổng Users • {totalEmployees} Nhân sự nội bộ
            </p>
          </div>
        </div>
        <span className="border-2 border-black bg-[#e9d5ff] px-2 py-0.5 font-mono text-xs font-black text-black shadow-[2px_2px_0_0_#000]">
          5 Roles Active
        </span>
      </div>

      {/* Stacked Proportional Bar */}
      <div className="my-4">
        <div className="mb-2 flex items-center justify-between font-mono text-xs font-black text-black">
          <span>Tỷ lệ phân bố tài khoản</span>
          <span>100% Verified</span>
        </div>
        <div className="flex h-7 w-full overflow-hidden border-2 border-black bg-neutral-100 p-0.5 shadow-[3px_3px_0_0_#000]">
          {items.map((role) => (
            <div
              key={role.role}
              style={{
                width: `${Math.max(role.percentage, 2)}%`,
                backgroundColor: role.color,
              }}
              title={`${role.role}: ${role.count} (${role.percentage}%)`}
              className="h-full border-r border-black last:border-r-0 transition-transform hover:scale-y-110"
            />
          ))}
        </div>
      </div>

      {/* Role Breakdown Grid */}
      <div className="space-y-2">
        {items.map((role) => (
          <div
            key={role.role}
            className="flex items-center justify-between border-2 border-black bg-neutral-50 px-3 py-1.5 shadow-[2px_2px_0_0_#000]"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 border border-black shadow-[1px_1px_0_0_#000]"
                style={{ backgroundColor: role.color }}
              />
              <span className="border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black uppercase">
                {role.role}
              </span>
              <span className="font-mono text-xs font-semibold text-neutral-700">
                {role.roleNameVi}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-black">
              <span>{role.count.toLocaleString()}</span>
              <span className="text-neutral-500">({role.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Pill */}
      <div className="mt-4 flex items-center justify-between border-t-2 border-black bg-[#a7f3d0] px-3 py-2 font-mono text-xs font-black shadow-[2px_2px_0_0_#000]">
        <span>Hoạt động 7 ngày qua:</span>
        <span>9,464 tài khoản đăng nhập tương tác</span>
      </div>
    </div>
  );
}
