"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, Loader2, Search, UserCheck, X } from "lucide-react";
import StoreModal from "@/features/store-listing/components/StoreModal";
import {
  assignCommissionDesigner,
  listCommissionDesigners,
  type CommissionQueueItem,
  type DesignerOption,
} from "../services/management-commission.api";
import { commissionErrorMessage, isRequestCancelled } from "../errors";

const DESIGNER_PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 250;

export interface AssignDesignerModalProps {
  commission: Pick<
    CommissionQueueItem,
    "commissionId" | "title" | "customerName" | "targetMatrixDimensions"
  >;
  onClose: () => void;
  onAssigned: () => void;
}

function filterFallbackDesigners(pool: DesignerOption[], search: string) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return pool;
  return pool.filter(
    (item) =>
      item.fullName.toLowerCase().includes(keyword) ||
      String(item.designerId).includes(keyword.replace(/^#/, "")),
  );
}

export default function AssignDesignerModal({
  commission,
  onClose,
  onAssigned,
}: AssignDesignerModalProps) {
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerOption | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pendingSubmitRef = useRef(false);
  const loadMoreLockRef = useRef(false);
  const legacyFullPoolRef = useRef<DesignerOption[] | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search text
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Fetch first page (size = 5) whenever debounced search changes or modal mounts
  useEffect(() => {
    let active = true;
    loadMoreLockRef.current = false;
    setLoadingInitial(true);
    setLoadingMore(false);
    setError("");
    setPage(0);

    const req = listCommissionDesigners({
      search: debouncedSearch || undefined,
      page: 0,
      size: DESIGNER_PAGE_SIZE,
    });

    req
      .then((res) => {
        if (!active) return;
        const rows = res.data ?? [];
        if (res.meta) {
          legacyFullPoolRef.current = null;
          setDesigners(rows);
          setHasMore(Boolean(res.meta.hasNext));
          setTotalCount(res.meta.totalElements);
        } else {
          // Graceful client-side paging fallback if backend has not deployed PaginationMeta yet
          legacyFullPoolRef.current = rows;
          const filtered = filterFallbackDesigners(rows, debouncedSearch);
          const firstSlice = filtered.slice(0, DESIGNER_PAGE_SIZE);
          setDesigners(firstSlice);
          setHasMore(firstSlice.length < filtered.length);
          setTotalCount(filtered.length);
        }
      })
      .catch((failure) => {
        if (!active || isRequestCancelled(failure)) return;
        setDesigners([]);
        setHasMore(false);
        setTotalCount(null);
        setError(commissionErrorMessage(failure, "Không tải được danh sách họa sĩ."));
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });

    return () => {
      active = false;
      req.cancel();
    };
  }, [debouncedSearch, commission.commissionId]);

  const handleLoadMore = useCallback(() => {
    if (loadMoreLockRef.current || loadingInitial || loadingMore || !hasMore) return;
    loadMoreLockRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;

    // Legacy fallback if backend did not return PaginationMeta
    if (legacyFullPoolRef.current) {
      const filtered = filterFallbackDesigners(legacyFullPoolRef.current, debouncedSearch);
      const nextSlice = filtered.slice(0, (nextPage + 1) * DESIGNER_PAGE_SIZE);
      setDesigners(nextSlice);
      setPage(nextPage);
      setHasMore(nextSlice.length < filtered.length);
      setTotalCount(filtered.length);
      setLoadingMore(false);
      loadMoreLockRef.current = false;
      return;
    }

    const req = listCommissionDesigners({
      search: debouncedSearch || undefined,
      page: nextPage,
      size: DESIGNER_PAGE_SIZE,
    });

    req
      .then((res) => {
        const incoming = res.data ?? [];
        setDesigners((prev) => {
          const seen = new Set(prev.map((item) => item.designerId));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.designerId)) {
              seen.add(item.designerId);
              merged.push(item);
            }
          }
          return merged;
        });
        setPage(nextPage);
        if (res.meta) {
          setHasMore(Boolean(res.meta.hasNext));
          setTotalCount(res.meta.totalElements);
        } else {
          setHasMore(false);
        }
      })
      .catch((failure) => {
        if (isRequestCancelled(failure)) return;
        setError(commissionErrorMessage(failure, "Không tải thêm được danh sách họa sĩ."));
        setHasMore(false);
      })
      .finally(() => {
        setLoadingMore(false);
        loadMoreLockRef.current = false;
      });
  }, [debouncedSearch, hasMore, loadingInitial, loadingMore, page]);

  // IntersectionObserver auto-load at bottom of dropdown scroll container
  useEffect(() => {
    if (!dropdownOpen || !hasMore || loadingInitial) return;
    const root = listContainerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMore();
        }
      },
      { root, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dropdownOpen, hasMore, loadingInitial, handleLoadMore]);

  function handleListScroll() {
    const el = listContainerRef.current;
    if (!el || !hasMore || loadingInitial || loadingMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 24) {
      handleLoadMore();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pendingSubmitRef.current || !selectedDesigner) return;
    pendingSubmitRef.current = true;
    setBusy(true);
    setError("");
    try {
      await assignCommissionDesigner(commission.commissionId, selectedDesigner.designerId);
      onAssigned();
      onClose();
    } catch (failure) {
      setError(commissionErrorMessage(failure, "Không phân công được họa sĩ."));
    } finally {
      pendingSubmitRef.current = false;
      setBusy(false);
    }
  }

  return (
    <StoreModal
      title="Phân công họa sĩ"
      description={commission.title}
      badge={`#${commission.commissionId}`}
      icon={<UserCheck className="h-5 w-5 text-black" />}
      size="md"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="assign-designer-form"
            disabled={busy || !selectedDesigner}
            className="btn-primary px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Đang phân công…" : "Xác nhận phân công"}
          </button>
        </>
      }
    >
      <form id="assign-designer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-black bg-[#f7fbf8] p-3 text-xs">
          <p className="font-bold text-black">
            Khách hàng:{" "}
            <span className="font-semibold text-black/80">{commission.customerName || "Khách hàng"}</span>
          </p>
          {commission.targetMatrixDimensions && (
            <p className="mt-1 font-bold text-black">
              Kích thước LED:{" "}
              <span className="font-mono font-bold text-primary-ink">
                {commission.targetMatrixDimensions}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-black">
              Chọn họa sĩ phụ trách{totalCount !== null ? ` (${totalCount})` : ""}
            </span>
          </div>

          {/* Searchable Infinite-Scroll Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={busy}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex min-h-11 w-full items-center justify-between gap-2 border-2 border-black bg-white px-3 py-2 text-left text-sm font-bold text-black shadow-[2px_2px_0_0_#000] transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              {selectedDesigner ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-bold text-black">{selectedDesigner.fullName}</span>
                  <span className="shrink-0 border border-black bg-primary px-1.5 py-0.5 font-mono text-[11px] font-black text-black">
                    #{selectedDesigner.designerId}
                  </span>
                </span>
              ) : (
                <span className="text-black/55">Chọn họa sĩ phụ trách…</span>
              )}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-black transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="mt-1 border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
                {/* Search bar */}
                <div className="flex items-center gap-2 border-b-2 border-black bg-[#f7fbf8] px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-black/65" />
                  <input
                    type="text"
                    disabled={busy}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Tìm tên hoặc #ID họa sĩ…"
                    aria-label="Tìm kiếm họa sĩ"
                    className="w-full bg-transparent text-xs font-semibold text-black placeholder:text-black/45 focus:outline-none"
                  />
                  {(loadingInitial || loadingMore) && (
                    <Loader2
                      aria-label="Đang tải"
                      className="h-4 w-4 shrink-0 animate-spin text-primary-ink"
                    />
                  )}
                  {searchInput && !loadingInitial && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa tìm kiếm"
                      onClick={() => setSearchInput("")}
                      className="border border-black bg-white p-0.5 text-black hover:bg-neutral-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Scrollable list: 44px*4 = 176px max height so 5 items scroll naturally to load more */}
                <div
                  ref={listContainerRef}
                  role="listbox"
                  aria-label="Danh sách họa sĩ khả dụng"
                  onScroll={handleListScroll}
                  className="max-h-44 overflow-y-auto divide-y divide-black/15"
                >
                  {loadingInitial ? (
                    <div
                      role="status"
                      className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-black/70"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary-ink" />
                      <span>Đang tải danh sách họa sĩ…</span>
                    </div>
                  ) : designers.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs font-semibold text-black/60">
                      {debouncedSearch
                        ? `Không tìm thấy họa sĩ khớp "${debouncedSearch}".`
                        : "Hiện chưa có họa sĩ khả dụng."}
                    </p>
                  ) : (
                    <>
                      {designers.map((designer) => {
                        const isSelected = selectedDesigner?.designerId === designer.designerId;
                        return (
                          <button
                            key={designer.designerId}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={busy}
                            onClick={() => {
                              setSelectedDesigner(designer);
                              setDropdownOpen(false);
                            }}
                            className={
                              isSelected
                                ? "flex h-11 w-full items-center justify-between gap-2 bg-primary/25 px-3 text-left text-xs font-black text-black"
                                : "flex h-11 w-full items-center justify-between gap-2 bg-white px-3 text-left text-xs font-bold text-black hover:bg-neutral-100"
                            }
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center border border-black ${
                                  isSelected ? "bg-primary" : "bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-black" />}
                              </span>
                              <span className="truncate">{designer.fullName}</span>
                            </span>
                            <span className="shrink-0 border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
                              #{designer.designerId}
                            </span>
                          </button>
                        );
                      })}

                      {/* Bottom auto-load sentinel & spinner */}
                      {hasMore && (
                        <div
                          ref={sentinelRef}
                          className="flex items-center justify-center gap-2 bg-[#f7fbf8] py-2.5 text-[11px] font-bold text-black/70"
                        >
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-ink" />
                          <span>
                            {loadingMore ? "Đang tải thêm họa sĩ…" : "Cuộn xuống để tải thêm…"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Dropdown status bar */}
                <div className="flex items-center justify-between border-t-2 border-black bg-[#f7fbf8] px-3 py-1.5 text-[11px] font-semibold text-black/65">
                  <span>
                    Hiển thị {designers.length}
                    {totalCount !== null ? ` / ${totalCount}` : ""} họa sĩ
                  </span>
                  <span>{hasMore ? "Tự động tải thêm 5 mục" : "Đã hết danh sách"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </StoreModal>
  );
}
