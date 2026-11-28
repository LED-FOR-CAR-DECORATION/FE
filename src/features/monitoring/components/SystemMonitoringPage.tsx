"use client";

import { useState } from "react";
import { Activity, ChevronRight, History, MonitorCog, RefreshCw } from "lucide-react";
import LiveMetricsSection from "./LiveMetricsSection";
import MetricsHistorySection from "./MetricsHistorySection";

type Tab = "live" | "history";

const TABS: { value: Tab; label: string; icon: typeof Activity }[] = [
  { value: "live", label: "Trực tiếp", icon: Activity },
  { value: "history", label: "Lịch sử", icon: History },
];

/** Admin system monitoring (Feature 17): live API metrics and component health, plus stored history. */
export default function SystemMonitoringPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="manager-neo-dashboard mx-auto flex w-full max-w-[1440px] flex-col gap-5 font-sans text-text-main">
      <header className="flex flex-wrap items-center justify-between gap-3 border-2 border-black border-l-8 border-l-primary bg-white px-4 py-3 shadow-[4px_4px_0_0_#000] sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              GIÁM SÁT HỆ THỐNG
            </span>
            <nav
              aria-label="Đường dẫn"
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
            >
              <span>Quản trị</span>
              <ChevronRight className="h-3.5 w-3.5 text-black" aria-hidden="true" />
              <span className="text-black">Giám sát hệ thống</span>
            </nav>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <MonitorCog size={20} className="shrink-0 text-primary-ink" aria-hidden="true" />
            <h1 className="text-lg font-black uppercase tracking-tight text-black sm:text-xl">Giám sát hệ thống</h1>
          </div>

          <p className="mt-0.5 text-xs font-medium text-text-muted">
            Theo dõi lưu lượng API, độ trễ, lỗi và tình trạng Database, Redis, JVM của máy chủ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Chế độ xem" className="flex border-2 border-black shadow-[2px_2px_0_0_#000]">
            {TABS.map(({ value, label, icon: Icon }, idx) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(value)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${idx > 0 ? "border-l-2 border-black" : ""} ${
                    active ? "bg-primary text-black" : "bg-white text-black hover:bg-primary/20"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setRefreshSignal((n) => n + 1)}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </header>

      {tab === "live" ? (
        <LiveMetricsSection refreshSignal={refreshSignal} />
      ) : (
        <MetricsHistorySection refreshSignal={refreshSignal} />
      )}
    </div>
  );
}
