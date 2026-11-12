"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock3,
  AlertTriangle,
  PackageCheck,
  Store,
  Layers,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import NeoKpiCard from "./NeoKpiCard";
import NeoTable, { type NeoTableColumn } from "./NeoTable";
import { RevenueCategoryBarChart, TopSellingProductsList } from "./NeoCharts";
import CharacterReviewModal from "./CharacterReviewModal";
import {
  MANAGER_KPI_MOCK,
  PENDING_CHARACTERS_QUEUE_MOCK,
  LOW_STOCK_LEDS_MOCK,
  WARRANTY_ALERTS_MOCK,
  REVENUE_BY_CATEGORY_MOCK,
  TOP_SELLING_PRODUCTS_MOCK,
} from "../mockData";
import type {
  PendingCharacterItem,
  LowStockLedItem,
  WarrantyAlertItem,
} from "../types";

export default function ManagerDashboard() {
  const [pendingQueue, setPendingQueue] = useState<PendingCharacterItem[]>(
    PENDING_CHARACTERS_QUEUE_MOCK
  );
  const [selectedReviewItem, setSelectedReviewItem] =
    useState<PendingCharacterItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertTab, setAlertTab] = useState<"low-stock" | "warranty">("low-stock");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApproveCharacter = (item: PendingCharacterItem) => {
    setPendingQueue((prev) => prev.filter((c) => c.id !== item.id));
    showToast(`✓ Đã duyệt và mở bán thành công: "${item.name}" trên Store!`);
  };

  const handleRejectCharacter = (item: PendingCharacterItem) => {
    setPendingQueue((prev) => prev.filter((c) => c.id !== item.id));
    showToast(`Đã gửi yêu cầu chỉnh sửa cho designer của "${item.name}".`);
  };

  // -------------------------------------------------------------------------
  // Table Columns: Quick Review Queue
  // -------------------------------------------------------------------------
  const reviewColumns: NeoTableColumn<PendingCharacterItem>[] = [
    {
      id: "character",
      header: "Tên Character & Thumbnail",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center border-2 border-black bg-[#fef08a] text-xl shadow-[2px_2px_0_0_#000]">
            {row.thumbnailUrl}
          </div>
          <div>
            <p className="font-mono text-xs font-black text-black">{row.name}</p>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-600">
              <span className="border border-black bg-white px-1 font-bold">
                {row.resolution}
              </span>
              <span>•</span>
              <span>{row.frames} frames</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "designer",
      header: "Designer",
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-black text-black">
            {row.designer.name}
          </span>
          <span className="block font-mono text-[10px] text-neutral-500">
            {row.designer.handle}
          </span>
        </div>
      ),
    },
    {
      id: "format",
      header: "Định dạng",
      accessor: (row) => (
        <span className="border border-black bg-[#e9d5ff] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-black">
          {row.format}
        </span>
      ),
    },
    {
      id: "price",
      header: "Giá bán",
      accessor: (row) => (
        <span className="font-mono text-xs font-black text-black">
          {row.isFree
            ? "MIỄN PHÍ"
            : `${row.price.toLocaleString("vi-VN")} đ`}
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      accessor: () => (
        <span className="border-2 border-black bg-[#fef08a] px-2 py-0.5 font-mono text-[10px] font-black text-black shadow-[1px_1px_0_0_#000]">
          Chờ duyệt
        </span>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      align: "right",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => setSelectedReviewItem(row)}
          className="border-2 border-black bg-[#a7f3d0] px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Review
        </button>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Table Columns: Low-Stock LEDs
  // -------------------------------------------------------------------------
  const lowStockColumns: NeoTableColumn<LowStockLedItem>[] = [
    {
      id: "model",
      header: "Mã Model & Tên phần cứng",
      accessor: (row) => (
        <div>
          <span className="border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black">
            {row.modelCode}
          </span>
          <p className="mt-1 font-mono text-xs font-black text-black">{row.name}</p>
          <span className="font-mono text-[10px] text-neutral-500">
            Kích thước: {row.dimensions}
          </span>
        </div>
      ),
    },
    {
      id: "stock",
      header: "Tồn kho / Ngưỡng min",
      accessor: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-[#dc2626]">
              {row.currentStock} cái
            </span>
            <span className="font-mono text-[10px] text-neutral-500">
              (Min: {row.minimumStock})
            </span>
          </div>
          {/* Visual Stock Bar */}
          <div className="mt-1 h-2 w-28 border border-black bg-neutral-200">
            <div
              className={`h-full ${
                row.urgency === "CRITICAL" ? "bg-[#ef4444]" : "bg-[#f59e0b]"
              }`}
              style={{
                width: `${Math.min(100, (row.currentStock / row.minimumStock) * 100)}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "reserved",
      header: "Đã đặt trước",
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-neutral-700">
          {row.reserved} cái
        </span>
      ),
    },
    {
      id: "price",
      header: "Đơn giá",
      accessor: (row) => (
        <span className="font-mono text-xs font-black text-black">
          {row.unitPrice.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "urgency",
      header: "Mức cảnh báo",
      accessor: (row) => (
        <span
          className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000] ${
            row.urgency === "CRITICAL"
              ? "bg-[#fda4af] text-black"
              : "bg-[#fed7aa] text-black"
          }`}
        >
          {row.urgency === "CRITICAL" ? "Khẩn cấp" : "Sắp hết"}
        </span>
      ),
    },
    {
      id: "action",
      header: "Nhập hàng",
      align: "right",
      accessor: (row) => (
        <button
          type="button"
          onClick={() =>
            showToast(`Đã tạo yêu cầu nhập thêm 50 đơn vị cho ${row.modelCode}`)
          }
          className="border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Tạo PO
        </button>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Table Columns: Warranty Alerts
  // -------------------------------------------------------------------------
  const warrantyColumns: NeoTableColumn<WarrantyAlertItem>[] = [
    {
      id: "ticket",
      header: "Mã Ticket & Khách hàng",
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-black text-black">
            {row.ticketId}
          </span>
          <p className="font-mono text-[11px] text-neutral-800">
            {row.customerName}
          </p>
          <span className="font-mono text-[9px] text-neutral-500">
            {row.customerEmail}
          </span>
        </div>
      ),
    },
    {
      id: "device",
      header: "Mẫu LED & Serial",
      accessor: (row) => (
        <div>
          <p className="font-mono text-xs font-black text-black">
            {row.deviceModel}
          </p>
          <span className="border border-black bg-neutral-100 px-1 font-mono text-[9px] font-bold">
            {row.deviceSerial}
          </span>
        </div>
      ),
    },
    {
      id: "issue",
      header: "Vấn đề kỹ thuật",
      width: "35%",
      accessor: (row) => (
        <p className="line-clamp-2 font-mono text-xs text-neutral-700">
          {row.issueDescription}
        </p>
      ),
    },
    {
      id: "status",
      header: "Tình trạng",
      accessor: (row) => (
        <span
          className={`border border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
            row.status === "Replacement Approved"
              ? "bg-[#a7f3d0]"
              : row.status === "Under Inspection"
              ? "bg-[#fef08a]"
              : "bg-[#fed7aa]"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      id: "action",
      header: "Xử lý",
      align: "right",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => showToast(`Mở hồ sơ bảo hành ${row.ticketId}`)}
          className="border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border-3 border-black bg-[#a7f3d0] px-4 py-3 font-mono text-xs font-black text-black shadow-[5px_5px_0_0_#000] animate-bounce">
          <CheckCircle2 size={18} className="stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Hero Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-3 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
        <div>
          <div className="flex items-center gap-2">
            <span className="border-2 border-black bg-[#fef08a] px-2.5 py-0.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0_0_#000]">
              PIXEL HUB • STORE OPS
            </span>
            <span className="border border-black bg-[#a7f3d0] px-2 py-0.5 font-mono text-[11px] font-black text-black">
              ● STORE ONLINE
            </span>
          </div>
          <h1 className="mt-2 font-mono text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
            Manager Dashboard
          </h1>
          <p className="mt-0.5 font-mono text-xs font-semibold text-neutral-600 sm:text-sm">
            Điều hành kinh doanh, xét duyệt Character pixel art và theo dõi tồn kho LED kính chắn gió.
          </p>
        </div>

        {/* Header Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="border-2 border-black bg-[#e9d5ff] px-3 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Chuyển qua Admin Console ➔
          </Link>
          <Link
            href="/staff/pricing"
            className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Store size={14} className="stroke-[2.5]" /> Quản lý Store Listing
          </Link>
          <button
            type="button"
            onClick={() => showToast("Đã đồng bộ số liệu mới nhất từ kho và cổng thanh toán!")}
            className="flex items-center gap-1.5 border-2 border-black bg-[#fef08a] px-3.5 py-2 font-mono text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:bg-black hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <RefreshCw size={14} className="stroke-[2.5]" /> Refresh
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. KPI CARDS ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Business Metrics Overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {/* Card 1: Total Revenue */}
          <NeoKpiCard
            title="Tổng doanh thu"
            subtitle="Tháng hiện tại (VND)"
            value={`${(MANAGER_KPI_MOCK.totalRevenue / 1000000000).toFixed(3)} Tỷ`}
            icon={DollarSign}
            colorTheme="mint"
            growth={{
              value: `+${MANAGER_KPI_MOCK.revenueGrowthPercent}%`,
              isPositive: true,
              label: "so với tháng trước (+287 tr)",
            }}
            badge={{ text: "TĂNG TRƯỞNG MẠNH", tone: "success" }}
          />

          {/* Card 2: Pending Store Characters */}
          <NeoKpiCard
            title="Character chờ duyệt"
            subtitle="Chờ Manager thẩm định"
            value={`${pendingQueue.length} Items`}
            icon={Clock3}
            colorTheme="yellow"
            badge={{
              text: pendingQueue.length > 0 ? "ACTION REQUIRED" : "ALL CLEAR",
              tone: "alert",
            }}
            helperText="Yêu cầu duyệt trong vòng 24 giờ"
            actionButton={{
              label: "Duyệt ngay",
              onClick: () => {
                if (pendingQueue.length > 0) setSelectedReviewItem(pendingQueue[0]);
              },
            }}
          />

          {/* Card 3: Low-Stock LED Models */}
          <NeoKpiCard
            title="Model LED sắp hết"
            subtitle="Cần nhập thêm vào kho"
            value={`${LOW_STOCK_LEDS_MOCK.length} Models`}
            icon={AlertTriangle}
            colorTheme="coral"
            isWarning={true}
            badge={{ text: "RESTOCK NEEDED", tone: "warning" }}
            helperText="64x64 Matrix Pro còn 15 chiếc"
            actionButton={{
              label: "Xem chi tiết",
              onClick: () => setAlertTab("low-stock"),
            }}
          />

          {/* Card 4: Active Bundles & Price Configs */}
          <NeoKpiCard
            title="Bundles & Giá bán"
            subtitle="Cấu hình đang kích hoạt"
            value={`${MANAGER_KPI_MOCK.activeBundlesCount} Bundles`}
            icon={PackageCheck}
            colorTheme="lavender"
            badge={{ text: `${MANAGER_KPI_MOCK.activePriceConfigsCount} RULES`, tone: "purple" }}
            helperText="Cấu hình phụ thu & chiết khấu Combo"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHARTS ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Sales and Category Charts">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Revenue by Category (Bar Chart) */}
          <RevenueCategoryBarChart
            items={REVENUE_BY_CATEGORY_MOCK}
            totalRevenue={MANAGER_KPI_MOCK.totalRevenue}
          />

          {/* Top-Selling Products (Leaderboard) */}
          <TopSellingProductsList items={TOP_SELLING_PRODUCTS_MOCK} />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTIONABLE TABLES ROW */}
      {/* ------------------------------------------------------------- */}
      <section aria-label="Actionable Operations Tables" className="space-y-6">
        {/* Table 1: Quick Review Queue */}
        <NeoTable
          title="Hàng chờ duyệt Character (Quick Review Queue)"
          icon={Store}
          badgeCount={pendingQueue.length}
          badgeLabel="PENDING"
          headerColor="yellow"
          columns={reviewColumns}
          data={pendingQueue}
          keyExtractor={(row) => row.id}
          emptyMessage="Tuyệt vời! Hiện không còn Character nào đang chờ duyệt."
          footerNote={`Hiển thị ${pendingQueue.length} bản thiết kế pixel art mới nhất từ Designer đối tác.`}
          actions={
            <span className="font-mono text-xs font-bold text-neutral-700">
              ⚡ Xem trước trực tiếp trên LED mô phỏng
            </span>
          }
        />

        {/* Table 2: Inventory & Warranty Alerts (with Toggle) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAlertTab("low-stock")}
                className={`border-3 border-black px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                  alertTab === "low-stock"
                    ? "bg-[#fed7aa] shadow-[4px_4px_0_0_#000]"
                    : "bg-white shadow-[2px_2px_0_0_#000] hover:bg-neutral-100"
                } active:translate-x-0.5 active:translate-y-0.5`}
              >
                ⚠️ Cảnh báo tồn kho LED ({LOW_STOCK_LEDS_MOCK.length})
              </button>

              <button
                type="button"
                onClick={() => setAlertTab("warranty")}
                className={`border-3 border-black px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                  alertTab === "warranty"
                    ? "bg-[#fef08a] shadow-[4px_4px_0_0_#000]"
                    : "bg-white shadow-[2px_2px_0_0_#000] hover:bg-neutral-100"
                } active:translate-x-0.5 active:translate-y-0.5`}
              >
                🛡️ Yêu cầu bảo hành gần đây ({WARRANTY_ALERTS_MOCK.length})
              </button>
            </div>

            <Link
              href={alertTab === "low-stock" ? "/staff/inventory" : "/staff/warranty"}
              className="flex items-center gap-1 font-mono text-xs font-black text-black hover:underline"
            >
              Xem toàn bộ danh sách <ArrowRight size={14} />
            </Link>
          </div>

          {alertTab === "low-stock" ? (
            <NeoTable
              title="Danh sách LED Matrix chạm ngưỡng tồn kho tối thiểu"
              icon={AlertTriangle}
              badgeCount={LOW_STOCK_LEDS_MOCK.length}
              badgeLabel="ITEMS"
              headerColor="coral"
              columns={lowStockColumns}
              data={LOW_STOCK_LEDS_MOCK}
              keyExtractor={(row) => row.productId}
              footerNote="Cần tạo đơn đặt hàng bổ sung (PO) với nhà sản xuất module trước 48h."
            />
          ) : (
            <NeoTable
              title="Yêu cầu bảo hành & sửa chữa LED kính chắn gió ô tô"
              icon={ShieldAlert}
              badgeCount={WARRANTY_ALERTS_MOCK.length}
              badgeLabel="TICKETS"
              headerColor="yellow"
              columns={warrantyColumns}
              data={WARRANTY_ALERTS_MOCK}
              keyExtractor={(row) => row.ticketId}
              footerNote="Theo quy định BR-15: Phần cứng LED xe ô tô được bảo hành chính hãng 12 tháng."
            />
          )}
        </div>
      </section>

      {/* Review Modal Dialog */}
      <CharacterReviewModal
        character={selectedReviewItem}
        isOpen={Boolean(selectedReviewItem)}
        onClose={() => setSelectedReviewItem(null)}
        onApprove={handleApproveCharacter}
        onReject={handleRejectCharacter}
      />
    </div>
  );
}
