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
  StoreEmptyRow,
  StoreErrorRow,
  StoreHoverActionButton,
  StoreSkeletonRows,
  StoreTablePagination,
  StoreThumbnail,
  storeRowClass,
  useStoreTablePagination,
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

const HEADINGS: { label: string; className?: string }[] = [
  { label: "Mã sản phẩm", className: "w-[108px]" },
  { label: "Ảnh đại diện", className: "w-[88px]" },
  { label: "Tên nhân vật" },
  { label: "Nhà thiết kế", className: "w-[170px]" },
  { label: "Trạng thái", className: "w-[136px]" },
  { label: "Thao tác", className: "w-[276px] text-right" },
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
  const {
    page,
    setPage,
    pageSize,
    ready,
    totalPages,
    totalElements,
    pagedItems,
  } = useStoreTablePagination(filtered, `${effectiveQuery}::${effectiveStatus}`);

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
        <div className="grid shrink-0 gap-3 border-b-2 border-black bg-white p-4 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              aria-hidden="true"
            />
            <span className="sr-only">Tìm kiếm nhân vật theo tên</span>
            <input
              type="search"
              id="character-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm nhân vật theo tên…"
              aria-label="Tìm kiếm nhân vật theo tên"
              className="w-full border-2 border-black bg-gray-50 py-2 pl-9 pr-3 text-xs font-bold text-black placeholder:font-medium placeholder:text-text-muted focus:bg-white"
            />
          </div>
          <label className="flex items-center">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              id="character-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="w-full border-2 border-black bg-gray-50 px-3 py-2 text-xs font-black uppercase text-black focus:bg-white"
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
            className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3! py-2! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
          >
            <RotateCcw size={14} aria-hidden="true" /> Đặt lại
          </button>
          {canManage && onCreateCharacter && (
            <button
              type="button"
              onClick={onCreateCharacter}
              className="btn-primary inline-flex items-center justify-center gap-1.5 px-3! py-2! text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
            >
              <Sparkles size={14} aria-hidden="true" /> Mở bán nhân vật
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className={STORE_TABLE_CLASS}>
          <caption className="sr-only">
            Danh sách nhân vật chờ duyệt hoặc đang niêm yết trên cửa hàng
          </caption>
          <thead className={STORE_THEAD_CLASS}>
            <tr>
              {HEADINGS.map((heading) => (
                <th
                  key={heading.label}
                  scope="col"
                  className={`${STORE_TH_CLASS} ${heading.className ?? ""}`}
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(isLoading || !ready) && (
              <StoreSkeletonRows columns={HEADINGS.length} rows={pageSize} />
            )}

            {!isLoading && ready && error && (
              <StoreErrorRow colSpan={HEADINGS.length} message={error} onRetry={onRetry} />
            )}

            {!isLoading && ready && !error && filtered.length === 0 && (
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
                      className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
                    >
                      <Sparkles size={14} aria-hidden="true" /> Mở bán nhân vật từ nhà thiết kế
                    </button>
                  ) : undefined
                }
              />
            )}

            {!isLoading &&
              ready &&
              !error &&
              pagedItems.map((row) => {
                const isDeleted = row.status === "DELETED";
                return (
                  <tr key={row.characterId} className={storeRowClass(isDeleted)}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-black tabular-nums">
                        #{row.characterId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StoreThumbnail
                        src={row.thumbnailUrl}
                        alt={`Ảnh đại diện của ${row.name}`}
                        fallback={<Sparkles size={18} aria-hidden="true" />}
                        pixelated
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p
                        title={row.name}
                        className={`truncate text-xs font-black uppercase sm:text-sm ${isDeleted ? "line-through text-text-muted" : "text-black"}`}
                      >
                        {row.name}
                      </p>
                      <p className="truncate text-[11px] font-medium text-text-muted tabular-nums">
                        Cập nhật lúc {formatDateTime(row.updatedAt)}
                      </p>
                    </td>
                    <td className="truncate whitespace-nowrap px-4 py-2.5 text-xs font-bold text-black">{row.creatorName}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
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

      {!error && (
        <StoreTablePagination
          page={page}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          totalUnfilteredCount={rows.length}
          unitLabel="nhân vật"
          onPageChange={setPage}
          disabled={isLoading || !ready}
          ariaLabel="Phân trang danh sách nhân vật"
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
    <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
      {onEdit && (
        <StoreHoverActionButton
          tone="primary"
          label="Sửa"
          aria-label={`Sửa ${row.name}`}
          disabled={!canManage}
          title={title ?? "Sửa"}
          onClick={() => onEdit(row)}
          icon={<Edit className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        />
      )}

      {row.status === "UNPUBLISHED" && (
        <>
          <StoreHoverActionButton
            tone="approve"
            labelSize="medium"
            label="Duyệt mở bán"
            aria-label={`Duyệt mở bán ${row.name}`}
            disabled={!canManage}
            title={title ?? "Duyệt mở bán"}
            onClick={() => onPublish(row, "review")}
            icon={<CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          />
          {onArchive && (
            <StoreHoverActionButton
              tone="neutral"
              labelSize="medium"
              label="Ngừng bán"
              aria-label={`Ngừng bán ${row.name}`}
              disabled={!canManage}
              title={title ?? "Ngừng bán"}
              onClick={() => onArchive(row)}
              icon={<Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            />
          )}
        </>
      )}

      {row.status === "PUBLISHED" && onArchive && (
        <StoreHoverActionButton
          tone="neutral"
          labelSize="medium"
          label="Ngừng bán"
          aria-label={`Ngừng bán ${row.name}`}
          disabled={!canManage}
          title={title ?? "Ngừng bán"}
          onClick={() => onArchive(row)}
          icon={<Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        />
      )}

      {row.status === "ARCHIVED" && (
        <StoreHoverActionButton
          tone="approve"
          labelSize="medium"
          label="Mở bán lại"
          aria-label={`Mở bán lại ${row.name}`}
          disabled={!canManage}
          title={title ?? "Mở bán lại"}
          onClick={() => onPublish(row, "republish")}
          icon={<Undo2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        />
      )}

      {onDelete && (
        <StoreHoverActionButton
          tone="danger"
          label="Xóa"
          aria-label={`Xóa ${row.name}`}
          disabled={!canManage}
          title={title ?? "Xóa"}
          onClick={() => onDelete(row)}
          icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        />
      )}
    </div>
  );
}
