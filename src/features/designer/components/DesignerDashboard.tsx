"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePlus2,
  Grid,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
  type MatrixSize,
} from "@/features/designer/context/DesignerCharactersContext";
import { useDashboardRowLimit } from "@/features/designer/hooks/useResponsiveGrid";
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import { getStudioDraftMeta } from "@/features/designer/studio-draft";
import {
  getCommissionQueue,
  type CommissionQueueItem,
} from "@/features/commission/services/management-commission.api";
import { isRequestCancelled } from "@/features/commission/errors";
import { COMMISSION_STATUS_LABELS } from "@/features/commission-chat/commission-status";

const TODO_STATUSES = [
  "IN_PROGRESS",
  "INTERNAL_REVISION_REQUIRED",
  "AWAITING_ESTIMATE",
] as const;

type FileFilterTab = "RECENT" | "DRAFT" | "STORE" | "COMMISSION";

const NEW_TEMPLATES: Array<{
  key: string;
  title: string;
  subtitle: string;
  size: MatrixSize;
  ratioClass: string;
  isCustom?: boolean;
}> = [
  {
    key: "custom",
    title: "Tạo tùy chỉnh",
    subtitle: "Chọn tên, mô tả & cỡ",
    size: "32x32",
    ratioClass: "h-10 w-10",
    isCustom: true,
  },
  {
    key: "32x32",
    title: "Khổ 32 × 32",
    subtitle: "Vuông tiêu chuẩn",
    size: "32x32",
    ratioClass: "h-11 w-11",
  },
  {
    key: "64x64",
    title: "Khổ 64 × 64",
    subtitle: "Vuông chi tiết cao",
    size: "64x64",
    ratioClass: "h-12 w-12",
  },
  {
    key: "64x32",
    title: "Khổ 64 × 32",
    subtitle: "LED màn hình rộng",
    size: "64x32",
    ratioClass: "h-10 w-20",
  },
];

function formatModifiedLabel(iso?: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useAssignedTodoPage(page: number, rowLimit: number, ready: boolean) {
  const [items, setItems] = useState<CommissionQueueItem[]>();
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const cancelers: Array<() => void> = [];
    const windowSize = Math.min(100, (page + 1) * rowLimit);
    setLoading(true);

    const reqs = TODO_STATUSES.map((status) =>
      getCommissionQueue({
        page: 0,
        size: windowSize,
        assigned: true,
        status,
      }),
    );
    for (const req of reqs) {
      cancelers.push(() => req.cancel());
    }

    Promise.all(reqs)
      .then((responses) => {
        if (!active) return;
        let sum = 0;
        const merged: CommissionQueueItem[] = [];
        for (const res of responses) {
          sum += res.meta?.totalElements ?? res.data.length;
          merged.push(...res.data);
        }
        merged.sort((a, b) => {
          const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
          const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
          return tb - ta || b.commissionId - a.commissionId;
        });
        const pages = Math.max(1, Math.ceil(sum / rowLimit));
        const safePage = Math.min(page, pages - 1);
        setItems(merged.slice(safePage * rowLimit, (safePage + 1) * rowLimit));
        setTotalElements(sum);
        setTotalPages(pages);
        setError("");
        setLoading(false);
      })
      .catch((failure) => {
        if (active && !isRequestCancelled(failure)) {
          setError(getApiErrorMessage(failure, "Không tải được commission được phân công."));
          setLoading(false);
        }
      });

    return () => {
      active = false;
      for (const cancel of cancelers) cancel();
    };
  }, [page, rowLimit, ready]);

  return { items, totalElements, totalPages, loading, error };
}

function DashboardContent({ rowLimit, ready }: { rowLimit: number; ready: boolean }) {
  const router = useRouter();
  const {
    characters,
    meta,
    page,
    setPage,
    setQuery,
    setCharacterTypeFilter,
    loading,
    error,
    getMatrixSize,
  } = useDesignerCharacters();

  const [todoPage, setTodoPage] = useState(0);
  const {
    items: todoItems,
    totalElements: todoTotal,
    totalPages: todoTotalPages,
    loading: todoLoading,
    error: commissionError,
  } = useAssignedTodoPage(todoPage, rowLimit, ready);

  const [createPresetSize, setCreatePresetSize] = useState<MatrixSize | null>(null);
  const [fileTab, setFileTab] = useState<FileFilterTab>("RECENT");
  const [fileSearch, setFileSearch] = useState("");
  const lastQueryRef = useRef("");

  // Clamp todoPage if viewport grows
  useEffect(() => {
    if (todoPage > 0 && todoPage >= todoTotalPages) {
      setTodoPage(Math.max(0, todoTotalPages - 1));
    }
  }, [todoPage, todoTotalPages]);

  // Debounce search query directly to backend pagination without extra mount fetch
  useEffect(() => {
    const trimmed = fileSearch.trim();
    if (trimmed === lastQueryRef.current) return;
    const timer = window.setTimeout(() => {
      lastQueryRef.current = trimmed;
      setPage(0);
      setQuery(trimmed);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fileSearch, setPage, setQuery]);

  // Local artwork & draft timestamps read after mount to keep SSR and client markup identical.
  const [artwork, setArtwork] = useState<Record<number, string | null>>({});
  const [draftMetaMap, setDraftMetaMap] = useState<
    Record<number, { hasDraft: boolean; updatedAt: string | null }>
  >({});

  useEffect(() => {
    setArtwork(
      Object.fromEntries(characters.map((item) => [item.characterId, getCharacterArtwork(item)])),
    );
    setDraftMetaMap(
      Object.fromEntries(characters.map((item) => [item.characterId, getStudioDraftMeta(item.characterId)])),
    );
  }, [characters]);

  const visibleFiles = useMemo(() => {
    const enriched = characters.map((char) => {
      const draftInfo = draftMetaMap[char.characterId] ?? { hasDraft: false, updatedAt: null };
      const commissionId = char.commissionId ?? linkedCommissionId(char.description);
      const isCommissionChar =
        (char.characterType ?? "STORE") === "COMMISSION" || commissionId !== undefined;
      const modifiedIso = draftInfo.updatedAt || char.createdAt;
      const modifiedMs = modifiedIso ? new Date(modifiedIso).getTime() || 0 : 0;

      return {
        char,
        hasDraft: draftInfo.hasDraft,
        modifiedIso,
        modifiedMs,
        commissionId,
        isCommissionChar,
      };
    });

    const filtered = fileTab === "DRAFT" ? enriched.filter((entry) => entry.hasDraft) : enriched;
    return filtered.sort((a, b) => {
      if (a.hasDraft !== b.hasDraft) return a.hasDraft ? -1 : 1;
      return b.modifiedMs - a.modifiedMs;
    });
  }, [characters, draftMetaMap, fileTab]);

  const draftCount = useMemo(
    () => characters.filter((c) => draftMetaMap[c.characterId]?.hasDraft).length,
    [characters, draftMetaMap],
  );

  const handleTabChange = (nextTab: FileFilterTab) => {
    setFileTab(nextTab);
    setPage(0);
    if (nextTab === "STORE") setCharacterTypeFilter("STORE");
    else if (nextTab === "COMMISSION") setCharacterTypeFilter("COMMISSION");
    else setCharacterTypeFilter("ALL");
  };

  const recentTotalPages = Math.max(1, meta.totalPages);
  const recentPage = Math.min(page, recentTotalPages - 1);
  const recentRangeStart = meta.totalElements === 0 ? 0 : recentPage * rowLimit + 1;
  const recentRangeEnd =
    meta.totalElements === 0 || characters.length === 0
      ? 0
      : Math.min(meta.totalElements, recentRangeStart + characters.length - 1);

  const safeTodoTotalPages = Math.max(1, todoTotalPages);
  const safeTodoPage = Math.min(todoPage, safeTodoTotalPages - 1);
  const todoRangeStart = todoTotal === 0 ? 0 : safeTodoPage * rowLimit + 1;
  const todoRangeEnd =
    todoTotal === 0 || !todoItems?.length
      ? 0
      : Math.min(todoTotal, todoRangeStart + todoItems.length - 1);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-112px)] w-full max-w-7xl flex-col gap-3.5 xl:h-[calc(100dvh-112px)]">
      {/* 1. Compact Word-style "New" Quick Create Strip */}
      <section aria-label="Khởi tạo file pixel art nhanh" className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xs font-black uppercase tracking-wider text-black">
            Tạo mới (Quick Start)
          </h1>
          <Link
            href="/designer/characters"
            className="inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5 hover:bg-primary"
          >
            Tất cả nhân vật <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {NEW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setCreatePresetSize(tpl.size)}
              className="neo-box group flex cursor-pointer items-center gap-3 bg-white p-2.5 text-left transition hover:-translate-y-0.5"
            >
              <div
                className="flex h-14 w-24 shrink-0 items-center justify-center border-2 border-black bg-[#090d14]"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(137, 200, 155, 0.16) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }}
              >
                {tpl.isCustom ? (
                  <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] transition-transform group-hover:scale-105">
                    <Plus size={20} strokeWidth={2.75} />
                  </span>
                ) : (
                  <div
                    className={`${tpl.ratioClass} flex items-center justify-center border-2 border-primary bg-[#152030] font-mono text-[11px] font-black text-primary transition-transform group-hover:scale-105`}
                  >
                    {tpl.size}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13px] font-black uppercase text-black">
                  <FilePlus2 size={14} className="shrink-0" />
                  <span className="truncate">{tpl.title}</span>
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-text-muted">
                  {tpl.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Compact Recent Files + To-do Queue with per-viewport paging */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)]">
        <section className="neo-box-no-hover flex min-h-0 flex-col bg-white">
          {/* Toolbar: Tabs + Inline Search */}
          <div className="flex shrink-0 flex-col gap-2.5 border-b-2 border-black p-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Lọc file đề xuất" className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "RECENT" as const, label: "Đề xuất gần đây" },
                  {
                    key: "DRAFT" as const,
                    label: draftCount > 0 ? `Đang nháp (${draftCount})` : "Đang nháp",
                  },
                  { key: "STORE" as const, label: "Bán Store" },
                  { key: "COMMISSION" as const, label: "Commission" },
                ] as const
              ).map((tab) => {
                const active = fileTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleTabChange(tab.key)}
                    className={`cursor-pointer border-2 border-black px-2.5 py-1 text-[11px] uppercase transition-transform hover:-translate-y-0.5 ${
                      active
                        ? "bg-primary font-black text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-white font-bold text-black hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[180px] sm:w-56">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black"
              />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Tìm nhanh tên file..."
                aria-label="Tìm nhanh tên file nhân vật"
                className="w-full border-2 border-black bg-white py-1 pl-8 pr-2.5 text-xs font-semibold text-black placeholder:font-normal placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="m-3 flex items-center gap-2 border-2 border-black bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          {/* Table Header */}
          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-black/15 bg-[#f7fbf8] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted sm:grid-cols-[minmax(0,1fr)_140px_120px]">
            <span>Tên file nhân vật</span>
            <span className="hidden sm:block">Phân loại</span>
            <span className="text-right">Cập nhật</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {loading ? (
            <div className="divide-y divide-gray-200">
              {Array.from({ length: rowLimit }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="h-9 w-9 shrink-0 animate-pulse border border-black bg-gray-200" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-40 animate-pulse bg-gray-200" />
                    <div className="h-2.5 w-24 animate-pulse bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-8 text-center">
              <Palette size={24} className="text-black/40" />
              <p className="text-xs font-black uppercase text-black">
                Chưa có file phù hợp trong mục này
              </p>
              <p className="text-[11px] font-medium text-text-muted">
                Chọn một mẫu ở trên để tạo nhân vật mới và bắt đầu vẽ trên Studio.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {visibleFiles.map(
                ({
                  char,
                  hasDraft,
                  modifiedIso,
                  commissionId,
                  isCommissionChar,
                }) => {
                  const thumb = artwork[char.characterId];
                  const matrixSize = getMatrixSize(char.characterId);
                  const cleanDesc = stripCommissionMarker(char.description);

                  return (
                    <li key={char.characterId}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/designer/studio/${char.characterId}`)
                        }
                        className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2 text-left transition hover:bg-[#eef8f0] sm:grid-cols-[minmax(0,1fr)_140px_120px]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="h-9 w-9 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt={char.characterName}
                                className="h-full w-full object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">
                                <Grid size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-xs font-black text-black group-hover:underline">
                                {char.characterName}
                              </span>
                              <span className="border border-black bg-gray-100 px-1 py-0.5 font-mono text-[10px] font-bold text-black">
                                {matrixSize}
                              </span>
                              {hasDraft && (
                                <span className="border border-black bg-amber-200 px-1 py-0.5 text-[9px] font-black uppercase text-black">
                                  Nháp
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-text-muted">
                              {char.currentVersion
                                ? `v${char.currentVersion.versionNumber}`
                                : "Chưa chốt v1"}
                              {cleanDesc ? ` · ${cleanDesc}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="hidden items-center gap-1 sm:flex">
                          {isCommissionChar ? (
                            <span className="border border-black bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                              {commissionId !== undefined
                                ? `Commission #${commissionId}`
                                : "Commission"}
                            </span>
                          ) : (
                            <span className="border border-black bg-sky-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                              Store
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1 text-right">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-text-muted">
                            <Clock size={10} className="hidden sm:inline" />
                            {formatModifiedLabel(modifiedIso)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          )}
          </div>

          {/* Footer Paging */}
          <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-3.5 py-2 text-[11px]">
            <span className="font-bold text-black">
              {meta.totalElements > 0
                ? `${recentRangeStart}–${recentRangeEnd} / ${meta.totalElements} · `
                : ""}
              Trang <strong className="font-mono">{meta.page + 1}</strong> / {recentTotalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={loading || !meta.hasPrevious}
                onClick={() => setPage(Math.max(0, page - 1))}
                className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
              >
                <ChevronLeft size={12} /> Trước
              </button>
              <button
                type="button"
                disabled={loading || !meta.hasNext}
                onClick={() => setPage(page + 1)}
                className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
              >
                Sau <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Commission To-do Queue (paged rowLimit items) */}
        <section className="neo-box-no-hover flex min-h-0 flex-col bg-white">
          <header className="flex shrink-0 items-center justify-between border-b-2 border-black px-3.5 py-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-black">
              Việc cần làm ({todoTotal})
            </h2>
            <Link
              href="/designer/commissions"
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-primary-ink hover:underline"
            >
              Xem bảng <ArrowRight size={12} />
            </Link>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {commissionError ? (
              <p className="m-3 flex items-center gap-2 border-2 border-black bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                <AlertCircle size={14} /> {commissionError}
              </p>
            ) : todoLoading || !todoItems ? (
              <div className="divide-y divide-gray-200">
                {Array.from({ length: rowLimit }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2">
                    <div className="h-8 w-8 shrink-0 animate-pulse border-2 border-black bg-gray-200" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-36 animate-pulse bg-gray-200" />
                      <div className="h-2.5 w-24 animate-pulse bg-gray-100" />
                    </div>
                    <div className="h-4 w-16 shrink-0 animate-pulse border border-black bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : todoItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center">
                <CheckCircle2 size={22} className="text-primary-ink" />
                <p className="text-xs font-black uppercase text-black">
                  Không có việc tồn đọng
                </p>
                <p className="text-[11px] font-medium text-text-muted">
                  Commission mới được staff phân công sẽ hiện tại đây.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {todoItems.map((item) => (
                  <li key={item.commissionId}>
                    <Link
                      href={`/designer/commissions/${item.commissionId}`}
                      className="flex items-center gap-2.5 px-3.5 py-2 transition hover:bg-[#eef8f0]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-primary font-mono text-[10px] font-black text-black">
                        #{item.commissionId}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-black">
                          {item.title}
                        </span>
                        <span className="block truncate text-[10px] font-medium text-text-muted">
                          {item.customerName ?? "Khách hàng"}
                          {item.targetMatrixDimensions
                            ? ` · ${item.targetMatrixDimensions}`
                            : ""}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 border border-black px-1.5 py-0.5 text-[9px] font-black uppercase text-black ${
                          item.status === "INTERNAL_REVISION_REQUIRED"
                            ? "bg-red-200"
                            : "bg-amber-200"
                        }`}
                      >
                        {COMMISSION_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t-2 border-black bg-[#f7fbf8] px-3.5 py-2 text-[11px]">
            <span className="font-bold text-black">
              {todoTotal > 0 ? `${todoRangeStart}–${todoRangeEnd} / ${todoTotal} · ` : ""}
              Trang <strong className="font-mono">{safeTodoPage + 1}</strong> / {safeTodoTotalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={todoLoading || safeTodoPage <= 0}
                onClick={() => setTodoPage((p) => Math.max(0, p - 1))}
                className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
              >
                <ChevronLeft size={12} /> Trước
              </button>
              <button
                type="button"
                disabled={todoLoading || safeTodoPage >= safeTodoTotalPages - 1}
                onClick={() => setTodoPage((p) => Math.min(safeTodoTotalPages - 1, p + 1))}
                className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
              >
                Sau <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {createPresetSize && (
        <CreateCharacterModal
          defaultMatrixSize={createPresetSize}
          onClose={() => setCreatePresetSize(null)}
          onCreated={(created) => {
            setCreatePresetSize(null);
            router.push(`/designer/studio/${created.characterId}`);
          }}
        />
      )}
    </div>
  );
}

export default function DesignerDashboard() {
  const { rows: rowLimit, ready } = useDashboardRowLimit();

  return (
    <DesignerCharactersProvider pageSize={rowLimit} ready={ready}>
      <DashboardContent rowLimit={rowLimit} ready={ready} />
    </DesignerCharactersProvider>
  );
}
