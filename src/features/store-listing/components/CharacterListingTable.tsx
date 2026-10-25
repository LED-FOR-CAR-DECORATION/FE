"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ArrowLeftRight, EyeOff, RotateCcw, Rocket, Search, Undo2 } from "lucide-react";
import { formatDateTime } from "../format";
import type { ListingStatus, PublishMode, StoreCharacterRow } from "../types";
import StatusBadge, { STATUS_LABEL } from "./StatusBadge";

type StatusFilter = ListingStatus | "All";

interface CharacterListingTableProps {
  rows: StoreCharacterRow[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** BR-14: false nếu không phải Manager — vô hiệu hóa thao tác. */
  canManage: boolean;
  onPublish: (character: StoreCharacterRow, mode: PublishMode) => void;
  onUnlist: (character: StoreCharacterRow) => void;
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "All", label: "Tất cả trạng thái" },
  { value: "Pending Review", label: STATUS_LABEL["Pending Review"] },
  { value: "Published", label: STATUS_LABEL["Published"] },
  { value: "Hidden", label: STATUS_LABEL["Hidden"] },
];

const HEADINGS = [
  "Mã Character",
  "Thumbnail",
  "Tên Character",
  "Designer",
  "Version đang bán",
  "Trạng thái",
  "Thao tác",
];

const FORBIDDEN_HINT = "Chỉ Manager mới có quyền thay đổi trạng thái hiển thị trên Store.";

export default function CharacterListingTable({
  rows,
  isLoading,
  error,
  onRetry,
  canManage,
  onPublish,
  onUnlist,
}: CharacterListingTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!normalized || row.name.toLowerCase().includes(normalized)) &&
        (status === "All" || row.status === status),
    );
  }, [query, rows, status]);

  const hasFilters = query !== "" || status !== "All";
  const reset = () => {
    setQuery("");
    setStatus("All");
  };

  return (
    <>
      <div className="grid gap-3 border-b border-[#e3efe6] p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="flex items-center gap-2 rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm transition-shadow focus-within:border-[#48a56a] focus-within:shadow-[0_0_0_3px_rgba(72,165,106,.15)]">
          <Search size={15} className="shrink-0 text-text-muted" />
          <span className="sr-only">Tìm kiếm Character theo tên</span>
          <input
            type="search"
            id="character-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm Character theo tên…"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <label className="flex items-center">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select
            id="character-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className="w-full rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm font-medium"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={reset}
          disabled={!hasFilters}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#cfe0d4] px-3 py-2 text-xs font-bold transition-colors hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={14} /> Đặt lại
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <caption className="sr-only">Danh sách Character chờ duyệt hoặc đang niêm yết trên Store</caption>
          <thead className="border-b border-[#e3efe6]">
            <tr>
              {HEADINGS.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows />}

            {!isLoading && error && (
              <tr>
                <td colSpan={HEADINGS.length} className="px-4 py-14 text-center">
                  <div role="alert" className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <AlertTriangle size={24} className="text-red-600" />
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      <RotateCcw size={13} /> Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={HEADINGS.length} className="px-4 py-14 text-center text-sm font-semibold text-text-muted">
                  {rows.length === 0
                    ? "Chưa có Character nào được gửi duyệt."
                    : "Không tìm thấy Character phù hợp với bộ lọc."}
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              filtered.map((row) => (
                <tr key={row.characterId} className="border-b border-[#eef5f0] last:border-0 hover:bg-[#f9fdfa]">
                  <td className="whitespace-nowrap px-4 py-3 font-black text-primary-dark">{row.characterId}</td>
                  <td className="px-4 py-3">
                    <Image
                      src={row.thumbnailUrl}
                      alt={`Thumbnail của ${row.name}`}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg border border-[#d8e6dc] bg-[#f6fbf7] object-contain"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{row.name}</p>
                    <p className="text-[11px] text-text-muted">Cập nhật lúc {formatDateTime(row.updatedAt)}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{row.creatorName}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ActiveVersionCell row={row} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions row={row} canManage={canManage} onPublish={onPublish} onUnlist={onUnlist} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && (
        <p className="border-t border-[#e3efe6] px-4 py-3 text-xs font-medium text-text-muted" aria-live="polite">
          Hiển thị {filtered.length} / {rows.length} Character
        </p>
      )}
    </>
  );
}

function ActiveVersionCell({ row }: { row: StoreCharacterRow }) {
  if (!row.activeVersion) {
    return <span className="text-xs font-semibold text-text-muted">— chưa chọn</span>;
  }
  if (row.status === "Hidden") {
    return (
      <span className="text-xs font-semibold text-text-muted">
        v{row.activeVersion.versionNumber} <span className="font-medium">(đã publish trước đó)</span>
      </span>
    );
  }
  return (
    <span className="rounded-md border border-[#cfe5d6] bg-[#f1faf4] px-2 py-1 text-xs font-black text-[#2c5a3f]">
      v{row.activeVersion.versionNumber}
    </span>
  );
}

interface RowActionsProps {
  row: StoreCharacterRow;
  canManage: boolean;
  onPublish: CharacterListingTableProps["onPublish"];
  onUnlist: CharacterListingTableProps["onUnlist"];
}

/** Thao tác tùy thuộc theo trạng thái của Character. BR-14: vô hiệu nếu tài khoản không phải Manager. */
function RowActions({ row, canManage, onPublish, onUnlist }: RowActionsProps) {
  const title = canManage ? undefined : FORBIDDEN_HINT;

  switch (row.status) {
    case "Pending Review":
      return (
        <ActionButton
          variant="primary"
          disabled={!canManage}
          title={title}
          onClick={() => onPublish(row, "review")}
          icon={<Rocket size={13} />}
        >
          Review &amp; Publish
        </ActionButton>
      );
    case "Published":
      return (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="secondary"
            disabled={!canManage}
            title={title}
            onClick={() => onPublish(row, "change")}
            icon={<ArrowLeftRight size={13} />}
          >
            Đổi Version
          </ActionButton>
          <ActionButton
            variant="danger"
            disabled={!canManage}
            title={title}
            onClick={() => onUnlist(row)}
            icon={<EyeOff size={13} />}
          >
            Ẩn (Unlist)
          </ActionButton>
        </div>
      );
    case "Hidden":
      return (
        <ActionButton
          variant="secondary"
          disabled={!canManage}
          title={title}
          onClick={() => onPublish(row, "republish")}
          icon={<Undo2 size={13} />}
        >
          Republish
        </ActionButton>
      );
  }
}

const VARIANT: Record<"primary" | "secondary" | "danger", string> = {
  primary:
    "border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] text-[#10351f] shadow-[2px_2px_0_#c6e8cd] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]",
  secondary: "border-[#cfe0d4] bg-white text-[#173b28] hover:border-[#a3d7b2] hover:bg-[#eef8f0]",
  danger: "border-red-200 bg-white text-red-700 hover:bg-red-50",
};

function ActionButton({
  variant,
  icon,
  children,
  ...props
}: { variant: keyof typeof VARIANT; icon: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition-all disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${VARIANT[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#eef5f0]" aria-hidden="true">
          {HEADINGS.map((heading) => (
            <td key={heading} className="px-4 py-4">
              <div
                className={`h-4 animate-pulse rounded bg-[#e7f3ea] ${
                  heading === "Thumbnail" ? "h-11 w-11" : "w-24"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
