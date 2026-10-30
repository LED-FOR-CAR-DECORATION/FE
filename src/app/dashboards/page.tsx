"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Shield, Sparkles, Terminal } from "lucide-react";
import ManagerDashboard from "@/features/dashboard/components/ManagerDashboard";
import AdminDashboard from "@/features/dashboard/components/AdminDashboard";

export default function DashboardsShowcasePage() {
  const [activeTab, setActiveTab] = useState<"manager" | "admin">("manager");

  return (
    <div className="min-h-screen bg-[#f8faf8] pb-16">
      {/* Top Demo Nav Bar */}
      <div className="sticky top-0 z-40 border-b-3 border-black bg-white shadow-[0_4px_0_0_#000]">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-black shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white"
            >
              <ArrowLeft size={14} /> PIXEL HUB
            </Link>
            <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-black">
              <span className="hidden sm:inline">DASHBOARD VIEWER:</span>
              <span className="border border-black bg-[#a7f3d0] px-2 py-0.5 text-[11px]">
                NEO-BRUTALISM EDITION
              </span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("manager")}
              className={`flex items-center gap-2 border-2 sm:border-3 border-black px-3.5 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                activeTab === "manager"
                  ? "bg-[#fef08a] shadow-[4px_4px_0_0_#000]"
                  : "bg-white shadow-[2px_2px_0_0_#000] hover:bg-neutral-100"
              } active:translate-x-0.5 active:translate-y-0.5`}
            >
              <Briefcase size={14} className="stroke-[2.5]" />
              <span>Manager Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 border-2 sm:border-3 border-black px-3.5 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                activeTab === "admin"
                  ? "bg-[#e9d5ff] shadow-[4px_4px_0_0_#000]"
                  : "bg-white shadow-[2px_2px_0_0_#000] hover:bg-neutral-100"
              } active:translate-x-0.5 active:translate-y-0.5`}
            >
              <Shield size={14} className="stroke-[2.5]" />
              <span>Admin Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mt-4">
        {activeTab === "manager" ? <ManagerDashboard /> : <AdminDashboard />}
      </main>
    </div>
  );
}
