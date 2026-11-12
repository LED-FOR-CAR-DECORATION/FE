"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import type { NeoRetroColor } from "../types";

export interface NeoTableColumn<T> {
  id: string;
  header: React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface NeoTableProps<T> {
  title: string;
  icon?: LucideIcon;
  badgeCount?: number | string;
  badgeLabel?: string;
  headerColor?: NeoRetroColor;
  columns: NeoTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  actions?: React.ReactNode;
  footerNote?: string;
  className?: string;
}

const HEADER_BG_MAP: Record<NeoRetroColor, string> = {
  mint: "bg-[#a7f3d0]",
  yellow: "bg-[#fef08a]",
  lavender: "bg-[#e9d5ff]",
  coral: "bg-[#fed7aa]",
  cyan: "bg-[#bae6fd]",
  white: "bg-white",
};

export default function NeoTable<T>({
  title,
  icon: Icon,
  badgeCount,
  badgeLabel,
  headerColor = "white",
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found in database.",
  actions,
  footerNote,
  className = "",
}: NeoTableProps<T>) {
  const headerBg = HEADER_BG_MAP[headerColor];

  return (
    <div
      className={`border-3 border-black bg-white shadow-[5px_5px_0_0_#000] transition-shadow duration-150 ${className}`}
    >
      {/* Top Banner / Card Title Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b-3 border-black px-4 py-3 sm:px-5 ${headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="grid h-8 w-8 place-items-center border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
              <Icon size={16} className="text-black stroke-[2.5]" />
            </div>
          )}
          <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black sm:text-base">
            {title}
          </h3>
          {badgeCount !== undefined && (
            <span className="border-2 border-black bg-black px-2 py-0.5 font-mono text-[11px] font-black text-white shadow-[1px_1px_0_0_#fff]">
              {badgeCount} {badgeLabel ? `${badgeLabel}` : ""}
            </span>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Content Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-neutral-100 font-mono text-xs uppercase tracking-wider text-black">
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={`px-4 py-3 font-black ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-neutral-200">
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  className={`transition-colors duration-100 hover:bg-[#fffbeb] ${
                    index % 2 === 1 ? "bg-neutral-50/70" : "bg-white"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-4 py-3 font-medium text-black ${
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                          ? "text-right"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.accessor ? col.accessor(row) : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center font-mono text-sm font-bold text-neutral-500"
                >
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center border-2 border-black bg-[#fef08a] shadow-[2px_2px_0_0_#000]">
                    🎮
                  </div>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {footerNote && (
        <div className="flex items-center justify-between border-t-2 border-black bg-neutral-50 px-4 py-2 font-mono text-xs font-semibold text-neutral-600 sm:px-5">
          <span>{footerNote}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            PIXEL HUB DATA GRID
          </span>
        </div>
      )}
    </div>
  );
}
