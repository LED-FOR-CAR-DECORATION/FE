"use client";

import { fetchCommissionCharactersCached, fetchCharacterVersionsCached } from "@/features/designer/designer-characters-cache";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Grid, History, Layers, Loader2,
  Palette, RefreshCw, Send, Sparkles,
} from "lucide-react";
import "@/styles/transitions.css";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  formatDesignerApiError,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { sortVersionsNewestFirst } from "@/features/designer/context/DesignerCharactersContext";
import { useAdaptiveGridLayout } from "@/features/designer/hooks/useResponsiveGrid";
import {
  createCommissionCharacter, findCommissionCharacter, linkedCommissionId, studioMatrixSize,
} from "@/features/designer/commission-link";
import { commissionErrorMessage, isRequestCancelled } from "../errors";
import { resolveImageMimeAndExtension, uploadMediaFile } from "@/lib/api/media";
import CommissionRevisionTimeline from "./CommissionRevisionTimeline";
import {
  getCommissionQueue, getManagementCommission, uploadCommissionDraft,
  type CommissionManagementDetail, type CommissionQueueItem, type CommissionSubmissionItem,
} from "../services/management-commission.api";
import { scheduleVisiblePoll } from "@/lib/polling";

// ---------------------------------------------------------------------------
// Trạng thái
// ---------------------------------------------------------------------------

const DETAIL_POLL_MS = 30_000;
const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "EXPIRED", "REJECTED"]);

/** Trạng thái designer được nộp bản nháp (UploadCommissionDraftUseCase, CMS-15). */
export const DESIGNER_DRAFTABLE = new Set(["IN_PROGRESS", "INTERNAL_REVISION_REQUIRED"]);

const STATUS_META: Record<string, { label: string; hint: string; tone: "todo" | "wait" | "done" | "muted" }> = {
  IN_PROGRESS: { label: "Cần thiết kế", hint: "Tạo character, lưu version trong Studio rồi chọn version để nộp staff duyệt.", tone: "todo" },
  INTERNAL_REVISION_REQUIRED: { label: "Staff yêu cầu sửa", hint: "Sửa theo ghi chú của staff, lưu version mới rồi nộp lại.", tone: "todo" },
  INTERNAL_REVIEW: { label: "Chờ staff duyệt", hint: "Bạn đã nộp một version, staff đang duyệt.", tone: "wait" },
  PREVIEW_DELIVERED: { label: "Khách đang xem", hint: "Staff đã gửi bản xem trước cho khách.", tone: "wait" },
  AWAITING_ESTIMATE: { label: "Cần dự kiến thời gian", hint: "Khách đã xác nhận yêu cầu sửa. Nhập thời gian trước khi nộp bản sửa.", tone: "todo" },
  AWAITING_EXTRA_PAYMENT: { label: "Chờ khách trả phí", hint: "Khách đang thanh toán phí chỉnh sửa bổ sung.", tone: "wait" },
  COMPLETED: { label: "Hoàn thành", hint: "Commission đã hoàn thành.", tone: "done" },
  CANCELLED: { label: "Đã hủy", hint: "Commission đã bị hủy.", tone: "muted" },
};
const statusMeta = (status: string) => STATUS_META[status] ?? { label: status, hint: "", tone: "muted" as const };

const TONE_CHIP: Record<string, string> = {
  todo: "border border-black bg-amber-200 text-black",
  wait: "border border-black bg-sky-200 text-black",
  done: "border border-black bg-primary text-black",
  muted: "border border-black bg-gray-100 text-black",
};

const SUBMISSION_LABELS: Record<string, string> = {
  PENDING_STAFF_REVIEW: "Chờ staff duyệt",
  STAFF_REJECTED: "Staff yêu cầu sửa",
  STAFF_APPROVED: "Đã gửi khách",
  CUSTOMER_ACCEPTED: "Khách chấp nhận",
};

const isHttpUrl = (value?: string | null): value is string => Boolean(value && /^https?:\/\//i.test(value));
const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

// Neo-Brutalist style (synced with Customer / Manager)
const shell = "neo-box-no-hover bg-white";
const primaryBtn = "btn-primary inline-flex min-h-11 items-center justify-center gap-2 text-xs font-black uppercase";
const secondaryBtn = "btn-secondary inline-flex min-h-11 items-center justify-center gap-2 text-xs font-black uppercase";

function StatusChip({ status }: { status: string }) {
  const meta = statusMeta(status);
  return <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase ${TONE_CHIP[meta.tone]}`}>{meta.label}</span>;
}

function SkeletonGrid({ count = 8, rows = 2, columns = 4 }: { count?: number; rows?: number; columns?: number }) {
  return (
    <div
      className="t-skel-skeleton is-pulsing grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={{
        "--pulse-count": "infinite",
        ...(columns >= 2 ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : {}),
      } as CSSProperties}
      aria-busy="true"
    >
      <span className="sr-only" role="status">Đang tải…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${shell} flex h-full flex-col overflow-hidden`} aria-hidden="true">
          <div className="min-h-[112px] flex-1 border-b-2 border-black bg-gray-200" />
          <div className="shrink-0 space-y-2 p-2.5"><div className="h-3.5 w-3/4 bg-gray-200" /><div className="h-3 w-1/2 bg-gray-100" /></div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="neo-box-no-hover flex flex-wrap items-center gap-3 border-l-8 border-l-red-600 bg-red-50 p-4 text-sm font-bold text-red-700">
      <AlertTriangle size={16} className="shrink-0" /> <span className="flex-1">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="btn-secondary min-h-11 text-xs font-black uppercase">Thử lại</button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// /designer/commissions — bảng commission được phân công
// ---------------------------------------------------------------------------

const TABS: { key: string; label: string; statuses?: string[] }[] = [
  { key: "todo", label: "Cần làm", statuses: ["IN_PROGRESS", "INTERNAL_REVISION_REQUIRED", "AWAITING_ESTIMATE"] },
  { key: "review", label: "Chờ staff duyệt", statuses: ["INTERNAL_REVIEW"] },
  { key: "customer", label: "Phía khách", statuses: ["PREVIEW_DELIVERED", "AWAITING_EXTRA_PAYMENT"] },
  { key: "done", label: "Đã xong", statuses: ["COMPLETED", "CANCELLED"] },
  { key: "all", label: "Tất cả" },
];

export function DesignerCommissionBoard() {
  const { columns, rows, pageSize, ready } = useAdaptiveGridLayout({
    estimatedRowHeight: 224,
    chromeHeight: 268,
    maxRows: 3,
  });
  const [items, setItems] = useState<CommissionQueueItem[]>();
  const [characters, setCharacters] = useState<Map<number, DesignerCharacterItem>>(new Map());
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("todo");
  const [revision, setRevision] = useState(0);

  const currentTab = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const cancelers: Array<() => void> = [];
    setLoading(true);
    setError("");

    const statuses = currentTab.statuses;

    if (!statuses || statuses.length === 1) {
      const req = getCommissionQueue({
        page,
        size: pageSize,
        assigned: true,
        status: statuses?.[0],
      });
      cancelers.push(() => req.cancel());
      req
        .then(({ data, meta }) => {
          if (!active) return;
          const total = meta?.totalElements ?? data.length;
          const pages = Math.max(1, meta?.totalPages ?? Math.ceil(total / pageSize));
          if (page > 0 && page >= pages) {
            setPage(Math.max(0, pages - 1));
            return;
          }
          setItems(data);
          setTotalElements(total);
          setTotalPages(pages);
        })
        .catch((failure) => {
          if (active && !isRequestCancelled(failure)) {
            setError(getApiErrorMessage(failure, "Không tải được commission được phân công."));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      // Multi-status tab: fetch only up to the needed slice for the current page per status
      const neededWindow = Math.min(100, (page + 1) * pageSize);
      const reqs = statuses.map((status) =>
        getCommissionQueue({
          page: 0,
          size: neededWindow,
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
          let sumElements = 0;
          const merged: CommissionQueueItem[] = [];
          for (const res of responses) {
            sumElements += res.meta?.totalElements ?? res.data.length;
            merged.push(...res.data);
          }
          merged.sort((a, b) => {
            const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
            const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
            return tb - ta || b.commissionId - a.commissionId;
          });
          const pages = Math.max(1, Math.ceil(sumElements / pageSize));
          if (page > 0 && page >= pages) {
            setPage(Math.max(0, pages - 1));
            return;
          }
          setItems(merged.slice(page * pageSize, (page + 1) * pageSize));
          setTotalElements(sumElements);
          setTotalPages(pages);
        })
        .catch((failure) => {
          if (active && !isRequestCancelled(failure)) {
            setError(getApiErrorMessage(failure, "Không tải được commission được phân công."));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      for (const cancel of cancelers) cancel();
    };
  }, [ready, page, pageSize, tab, currentTab.statuses, revision]);

  // Ảnh version hiện hành chỉ cho các thẻ commission đang hiển thị trên trang hiện tại
  useEffect(() => {
    if (!items || items.length === 0) {
      setCharacters(new Map());
      return;
    }
    let active = true;
    // Một request (danh sách COMMISSION đã cache) thay vì một request cho mỗi thẻ commission đang hiển thị.
    fetchCommissionCharactersCached()
      .catch(() => [] as DesignerCharacterItem[])
      .then((list) => {
        if (!active) return;
        const map = new Map<number, DesignerCharacterItem>();
        for (const entry of items) {
          const char = list.find((item) =>
            (item.commissionId ?? linkedCommissionId(item.description)) === entry.commissionId);
          if (char) map.set(entry.commissionId, char);
        }
        setCharacters(map);
      });
    return () => {
      active = false;
    };
  }, [items]);

  const visible = items ?? [];
  const safePage = Math.min(page, totalPages - 1);
  const rangeStart = totalElements === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd =
    totalElements === 0 ? 0 : Math.min(totalElements, rangeStart + Math.max(visible.length, 1) - 1);

  const handleTabChange = (nextTab: string) => {
    setItems(undefined);
    setTab(nextTab);
    setPage(0);
  };

  const refresh = () => {
    setItems(undefined);
    setPage(0);
    setRevision((value) => value + 1);
  };

  return (
    <div className="flex min-h-[calc(100dvh-112px)] flex-col gap-3">
      {/* Slim Neo-Brutalist Header & Status Filter Bar */}
      <div className="neo-box-no-hover flex flex-col gap-2.5 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Lọc commission" className="flex flex-wrap gap-1.5">
          {TABS.map((entry) => {
            const active = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabChange(entry.key)}
                className={`min-h-9 cursor-pointer border-2 border-black px-3 text-xs uppercase transition-transform hover:-translate-y-0.5 ${
                  active
                    ? "bg-primary font-black text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-white font-bold text-black hover:bg-gray-50"
                }`}
              >
                {entry.label}
                {active && !loading && (
                  <span className="ml-1.5 border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] text-black">
                    {totalElements}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button type="button" onClick={refresh} className={`${secondaryBtn} min-h-9! shrink-0 px-3! py-1!`}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={refresh} />}

      {loading ? <SkeletonGrid count={pageSize} rows={rows} columns={columns} /> : visible.length === 0 ? (
        <div className="neo-box-no-hover flex flex-1 flex-col items-center justify-center bg-white p-10 text-center">
          <Sparkles size={32} className="mx-auto mb-2.5 text-black/40" />
          <h2 className="text-base font-black uppercase text-black">{tab === "todo" ? "Không có commission nào cần làm" : "Chưa có commission ở mục này"}</h2>
          <p className="mx-auto mt-1 max-w-md text-xs font-medium text-text-muted">Commission mới được staff phân công sẽ xuất hiện ở mục “Cần làm”.</p>
          {tab !== "all" && <button type="button" onClick={() => handleTabChange("all")} className={`${secondaryBtn} mt-4`}>Xem tất cả</button>}
        </div>
      ) : (
        <ul
          className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={columns >= 2 ? { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` } : undefined}
        >
          {visible.map((item) => {
            const character = characters.get(item.commissionId);
            const preview = character?.currentVersion?.previewGifUrl;
            const todo = DESIGNER_DRAFTABLE.has(item.status);
            return (
              <li key={item.commissionId} className="h-full">
                <Link href={`/designer/commissions/${item.commissionId}`}
                  className={`neo-box group flex h-full flex-col overflow-hidden bg-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${todo ? "border-l-8 border-l-amber-400" : ""}`}>
                  <div className="relative min-h-[104px] w-full flex-1 overflow-hidden border-b-2 border-black bg-[#090d14]">
                    {isHttpUrl(preview) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={`Version hiện hành của ${item.title}`} loading="lazy"
                        className="h-full w-full object-contain [image-rendering:pixelated] transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                        <Palette size={22} className="opacity-60" />
                        <span className="text-[11px] font-bold">{character ? "Character chưa có version" : "Chưa tạo character"}</span>
                      </div>
                    )}
                    {item.targetMatrixDimensions && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black text-black shadow-[2px_2px_0_0_#000]">
                        <Grid size={10} /> {item.targetMatrixDimensions}
                      </span>
                    )}
                    <span className="absolute right-2 top-2 shadow-[2px_2px_0_0_#000]"><StatusChip status={item.status} /></span>
                  </div>
                  <div className="flex shrink-0 flex-col justify-between p-2.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-1 text-xs font-black text-black group-hover:underline">{item.title}</h2>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-text-muted">#{item.commissionId}</span>
                      </div>
                      {item.customerName && <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">Khách: {item.customerName}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-gray-200 pt-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-black text-black">
                        <Layers size={12} /> {character ? `${character.totalVersions} version` : "—"}
                      </span>
                      {todo && <span className="border border-black bg-amber-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">Mở để làm →</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="neo-box-no-hover mt-auto flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2 text-xs">
        <span className="font-bold text-black">
          {totalElements > 0 && (
            <>
              <strong className="font-mono">
                {rangeStart}–{rangeEnd}
              </strong>{" "}
              / {totalElements} ·{" "}
            </>
          )}
          Trang <strong className="font-mono">{safePage + 1}</strong> / {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || safePage <= 0}
            onClick={() => setPage(Math.max(0, safePage - 1))}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <button
            type="button"
            disabled={loading || safePage >= totalPages - 1}
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase disabled:opacity-40"
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// /designer/commissions/[id] — workspace: character, version, nộp
// ---------------------------------------------------------------------------

function latestBy<T extends { versionNumber: number }>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).sort((a, b) => b.versionNumber - a.versionNumber)[0];
}

function SuccessCheck() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("data-state", "out");
    void el.offsetWidth;
    el.setAttribute("data-state", "in");
  }, []);
  return (
    <span ref={ref} className="t-success-check text-studio-link" data-state="out" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
        <circle cx="24" cy="24" r="22" fill="#e9f5ed" />
        <path d="M14 25l7 7 13-14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function DesignerCommissionOverview({ commissionId }: { commissionId: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<CommissionManagementDetail>();
  const [detailError, setDetailError] = useState("");
  const [character, setCharacter] = useState<DesignerCharacterItem | null>();
  const [commissionCharacters, setCommissionCharacters] = useState<DesignerCharacterItem[]>([]);
  const [versions, setVersions] = useState<CharacterVersionItem[]>();
  const [characterError, setCharacterError] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number>();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState<{ versionNumber: number; draftVersion: number }>();
  const [revision, setRevision] = useState(0);
  const submitLock = useRef(false);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let cancelPoll: (() => void) | undefined;
    let query: ReturnType<typeof getManagementCommission>;
    let latestStatus: string | undefined;
    function refresh() {
      query = getManagementCommission(commissionId);
      query.then(({ data }) => { latestStatus = data.status; if (active) { setDetail(data); setDetailError(""); } })
        .catch((failure) => { if (active) setDetailError(getApiErrorMessage(failure, "Không tải được commission.")); })
        .finally(() => {
          // Theo dõi duyệt/chỉnh sửa từ staff khi commission còn đang chạy; đã kết thúc thì không poll nữa.
          if (active && !TERMINAL_STATUSES.has(latestStatus ?? "")) cancelPoll = scheduleVisiblePoll(refresh, DETAIL_POLL_MS);
        });
    }
    refresh();
    return () => { active = false; cancelPoll?.(); query?.cancel(); };
  }, [commissionId, revision]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ items: commissionList }, linked] = await Promise.all([
          // Cùng một request (cache) với findCommissionCharacter — trước đây gọi 2 lần giống hệt nhau.
          fetchCommissionCharactersCached({ force: revision > 0 }).then((items) => ({ items })).catch(() => ({ items: [] as DesignerCharacterItem[] })),
          findCommissionCharacter(commissionId),
        ]);
        if (!active) return;
        const selectable = commissionList.filter((item) => {
          const itemCommId = item.commissionId ?? linkedCommissionId(item.description);
          return item.characterType === "COMMISSION" && (itemCommId === undefined || itemCommId === null || itemCommId === commissionId);
        });
        setCommissionCharacters(selectable);
        const found = linked ?? selectable.find((item) => item.commissionId === commissionId) ?? null;
        setCharacter(found);
        const list = found ? sortVersionsNewestFirst(await fetchCharacterVersionsCached(found.characterId)) : [];
        if (!active) return;
        setVersions(list);
        setCharacterError("");
      } catch (failure) {
        if (active) setCharacterError(formatDesignerApiError(failure, "Không tải được character của commission."));
      }
    })();
    return () => { active = false; };
  }, [commissionId, revision]);

  const handleSelectCommissionCharacter = async (nextCharacterId: number) => {
    const picked = commissionCharacters.find((item) => item.characterId === nextCharacterId);
    if (!picked) return;
    setCharacter(picked);
    setSelectedId(undefined);
    try {
      const list = sortVersionsNewestFirst(await fetchCharacterVersionsCached(picked.characterId));
      setVersions(list);
      setCharacterError("");
    } catch (failure) {
      setCharacterError(formatDesignerApiError(failure, "Không tải được version của character đã chọn."));
    }
  };

  if (!detail) {
    return detailError ? (
      <div className="space-y-4">
        <Link href="/designer/commissions" className={secondaryBtn}><ArrowLeft size={15} /> Commission được phân công</Link>
        <ErrorBox message={detailError} onRetry={reload} />
      </div>
    ) : (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-500" role="status">
        <Loader2 size={18} className="animate-spin text-studio-link" /> Đang tải commission…
      </div>
    );
  }

  const meta = statusMeta(detail.status);
  const draftable = DESIGNER_DRAFTABLE.has(detail.status);
  const submissions = detail.submissions ?? [];
  const rejected = detail.status === "INTERNAL_REVISION_REQUIRED" ? latestBy(submissions, (item) => item.status === "STAFF_REJECTED") : undefined;
  const submittedUrls = new Map(submissions.map((item) => [item.imageUrl, item.versionNumber]));
  const selected = versions?.find((item) => item.versionId === selectedId);
  const studioHref = character ? `/designer/studio/${character.characterId}` : undefined;
  const matrix = studioMatrixSize(detail.targetMatrixDimensions);

  const createCharacter = async () => {
    if (creating) return;
    setCreating(true);
    setCharacterError("");
    try {
      const created = await createCommissionCharacter(detail);
      router.push(`/designer/studio/${created.characterId}`);
    } catch (failure) {
      setCharacterError(formatDesignerApiError(failure, "Không tạo được character cho commission."));
      setCreating(false);
    }
  };

  const submit = async () => {
    if (!selected || submitLock.current) return;
    if (!character || character.characterType !== "COMMISSION") {
      setSubmitError("Chỉ được nộp bản vẽ từ phiên bản của nhân vật loại Commission.");
      return;
    }
    const designerNote = note.trim();
    if (designerNote.length > 2000) return setSubmitError("Ghi chú tối đa 2000 ký tự.");
    if (!isHttpUrl(selected.previewGifUrl)) return setSubmitError("Version này chưa có ảnh trên kho media. Hãy mở Studio và lưu lại version.");
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(selected.previewGifUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Không tải được ảnh phiên bản. Hãy mở Studio và lưu lại.");
      const blob = await response.blob();
      const mimeInfo = resolveImageMimeAndExtension(blob.type, selected.previewGifUrl);
      if (!mimeInfo) {
        console.error("[commission.draft] Unsupported version blob MIME type", {
          commissionId: detail.commissionId,
          versionId: selected.versionId,
          versionNumber: selected.versionNumber,
          previewGifUrl: selected.previewGifUrl,
          rawBlobType: blob.type,
          byteSize: blob.size,
        });
        throw new Error(
          `Định dạng ảnh phiên bản không hợp lệ (${blob.type || "không xác định"}). Chỉ hỗ trợ GIF, PNG, WEBP hoặc JPG.`,
        );
      }

      const draftFileName = `commission-${detail.commissionId}-v${selected.versionNumber}.${mimeInfo.ext}`;
      const file = new File([blob], draftFileName, { type: mimeInfo.mimeType });
      const uploaded = await uploadMediaFile(file, "COMMISSION_DRAFT", detail.commissionId);
      if (uploaded.localPreviewUrl) URL.revokeObjectURL(uploaded.localPreviewUrl);
      if (!uploaded.objectKey) throw new Error("Không nhận được mã bản nháp.");

      const { data } = await uploadCommissionDraft(detail.commissionId, {
        imageUrl: uploaded.objectKey,
        designerNote: designerNote || undefined,
        characterVersionId: selected.versionId,
      });
      console.info("[commission.draft] Submitted draft successfully", {
        commissionId: detail.commissionId,
        characterVersionId: selected.versionId,
        draftVersion: data.versionNumber,
        objectKey: uploaded.objectKey,
        fileName: draftFileName,
      });
      setSubmitted({ versionNumber: selected.versionNumber, draftVersion: data.versionNumber });
      setSelectedId(undefined);
      setNote("");
      reload();
    } catch (failure) {
      setSubmitError(commissionErrorMessage(failure, "Không nộp được version này."));
      reload();
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <Link href="/designer/commissions" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-black uppercase text-black hover:underline">
        <ArrowLeft size={15} /> Commission được phân công
      </Link>

      <header className={`${shell} flex flex-wrap items-start justify-between gap-4 p-5`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-black bg-primary px-2.5 py-0.5 text-[11px] font-black uppercase text-black">
              <ClipboardList size={12} /> Commission #{detail.commissionId}
            </span>
            <StatusChip status={detail.status} />
            {detail.targetMatrixDimensions && (
              <span className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black"><Grid size={11} /> {detail.targetMatrixDimensions}</span>
            )}
          </div>
          <h1 className="mt-2 break-words text-xl font-black uppercase tracking-tight text-black">{detail.title}</h1>
          <p className="mt-1 text-xs font-medium text-text-muted">{meta.hint}</p>
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {detail.assignedStaffName && <><dt className="font-bold text-text-muted">Staff</dt><dd className="font-black text-black">{detail.assignedStaffName}</dd></>}
          {formatDate(detail.slaDueAt) && <><dt className="font-bold text-text-muted">Hạn</dt><dd className="font-mono font-black text-black">{formatDate(detail.slaDueAt)}</dd></>}
          {typeof detail.maxRevisions === "number" && <><dt className="font-bold text-text-muted">Lượt sửa khách</dt><dd className="font-mono font-black text-black">{detail.revisionsUsed ?? 0}/{detail.maxRevisions}</dd></>}
        </dl>
      </header>

      {rejected?.staffReviewNote && (
        <section className="neo-box-no-hover border-l-8 border-l-amber-500 bg-amber-50 p-4 text-black">
          <p className="flex items-center gap-2 text-sm font-black uppercase"><AlertTriangle size={16} /> Staff yêu cầu sửa bản nộp #{rejected.versionNumber}{rejected.reviewerStaffName ? ` · ${rejected.reviewerStaffName}` : ""}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{rejected.staffReviewNote}</p>
        </section>
      )}

      {submitted && (
        <section role="status" className="neo-box-no-hover flex items-center gap-4 border-l-8 border-l-[#2d6a4f] bg-[#eef8f0] p-4 text-black">
          <SuccessCheck />
          <div className="text-sm">
            <p className="font-black">Đã nộp version v{submitted.versionNumber} cho staff duyệt (bản nộp #{submitted.draftVersion}).</p>
            <p className="font-medium text-text-muted">Staff sẽ gửi cho khách hoặc trả về kèm ghi chú nếu cần sửa.</p>
          </div>
        </section>
      )}

      <CommissionRevisionTimeline detail={detail} designer neo onChanged={reload} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${shell} p-5`} aria-labelledby="character-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
            <div>
              <h2 id="character-heading" className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-black"><Palette size={17} /> Character & phiên bản</h2>
              <p className="text-xs font-medium text-text-muted">Lưu bao nhiêu version tùy ý trong Studio. Chọn một version bên dưới để nộp.</p>
            </div>
            {studioHref && <Link href={studioHref} className={primaryBtn}><Palette size={15} /> Mở Studio</Link>}
          </div>

          {characterError && <div className="mt-4"><ErrorBox message={characterError} onRetry={reload} /></div>}

          {character === undefined && !characterError ? (
            <div className="mt-4"><SkeletonGrid count={3} /></div>
          ) : character === null ? (
            <div className="mt-4 border-2 border-dashed border-black bg-[#f7fbf8] p-10 text-center">
              <Sparkles size={36} className="mx-auto mb-3 text-black/40" />
              <h3 className="text-lg font-black uppercase text-black">Chưa có character cho commission này</h3>
              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-text-muted">
                Character mới mang tên commission{matrix ? ` và khóa khổ ${matrix}` : ""}, nằm trong thư viện của bạn như mọi character khác.
              </p>
              <button type="button" onClick={() => void createCharacter()} disabled={creating} className={`${primaryBtn} mt-5`}>
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {creating ? "Đang tạo…" : "Tạo character"}
              </button>
              {commissionCharacters.length > 0 && (
                <div className="mx-auto mt-4 max-w-sm border-t-2 border-black pt-4 text-left">
                  <label htmlFor="pick-commission-char" className="block text-xs font-black uppercase text-black">
                    Hoặc chọn character loại Commission sẵn có:
                  </label>
                  <select
                    id="pick-commission-char"
                    defaultValue=""
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val) void handleSelectCommissionCharacter(val);
                    }}
                    className="mt-1.5 w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
                  >
                    <option value="" disabled>-- Chọn character Commission --</option>
                    {commissionCharacters.map((c) => (
                      <option key={c.characterId} value={c.characterId}>
                        #{c.characterId} · {c.characterName} ({c.totalVersions} version)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : character && (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-black text-black">{character.characterName}</span>{" "}
                  <span className="font-mono text-xs text-text-muted">· {versions?.length ?? character.totalVersions} version</span>
                </p>
                {commissionCharacters.length > 1 && (
                  <select
                    aria-label="Chọn character loại Commission"
                    value={character.characterId}
                    onChange={(e) => void handleSelectCommissionCharacter(Number(e.target.value))}
                    className="border-2 border-black bg-white px-2.5 py-1 text-xs font-bold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
                  >
                    {commissionCharacters.map((c) => (
                      <option key={c.characterId} value={c.characterId}>
                        #{c.characterId} · {c.characterName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!versions ? <div className="mt-4"><SkeletonGrid count={3} /></div> : versions.length === 0 ? (
                <div className="mt-4 border-2 border-dashed border-black bg-[#f7fbf8] p-10 text-center">
                  <Layers size={32} className="mx-auto mb-3 text-black/40" />
                  <h3 className="font-black uppercase text-black">Character chưa có version nào</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm font-medium text-text-muted">Mở Studio, vẽ và bấm “Lưu phiên bản”. Version sẽ hiện ở đây để bạn chọn nộp.</p>
                  {studioHref && <Link href={studioHref} className={`${primaryBtn} mt-5`}><Palette size={15} /> Mở Studio</Link>}
                </div>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Chọn version để nộp">
                  {versions.map((version) => {
                    const isSelected = version.versionId === selectedId;
                    const submittedAs = submittedUrls.get(version.previewGifUrl);
                    return (
                      <li key={version.versionId}>
                        <button type="button" aria-pressed={isSelected} disabled={!draftable}
                          onClick={() => { setSelectedId(isSelected ? undefined : version.versionId); setSubmitError(""); setSubmitted(undefined); }}
                          className={`group block w-full cursor-pointer overflow-hidden border-2 border-black bg-white text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-default ${isSelected
                            ? "bg-[#eef8f0] shadow-[4px_4px_0_0_#000]" : "hover:shadow-[3px_3px_0_0_#000]"}`}>
                          <div className="relative aspect-square border-b-2 border-black bg-[#090d14]">
                            {isHttpUrl(version.previewGifUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={version.previewGifUrl} alt={`Version v${version.versionNumber}`} loading="lazy"
                                className="h-full w-full object-contain p-2 [image-rendering:pixelated]" />
                            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">Không có ảnh</div>}
                            {isSelected && <span className="absolute right-2 top-2 border border-black bg-primary p-1 text-black shadow-[1px_1px_0_0_#000]"><CheckCircle2 size={15} /></span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 p-2.5 text-xs">
                            <span className="font-mono font-black text-black">v{version.versionNumber}</span>
                            {version.isCurrent && <span className="border border-black bg-primary px-1.5 text-[10px] font-black uppercase text-black">Hiện hành</span>}
                            {submittedAs !== undefined && <span className="border border-black bg-sky-200 px-1.5 text-[10px] font-black uppercase text-black">Đã nộp (#{submittedAs})</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!draftable && versions && versions.length > 0 && (
                <p className="mt-4 border-2 border-black bg-[#f7fbf8] px-4 py-3 text-xs font-bold text-black">Chỉ nộp được khi commission ở “Cần thiết kế” hoặc “Staff yêu cầu sửa”. Bạn vẫn có thể vẽ và lưu version trong Studio.</p>
              )}

              {/* Khung nộp */}
              <div className="t-panel-slide mt-5" data-open={String(Boolean(selected && draftable))} aria-hidden={!selected}>
                {selected && draftable && (
                  <div className="space-y-3 border-2 border-black bg-[#eef8f0] p-4 shadow-[4px_4px_0_0_#000]">
                    <p className="flex items-center gap-2 font-black uppercase text-black"><Send size={15} /> Nộp version v{selected.versionNumber} cho staff duyệt</p>
                    {submittedUrls.has(selected.previewGifUrl) && <p className="text-xs font-bold text-amber-800">Version này đã được nộp trước đây. Bạn vẫn có thể nộp lại nếu muốn.</p>}
                    <label htmlFor="designer-note" className="block text-xs font-black uppercase tracking-wider text-black">Ghi chú cho staff (không bắt buộc)</label>
                    <textarea id="designer-note" rows={3} maxLength={2000} value={note} disabled={submitting} onChange={(event) => setNote(event.target.value)}
                      placeholder="Ví dụ: đã tăng độ sáng viền neon và làm mượt vòng lặp theo ghi chú."
                      className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none" />
                    {submitError && <p role="alert" className="text-xs font-bold text-red-700">{submitError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void submit()} disabled={submitting} className={primaryBtn}>
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {submitting ? "Đang nộp…" : `Nộp v${selected.versionNumber}`}
                      </button>
                      <button type="button" disabled={submitting} onClick={() => setSelectedId(undefined)} className={secondaryBtn}>Bỏ chọn</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section className={`${shell} space-y-3 p-5`}>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black"><ClipboardList size={16} /> Yêu cầu của khách</h2>
            {detail.description ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-black">{detail.description}</p> : <p className="text-sm text-text-muted">Không có mô tả.</p>}
            {(detail.attachments ?? []).some((item) => isHttpUrl(item.imageUrl)) && (
              <ul className="grid grid-cols-3 gap-2">
                {(detail.attachments ?? []).filter((item) => isHttpUrl(item.imageUrl)).map((item) => (
                  <li key={item.attachmentId}>
                    <a href={item.imageUrl} target="_blank" rel="noreferrer" title={item.caption ?? "Ảnh tham khảo"} className="block overflow-hidden border-2 border-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.caption || "Ảnh tham khảo"} loading="lazy" className="aspect-square w-full bg-[#f7fbf8] object-contain" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <SubmissionHistory submissions={submissions} />
        </aside>
      </div>
    </div>
  );
}

function SubmissionHistory({ submissions }: { submissions: CommissionSubmissionItem[] }) {
  const sorted = [...submissions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <section className={`${shell} p-5`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black"><History size={16} /> Lịch sử bản nộp</h2>
      {sorted.length === 0 ? <p className="text-sm font-medium text-text-muted">Chưa nộp bản nào.</p> : (
        <ol className="space-y-3">
          {sorted.map((item) => (
            <li key={item.submissionId} className="flex gap-3 border-2 border-black bg-[#f7fbf8] p-3">
              {isHttpUrl(item.imageUrl) && (
                <a href={item.imageUrl} target="_blank" rel="noreferrer" className="shrink-0 border-2 border-black bg-[#090d14]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={`Bản nộp #${item.versionNumber}`} loading="lazy" className="h-14 w-20 object-contain [image-rendering:pixelated]" />
                </a>
              )}
              <div className="min-w-0 text-sm">
                <p className="font-black text-black">Bản nộp #{item.versionNumber} · <span className="font-semibold text-text-muted">{SUBMISSION_LABELS[item.status] ?? item.status}</span></p>
                {item.designerNote && <p className="break-words text-xs font-medium text-text-muted">Ghi chú: {item.designerNote}</p>}
                {item.staffReviewNote && <p className="break-words text-xs font-bold text-amber-800">Staff: {item.staffReviewNote}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
