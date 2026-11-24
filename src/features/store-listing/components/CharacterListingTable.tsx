"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Edit,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { formatDateTime } from "../format";
import type { PublishMode, StoreCharacterRow, StoreProductStatus } from "../types";
import StatusBadge, { STATUS_LABEL } from "./StatusBadge";
import type { StoreStatusFilter } from "./StoreListingToolbar";
import {
  STORE_FORBIDDEN_HINT,
  STORE_TABLE_CLASS,
  STORE_THEAD_CLASS,
  STORE_TH_CLASS,
  StoreActionButton,
  StoreEmptyRow,
  StoreErrorRow,
  StoreSkeletonRows,
  StoreTableFooter,
  StoreThumbnail,
  storeRowClass,
} from "./StoreTablePrimitives";

type StatusFilter = StoreProductStatus | "All";

interface CharacterListingTableProps {
  rows: StoreCharacterRow[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** BR-14: false nếu không phải Manager — vô hiệu hóa thao tác. */
  canManage: boolean;
  onPublish: (character: StoreCharacterRow, mode: PublishMode) => void;
  onUnlist: (character: StoreCharacterRow) => void;
  onEdit?: (character: StoreCharacterRow) => void;
  onArchive?: (character: StoreCharacterRow) => void;
  onDelete?: (character: StoreCharacterRow) => void;
  onCreateCharacter?: () => void;
  statusFilter?: StoreStatusFilter;
  searchQuery?: string;
  onResetFilters?: () => void;
  hideControls?: boolean;
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "All", label: "Tất cả trạng thái" },
  { value: "UNPUBLISHED", label: STATUS_LABEL.UNPUBLISHED },
  { value: "PUBLISHED", label: STATUS_LABEL.PUBLISHED },
  { value: "ARCHIVED", label: STATUS_LABEL.ARCHIVED },
  { value: "DELETED", label: STATUS_LABEL.DELETED },
];

const HEADINGS = [
  "Mã sản phẩm",
  "Ảnh đại diện",
  "Tên nhân vật",
  "Nhà thiết kế",
  "Trạng thái",
  "Thao tác",
];

export default function CharacterListingTable({
  rows,
  isLoading,
  error,
  onRetry,
  canManage,
  onPublish,
  onUnlist,
  onEdit,
  onArchive,
  onDelete,
  onCreateCharacter,
  statusFilter,
  searchQuery,
  onResetFilters,
  hideControls = false,
}: CharacterListingTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");

  const effectiveQuery = searchQuery !== undefined ? searchQuery : query;
  const effectiveStatus: StatusFilter =
    statusFilter !== undefined ? (statusFilter === "ALL" ? "All" : statusFilter) : status;

  const filtered = useMemo(() => {
    const normalized = effectiveQuery.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!normalized ||
          row.name.toLowerCase().includes(normalized) ||
          row.characterId.includes(normalized)) &&
        (effectiveStatus === "All" || row.status === effectiveStatus),
    );
  }, [effectiveQuery, effectiveStatus, rows]);

  const hasFilters = effectiveQuery !== "" || effectiveStatus !== "All";
  const reset = () => {
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    setQuery("");
    setStatus("All");
  };

  return (
    <>
      {!hideControls && (
        <div className="grid gap-3 border-b border-[#e3efe6] p-4 md:grid-cols-[1fr_220px_auto]">
          <label className="flex items-center gap-2 rounded-lg border border-[#d8e6dc] bg-white px-3 py-2 text-sm transition-shadow focus-within:border-[#48a56a] focus-within:shadow-[0_0_0_3px_rgba(72,165,106,.15)]">
            <Search size={15} className="shrink-0 text-text-muted" />
            <span className="sr-only">Tìm kiếm nhân vật theo tên</span>
            <input
              type="search"
              id="character-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm nhân vật theo tên…"
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
          {canManage && onCreateCharacter && (
            <button
              type="button"
              onClick={onCreateCharacter}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#eefaf1] px-3 py-2 text-xs font-black text-[#10351f] shadow-sm transition hover:bg-[#d8f5df]"
            >
              <Sparkles size={14} /> Mở bán nhân vật
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={STORE_TABLE_CLASS}>
          <caption className="sr-only">
            Danh sách nhân vật chờ duyệt hoặc đang niêm yết trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {HEADINGS.map((heading) => (
                <th key={heading} scope="col" className={STORE_TH_CLASS}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <StoreSkeletonRows columns={HEADINGS.length} />}

            {!isLoading && error && (
              <StoreErrorRow colSpan={HEADINGS.length} message={error} onRetry={onRetry} />
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <StoreEmptyRow
                colSpan={HEADINGS.length}
                message={
                  rows.length === 0
                    ? "Chưa có nhân vật nào được niêm yết trên cửa hàng."
                    : "Không tìm thấy nhân vật phù hợp với bộ lọc."
                }
                hasActiveFilters={rows.length > 0 && hasFilters}
                onResetFilters={reset}
                action={
                  canManage && onCreateCharacter ? (
                    <button
                      type="button"
                      onClick={onCreateCharacter}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#3f9660] bg-[#eefaf1] px-3.5 py-2 text-xs font-black text-[#10351f] shadow-sm transition hover:bg-[#d8f5df]"
                    >
                      <Sparkles size={14} /> Mở bán nhân vật từ nhà thiết kế
                    </button>
                  ) : undefined
                }
              />
            )}

            {!isLoading &&
              !error &&
              filtered.map((row) => {
                const isDeleted = row.status === "DELETED";
                return (
                  <tr key={row.characterId} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-black text-primary-dark">
                      #{row.characterId}
                    </td>
                    <td className="px-4 py-3">
                      <StoreThumbnail
                        src={row.thumbnailUrl}
                        alt={`Ảnh đại diện của ${row.name}`}
                        fallback={<Sparkles size={18} />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-bold ${isDeleted ? "line-through text-neutral-500" : ""}`}>
                        {row.name}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Cập nhật lúc {formatDateTime(row.updatedAt)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{row.creatorName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        row={row}
                        canManage={canManage}
                        onPublish={onPublish}
                        onUnlist={onUnlist}
                        onEdit={onEdit}
                        onArchive={onArchive}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && (
        <StoreTableFooter
          filteredCount={filtered.length}
          totalCount={rows.length}
          unitLabel="nhân vật"
        />
      )}
    </>
  );
}

interface RowActionsProps {
  row: StoreCharacterRow;
  canManage: boolean;
  onPublish: CharacterListingTableProps["onPublish"];
  onUnlist: CharacterListingTableProps["onUnlist"];
  onEdit?: CharacterListingTableProps["onEdit"];
  onArchive?: CharacterListingTableProps["onArchive"];
  onDelete?: CharacterListingTableProps["onDelete"];
}

/** Thao tác tùy thuộc theo trạng thái của nhân vật. BR-14: vô hiệu nếu tài khoản không phải Quản lý. */
function RowActions({
  row,
  canManage,
  onPublish,
  onEdit,
  onArchive,
  onDelete,
}: RowActionsProps) {
  if (row.status === "DELETED") {
    return null;
  }

  const title = canManage ? undefined : STORE_FORBIDDEN_HINT;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {onEdit && (
        <StoreActionButton
          variant="secondary"
          disabled={!canManage}
          title={title}
          onClick={() => onEdit(row)}
          icon={<Edit size={13} />}
        >
          Sửa
        </StoreActionButton>
      )}

      {row.status === "UNPUBLISHED" && (
        <>
          <StoreActionButton
            variant="primary"
            disabled={!canManage}
            title={title}
            onClick={() => onPublish(row, "review")}
            icon={<CheckCircle2 size={13} />}
          >
            Duyệt mở bán
          </StoreActionButton>
          {onArchive && (
            <StoreActionButton
              variant="secondary"
              disabled={!canManage}
              title={title}
              onClick={() => onArchive(row)}
              icon={<Archive size={13} />}
            >
              Ngừng bán
            </StoreActionButton>
          )}
        </>
      )}

      {row.status === "PUBLISHED" && onArchive && (
        <StoreActionButton
          variant="secondary"
          disabled={!canManage}
          title={title}
          onClick={() => onArchive(row)}
          icon={<Archive size={13} />}
        >
          Ngừng bán
        </StoreActionButton>
      )}

      {row.status === "ARCHIVED" && (
        <StoreActionButton
          variant="primary"
          disabled={!canManage}
          title={title}
          onClick={() => onPublish(row, "republish")}
          icon={<Undo2 size={13} />}
        >
          Mở bán lại
        </StoreActionButton>
      )}

      {onDelete && (
        <StoreActionButton
          variant="danger"
          disabled={!canManage}
          title={title}
          onClick={() => onDelete(row)}
          icon={<Trash2 size={13} />}
        >
          Xóa
        </StoreActionButton>
      )}
    </div>
  );
}
