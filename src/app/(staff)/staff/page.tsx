"use client";

import React, { useState } from "react";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Layers,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
  ChevronDown,
  ShoppingCart,
  ClipboardCheck,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Zap,
  BarChart2,
} from "lucide-react";

/* ── Tiny sparkline SVG (no external lib) ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── Stat Card ── */
interface StatCardProps {
  label: string;
  value: string | number;
  delta: number;
  sparkData: number[];
  icon: React.ReactNode;
}
function StatCard({ label, value, delta, sparkData, icon }: StatCardProps) {
  const positive = delta >= 0;
  return (
    <div className="neo-box-no-hover bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-primary/20 border-2 border-black flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <Sparkline data={sparkData} color={positive ? "#6eb782" : "#ef4444"} />
      </div>
      <p className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-black leading-none">{value}</p>
      <div className="flex items-center gap-1 text-xs font-bold">
        {positive ? (
          <TrendingUp size={13} className="text-primary-dark" />
        ) : (
          <TrendingDown size={13} className="text-red-500" />
        )}
        <span className={positive ? "text-primary-dark" : "text-red-500"}>
          {positive ? "+" : ""}{delta}%
        </span>
        <span className="text-text-muted font-medium">vs last 7 days</span>
      </div>
    </div>
  );
}

/* ── Mini bar + line chart (pure SVG) ── */
const ORDERS_DATA = [14, 20, 18, 32, 30, 25, 20];
const REVENUE_DATA = [280, 400, 360, 480, 420, 350, 300];
const DAYS = ["Oct 1", "Oct 2", "Oct 3", "Oct 4", "Oct 5", "Oct 6", "Oct 7"];

function OrderOverviewChart({ mode }: { mode: "orders" | "revenue" }) {
  const raw = mode === "orders" ? ORDERS_DATA : REVENUE_DATA;
  const maxVal = Math.max(...raw);
  const W = 460;
  const H = 160;
  const PAD = { left: 36, right: 8, top: 10, bottom: 24 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW = plotW / raw.length;

  const toY = (v: number) => PAD.top + plotH - (v / maxVal) * plotH;
  const toX = (i: number) => PAD.left + i * barW + barW / 2;

  const linePts = raw.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD.top + plotH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#999">
              {Math.round(maxVal * frac)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {raw.map((v, i) => {
        const barH = (v / maxVal) * plotH;
        return (
          <rect
            key={i}
            x={PAD.left + i * barW + barW * 0.15}
            y={PAD.top + plotH - barH}
            width={barW * 0.7}
            height={barH}
            fill="#89c89b"
            opacity="0.45"
          />
        );
      })}
      {/* Line */}
      <polyline points={linePts} fill="none" stroke="#6eb782" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {raw.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill="#6eb782" stroke="white" strokeWidth="2" />
      ))}
      {/* X labels */}
      {DAYS.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#555">
          {d}
        </text>
      ))}
    </svg>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending:   "bg-amber-100  text-amber-700  border-amber-400",
    Confirmed: "bg-blue-100   text-blue-700   border-blue-400",
    Shipping:  "bg-primary/30 text-primary-dark border-primary",
    Delivered: "bg-green-100  text-green-700  border-green-400",
  };
  return (
    <span className={`border px-2 py-0.5 text-[10px] font-bold rounded-sm ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {status}
    </span>
  );
}

/* ── Stock bar ── */
function StockBar({ label, current, total, status }: { label: string; current: number; total: number; status: "Low stock" | "In stock" | "Running low" }) {
  const pct = Math.round((current / total) * 100);
  const barColor =
    status === "Low stock"    ? "bg-red-400"   :
    status === "Running low"  ? "bg-amber-400" : "bg-primary";
  const badgeColor =
    status === "Low stock"    ? "border-red-400   text-red-600   bg-red-50"    :
    status === "Running low"  ? "border-amber-400 text-amber-700 bg-amber-50"  :
                                "border-primary   text-primary-dark bg-primary/10";
  return (
    <div className="flex items-center gap-3 py-3 border-b-2 border-gray-100 last:border-0">
      {/* Icon placeholder */}
      <div className="w-10 h-10 bg-gray-200 border-2 border-black flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold mb-1">{label}</p>
        <div className="h-2 bg-gray-200 border border-black w-full">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-xs font-bold text-text-muted whitespace-nowrap">{current} / {total}</span>
      <span className={`border text-[10px] font-bold px-2 py-0.5 whitespace-nowrap ${badgeColor}`}>{status}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function ManagerDashboard() {
  const today = "Oct 1, 2024 – Oct 8, 2024";

  /* State */
  const [chartMode, setChartMode] = React.useState<"orders" | "revenue">("orders");

  return (
    <div className="flex flex-col gap-6 max-w-[1280px]">

      {/* ── Top row: greeting + date ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black">Good morning, Manager!</h1>
          <p className="text-text-muted font-medium mt-1">Here is an overview of your store operations.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 font-semibold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow">
          <CalendarDays size={16} />
          {today}
          <ChevronDown size={14} />
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Orders"  value={18}  delta={12}  icon={<Package size={20}      />} sparkData={[10,12,14,16,15,17,18]} />
        <StatCard label="To Ship"         value={12}  delta={-8}  icon={<Truck size={20}        />} sparkData={[16,15,14,13,14,13,12]} />
        <StatCard label="LED Inventory"   value={146} delta={5}   icon={<Layers size={20}       />} sparkData={[130,135,138,140,142,144,146]} />
        <StatCard label="Low Stock Items" value={3}   delta={-25} icon={<AlertTriangle size={20}/>} sparkData={[8,7,6,5,5,4,3]} />
      </div>

      {/* ── Middle section: chart + inventory status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Order Overview */}
        <div className="lg:col-span-7 neo-box-no-hover bg-white p-5">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <BarChart2 size={18} />
                <h2 className="font-black text-lg">Order Overview</h2>
              </div>
              <p className="text-xs text-text-muted font-medium">Total orders and revenue in the selected period.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border-2 border-black overflow-hidden">
                <button
                  onClick={() => setChartMode("orders")}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${chartMode === "orders" ? "bg-primary" : "bg-white hover:bg-gray-50"}`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setChartMode("revenue")}
                  className={`px-3 py-1 text-xs font-bold transition-colors border-l-2 border-black ${chartMode === "revenue" ? "bg-primary" : "bg-white hover:bg-gray-50"}`}
                >
                  Revenue
                </button>
              </div>
              <button className="flex items-center gap-1 border-2 border-black px-2 py-1 text-xs font-semibold hover:bg-gray-50">
                Last 7 days <ChevronDown size={12} />
              </button>
            </div>
          </div>
          <OrderOverviewChart mode={chartMode} />
          <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary-dark inline-block" /> Orders</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> Revenue (USD)</span>
          </div>
        </div>

        {/* LED Inventory Status */}
        <div className="lg:col-span-5 neo-box-no-hover bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers size={18} />
              <h2 className="font-black text-lg">LED Inventory Status</h2>
            </div>
            <Link href="/manager/inventory" className="text-xs font-bold text-primary-dark flex items-center gap-0.5 hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          <StockBar label="64 × 64 Matrix" current={3}  total={50}  status="Low stock"   />
          <StockBar label="32 × 32 Matrix" current={86} total={100} status="In stock"    />
          <StockBar label="16 × 16 Matrix" current={42} total={80}  status="In stock"    />
          <StockBar label="8 × 8 Matrix"   current={15} total={60}  status="Running low" />
        </div>
      </div>

      {/* ── Bottom section: recent orders + todo + quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Recent Orders */}
        <div className="lg:col-span-5 neo-box-no-hover bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={17} />
              <h2 className="font-black text-base">Recent Orders</h2>
            </div>
            <Link href="/manager/orders" className="text-xs font-bold text-primary-dark flex items-center gap-0.5 hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-black text-left">
                {["#Order", "Customer", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} className="pb-2 font-black uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "#ORD-1048", customer: "Nguyen Minh", amount: "$90.00",  status: "Pending",   date: "Oct 8, 10:24" },
                { id: "#ORD-1047", customer: "Tran Anh",    amount: "$45.00",  status: "Confirmed", date: "Oct 8, 09:12" },
                { id: "#ORD-1046", customer: "Le Hoang",    amount: "$120.00", status: "Shipping",  date: "Oct 7, 18:40" },
                { id: "#ORD-1045", customer: "Pham Linh",   amount: "$16.00",  status: "Delivered", date: "Oct 7, 14:20" },
                { id: "#ORD-1044", customer: "Hoang Tuan",  amount: "$60.00",  status: "Pending",   date: "Oct 7, 11:05" },
              ].map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2 font-bold">{row.id}</td>
                  <td className="py-2">{row.customer}</td>
                  <td className="py-2 font-bold">{row.amount}</td>
                  <td className="py-2"><StatusBadge status={row.status} /></td>
                  <td className="py-2 text-text-muted">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* To Do List */}
        <div className="lg:col-span-4 neo-box-no-hover bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={17} />
              <h2 className="font-black text-base">To Do List</h2>
            </div>
            <Link href="/manager/orders" className="text-xs font-bold text-primary-dark flex items-center gap-0.5 hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "Confirm pending orders",   count: 6,  icon: <ShoppingCart size={14} />, color: "bg-amber-400" },
              { label: "Create shipping orders",   count: 12, icon: <Truck size={14} />,        color: "bg-primary" },
              { label: "Check low stock items",    count: 3,  icon: <AlertCircle size={14} />,  color: "bg-red-400" },
              { label: "Review warranty requests", count: 4,  icon: <ShieldCheck size={14} />,  color: "bg-blue-400" },
              { label: "Process device returns",   count: 2,  icon: <RefreshCw size={14} />,    color: "bg-purple-400" },
            ].map(({ label, count, icon, color }) => (
              <button
                key={label}
                className="flex items-center gap-3 p-2.5 border-2 border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow text-left w-full group"
              >
                <div className={`w-7 h-7 ${color} border-2 border-black flex items-center justify-center flex-shrink-0`}>
                  {icon}
                </div>
                <span className="text-sm font-semibold flex-1">{label}</span>
                <span className="w-6 h-6 bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 neo-box-no-hover bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={17} />
            <h2 className="font-black text-base">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "View Orders",         href: "/manager/orders",    icon: <ShoppingCart size={22} />,  primary: true  },
              { label: "Manage LED Inventory",href: "/manager/inventory", icon: <Layers size={22} />,        primary: false },
              { label: "Update Store Pricing",href: "/manager/pricing",   icon: <Package size={22} />,       primary: false },
              { label: "Create Shipping Order",href:"/manager/deliveries",icon: <Truck size={22} />,         primary: false },
            ].map(({ label, href, icon, primary }) => (
              <Link
                key={label}
                href={href}
                className={`flex flex-col items-center justify-center gap-2 p-3 border-2 border-black text-center text-xs font-bold hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow
                  ${primary ? "bg-primary" : "bg-white hover:bg-gray-50"}`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

