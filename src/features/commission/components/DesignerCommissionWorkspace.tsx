"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Grid, History, Layers, Loader2,
  Palette, RefreshCw, Send, Sparkles,
} from "lucide-react";
import "@/styles/transitions.css";
import { getApiErrorMessage } from "@/lib/api/auth";
import { fetchCharacterVersions, fetchMyCharacters, formatDesignerApiError, type CharacterVersionItem, type DesignerCharacterItem } from "@/lib/api/designerCharacters";
import { sortVersionsNewestFirst } from "@/features/designer/context/DesignerCharactersContext";
import {
  createCommissionCharacter, findCommissionCharacter, linkedCommissionId, studioMatrixSize,
} from "@/features/designer/commission-link";
import { commissionErrorMessage } from "../errors";
import { uploadMediaFile } from "@/lib/api/media";
import CommissionRevisionTimeline from "./CommissionRevisionTimeline";
import CommissionDraftUpload from "./CommissionDraftUpload";
import {
  getCommissionQueue, getManagementCommission, uploadCommissionDraft,
  type CommissionManagementDetail, type CommissionQueueItem, type CommissionSubmissionItem,
} from "../services/management-commission.api";

// ---------------------------------------------------------------------------
// Trạng thái
// ---------------------------------------------------------------------------

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
  todo: "bg-amber-100 text-amber-900",
  wait: "bg-sky-100 text-sky-900",
  done: "bg-studio-soft text-studio-ink",
  muted: "bg-slate-100 text-slate-600",
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

// Phong cách Designer Dashboard
const shell = "rounded-md border border-studio-line bg-white shadow-xs";
const primaryBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded bg-studio-accent px-5 text-sm font-bold text-white shadow-sm transition hover:bg-studio-accent-hover disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded border border-studio-line bg-white px-4 text-sm font-bold text-studio-ink transition hover:bg-studio-wash disabled:opacity-50";

function StatusChip({ status }: { status: string }) {
  const meta = statusMeta(status);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CHIP[meta.tone]}`}>{meta.label}</span>;
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="t-skel-skeleton is-pulsing grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={{ "--pulse-count": "infinite" } as CSSProperties} aria-busy="true">
      <span className="sr-only" role="status">Đang tải…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${shell} overflow-hidden`} aria-hidden="true">
          <div className="aspect-[4/3] bg-studio-soft" />
          <div className="space-y-2 p-4"><div className="h-4 w-3/4 rounded bg-studio-soft" /><div className="h-3 w-1/2 rounded bg-studio-soft" /></div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle size={16} className="shrink-0" /> <span className="flex-1">{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="min-h-11 font-bold underline">Thử lại</button>}
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
  const [items, setItems] = useState<CommissionQueueItem[]>();
  const [characters, setCharacters] = useState<Map<number, DesignerCharacterItem>>(new Map());
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState("todo");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const query = getCommissionQueue(page, true);
    query.then(({ data, meta }) => {
      if (!active) return;
      setItems((current) => (page === 0 ? data : [...(current ?? []), ...data]));
      setHasNext(Boolean(meta?.hasNext));
      setError("");
    }).catch((failure) => {
      if (active) setError(getApiErrorMessage(failure, "Không tải được commission được phân công."));
    }).finally(() => { if (active) setLoadingMore(false); });
    return () => { active = false; query.cancel(); };
  }, [page, revision]);

  // Ảnh version hiện hành của character đã liên kết, để thẻ commission có ảnh xem trước giống Dashboard.
  useEffect(() => {
    let active = true;
    fetchMyCharacters({ page: 0, size: 100 }).then(({ items: list }) => {
      if (!active) return;
      const map = new Map<number, DesignerCharacterItem>();
      for (const item of list) {
        const id = linkedCommissionId(item.description);
        if (id !== undefined && !map.has(id)) map.set(id, item);
      }
      setCharacters(map);
    }).catch(() => { /* ảnh xem trước là phụ */ });
    return () => { active = false; };
  }, [revision]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((entry) => [
    entry.key, (items ?? []).filter((item) => !entry.statuses || entry.statuses.includes(item.status)).length,
  ])), [items]);
  const current = TABS.find((entry) => entry.key === tab) ?? TABS[0];
  const visible = (items ?? []).filter((item) => !current.statuses || current.statuses.includes(item.status));

  const refresh = () => { setItems(undefined); setPage(0); setRevision((value) => value + 1); };

  return (
    <div className="space-y-6">
      <header className={`${shell} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-studio-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-studio-ink">
            <ClipboardList size={13} /> Commission
          </span>
          <h1 className="mt-2 text-2xl font-semibold text-studio-ink">Commission được phân công</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Mỗi commission có một character riêng. Vẽ và lưu bao nhiêu version tùy ý trong Studio, rồi chọn version ưng ý để nộp staff duyệt.
          </p>
        </div>
        <button type="button" onClick={refresh} className={secondaryBtn}><RefreshCw size={15} /> Làm mới</button>
      </header>

      <div role="tablist" aria-label="Lọc commission" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button key={entry.key} type="button" role="tab" aria-selected={tab === entry.key} onClick={() => setTab(entry.key)}
            className={`min-h-11 rounded border px-4 text-sm font-bold transition ${tab === entry.key
              ? "border-studio-accent bg-studio-accent text-white" : "border-studio-line bg-white text-studio-ink hover:bg-studio-wash"}`}>
            {entry.label} <span className={`ml-1 rounded-full px-1.5 text-xs ${tab === entry.key ? "bg-white/20" : "bg-studio-soft"}`}>{counts[entry.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={refresh} />}

      {!items && !error ? <SkeletonGrid /> : visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-studio-line bg-white p-14 text-center">
          <Sparkles size={36} className="mx-auto mb-3 text-studio-muted" />
          <h2 className="text-lg font-semibold text-studio-ink">{tab === "todo" ? "Không có commission nào cần làm" : "Chưa có commission ở mục này"}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Commission mới được staff phân công sẽ xuất hiện ở mục “Cần làm”.</p>
          {tab !== "all" && <button type="button" onClick={() => setTab("all")} className={`${secondaryBtn} mt-5`}>Xem tất cả</button>}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const character = characters.get(item.commissionId);
            const preview = character?.currentVersion?.previewGifUrl;
            const todo = DESIGNER_DRAFTABLE.has(item.status);
            return (
              <li key={item.commissionId}>
                <Link href={`/designer/commissions/${item.commissionId}`}
                  className={`group flex h-full flex-col overflow-hidden rounded-md border bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-studio-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent ${todo ? "border-amber-300" : "border-studio-line"}`}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-studio-line bg-[#0f172a]">
                    {isHttpUrl(preview) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt={`Version hiện hành của ${item.title}`} loading="lazy"
                        className="h-full w-full object-contain p-3 [image-rendering:pixelated] transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                        <Palette size={28} className="opacity-60" />
                        <span className="text-xs font-semibold">{character ? "Character chưa có version" : "Chưa tạo character"}</span>
                      </div>
                    )}
                    {item.targetMatrixDimensions && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                        <Grid size={11} /> {item.targetMatrixDimensions}
                      </span>
                    )}
                    <span className="absolute right-3 top-3"><StatusChip status={item.status} /></span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 text-base font-semibold text-studio-ink group-hover:text-studio-link">{item.title}</h2>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">#{item.commissionId}</span>
                      </div>
                      {item.customerName && <p className="mt-1 text-xs text-slate-500">Khách: {item.customerName}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-studio-line pt-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-studio-ink">
                        <Layers size={13} className="text-studio-link" /> {character ? `${character.totalVersions} version` : "—"}
                      </span>
                      {todo && <span className="font-bold text-amber-700">Mở để làm →</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasNext && items && (
        <div className="text-center">
          <button type="button" disabled={loadingMore} onClick={() => { setLoadingMore(true); setPage((value) => value + 1); }} className={secondaryBtn}>
            {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null} Tải thêm
          </button>
        </div>
      )}
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
    let timer: ReturnType<typeof setTimeout>;
    let query: ReturnType<typeof getManagementCommission>;
    function refresh() {
      query = getManagementCommission(commissionId);
      query.then(({ data }) => { if (active) { setDetail(data); setDetailError(""); } })
        .catch((failure) => { if (active) setDetailError(getApiErrorMessage(failure, "Không tải được commission.")); })
        .finally(() => { if (active) timer = setTimeout(refresh, 10000); });
    }
    refresh();
    return () => { active = false; clearTimeout(timer); query?.cancel(); };
  }, [commissionId, revision]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const found = await findCommissionCharacter(commissionId);
        if (!active) return;
        setCharacter(found ?? null);
        const list = found ? sortVersionsNewestFirst(await fetchCharacterVersions(found.characterId)) : [];
        if (!active) return;
        setVersions(list);
        setCharacterError("");
      } catch (failure) {
        if (active) setCharacterError(formatDesignerApiError(failure, "Không tải được character của commission."));
      }
    })();
    return () => { active = false; };
  }, [commissionId, revision]);

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
    const designerNote = note.trim();
    if (designerNote.length > 2000) return setSubmitError("Ghi chú tối đa 2000 ký tự.");
    if (!isHttpUrl(selected.previewGifUrl)) return setSubmitError("Version này chưa có ảnh trên kho media. Hãy mở Studio và lưu lại version.");
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(selected.previewGifUrl);
      if (!response.ok) throw new Error("Không tải được ảnh phiên bản. Hãy mở Studio và lưu lại.");
      const blob = await response.blob();
      const file = new File([blob], `commission-${detail.commissionId}-v${selected.versionNumber}`, { type: blob.type });
      const uploaded = await uploadMediaFile(file, "COMMISSION_DRAFT", detail.commissionId);
      if (uploaded.localPreviewUrl) URL.revokeObjectURL(uploaded.localPreviewUrl);
      if (!uploaded.objectKey) throw new Error("Không nhận được mã bản nháp.");
      const { data } = await uploadCommissionDraft(detail.commissionId, { imageUrl: uploaded.objectKey, designerNote: designerNote || undefined });
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
      <Link href="/designer/commissions" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-studio-ink hover:underline">
        <ArrowLeft size={15} /> Commission được phân công
      </Link>

      <header className={`${shell} flex flex-wrap items-start justify-between gap-4 p-6`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-studio-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-studio-ink">
              <ClipboardList size={13} /> Commission #{detail.commissionId}
            </span>
            <StatusChip status={detail.status} />
            {detail.targetMatrixDimensions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-studio-accent-hover px-2.5 py-0.5 font-mono text-[11px] font-bold text-white"><Grid size={11} /> {detail.targetMatrixDimensions}</span>
            )}
          </div>
          <h1 className="mt-2 break-words text-2xl font-semibold text-studio-ink">{detail.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{meta.hint}</p>
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {detail.assignedStaffName && <><dt className="text-slate-500">Staff</dt><dd className="font-bold text-studio-ink">{detail.assignedStaffName}</dd></>}
          {formatDate(detail.slaDueAt) && <><dt className="text-slate-500">Hạn</dt><dd className="font-bold text-studio-ink">{formatDate(detail.slaDueAt)}</dd></>}
          {typeof detail.maxRevisions === "number" && <><dt className="text-slate-500">Lượt sửa khách</dt><dd className="font-bold text-studio-ink">{detail.revisionsUsed ?? 0}/{detail.maxRevisions}</dd></>}
        </dl>
      </header>

      {rejected?.staffReviewNote && (
        <section className="rounded-md border-2 border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle size={16} /> Staff yêu cầu sửa bản nộp #{rejected.versionNumber}{rejected.reviewerStaffName ? ` · ${rejected.reviewerStaffName}` : ""}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-950">{rejected.staffReviewNote}</p>
        </section>
      )}

      {submitted && (
        <section role="status" className="flex items-center gap-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <SuccessCheck />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">Đã nộp version v{submitted.versionNumber} cho staff duyệt (bản nộp #{submitted.draftVersion}).</p>
            <p className="text-emerald-800">Staff sẽ gửi cho khách hoặc trả về kèm ghi chú nếu cần sửa.</p>
          </div>
        </section>
      )}

      <CommissionRevisionTimeline detail={detail} designer onChanged={reload} />
      {draftable && <CommissionDraftUpload commissionId={commissionId} onUploaded={reload} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${shell} p-5`} aria-labelledby="character-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-studio-line pb-4">
            <div>
              <h2 id="character-heading" className="flex items-center gap-2 text-lg font-semibold text-studio-ink"><Palette size={18} className="text-studio-link" /> Character & phiên bản</h2>
              <p className="text-xs text-slate-500">Lưu bao nhiêu version tùy ý trong Studio. Chọn một version bên dưới để nộp.</p>
            </div>
            {studioHref && <Link href={studioHref} className={primaryBtn}><Palette size={15} /> Mở Studio</Link>}
          </div>

          {characterError && <div className="mt-4"><ErrorBox message={characterError} onRetry={reload} /></div>}

          {character === undefined && !characterError ? (
            <div className="mt-4"><SkeletonGrid count={3} /></div>
          ) : character === null ? (
            <div className="mt-4 rounded-md border border-dashed border-studio-line p-10 text-center">
              <Sparkles size={36} className="mx-auto mb-3 text-studio-muted" />
              <h3 className="text-lg font-semibold text-studio-ink">Chưa có character cho commission này</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Character mới mang tên commission{matrix ? ` và khóa khổ ${matrix}` : ""}, nằm trong thư viện của bạn như mọi character khác.
              </p>
              <button type="button" onClick={() => void createCharacter()} disabled={creating} className={`${primaryBtn} mt-5`}>
                {creating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {creating ? "Đang tạo…" : "Tạo character"}
              </button>
            </div>
          ) : character && (
            <>
              <p className="mt-4 text-sm"><span className="font-semibold text-studio-ink">{character.characterName}</span> <span className="text-slate-500">· {versions?.length ?? character.totalVersions} version</span></p>
              {!versions ? <div className="mt-4"><SkeletonGrid count={3} /></div> : versions.length === 0 ? (
                <div className="mt-4 rounded-md border border-dashed border-studio-line p-10 text-center">
                  <Layers size={32} className="mx-auto mb-3 text-studio-muted" />
                  <h3 className="font-semibold text-studio-ink">Character chưa có version nào</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Mở Studio, vẽ và bấm “Lưu phiên bản”. Version sẽ hiện ở đây để bạn chọn nộp.</p>
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
                          className={`group block w-full overflow-hidden rounded-md border-2 bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent disabled:cursor-default ${isSelected
                            ? "border-studio-accent shadow-md" : "border-studio-line hover:border-studio-muted"}`}>
                          <div className="relative aspect-square bg-[#0f172a]">
                            {isHttpUrl(version.previewGifUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={version.previewGifUrl} alt={`Version v${version.versionNumber}`} loading="lazy"
                                className="h-full w-full object-contain p-2 [image-rendering:pixelated]" />
                            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">Không có ảnh</div>}
                            {isSelected && <span className="absolute right-2 top-2 rounded-full bg-studio-accent p-1 text-white"><CheckCircle2 size={16} /></span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 p-2.5 text-xs">
                            <span className="font-semibold text-studio-ink">v{version.versionNumber}</span>
                            {version.isCurrent && <span className="rounded bg-studio-soft px-1.5 font-bold text-studio-ink">Hiện hành</span>}
                            {submittedAs !== undefined && <span className="rounded bg-sky-100 px-1.5 font-bold text-sky-900">Đã nộp (#{submittedAs})</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!draftable && versions && versions.length > 0 && (
                <p className="mt-4 rounded bg-studio-wash px-4 py-3 text-sm text-slate-600">Chỉ nộp được khi commission ở “Cần thiết kế” hoặc “Staff yêu cầu sửa”. Bạn vẫn có thể vẽ và lưu version trong Studio.</p>
              )}

              {/* Khung nộp — transitions.dev "Panel reveal" */}
              <div className="t-panel-slide mt-5" data-open={String(Boolean(selected && draftable))} aria-hidden={!selected}>
                {selected && draftable && (
                  <div className="space-y-3 rounded-md border border-studio-accent bg-studio-wash p-4">
                    <p className="flex items-center gap-2 font-semibold text-studio-ink"><Send size={16} /> Nộp version v{selected.versionNumber} cho staff duyệt</p>
                    {submittedUrls.has(selected.previewGifUrl) && <p className="text-sm text-amber-800">Version này đã được nộp trước đây. Bạn vẫn có thể nộp lại nếu muốn.</p>}
                    <label htmlFor="designer-note" className="block text-sm font-bold text-studio-ink">Ghi chú cho staff (không bắt buộc)</label>
                    <textarea id="designer-note" rows={3} maxLength={2000} value={note} disabled={submitting} onChange={(event) => setNote(event.target.value)}
                      placeholder="Ví dụ: đã tăng độ sáng viền neon và làm mượt vòng lặp theo ghi chú."
                      className="w-full rounded border border-studio-line bg-white px-3 py-2 text-sm outline-none focus:border-studio-focus focus:ring-2 focus:ring-studio-focus/30" />
                    {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
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
            <h2 className="flex items-center gap-2 font-semibold text-studio-ink"><ClipboardList size={17} className="text-studio-link" /> Yêu cầu của khách</h2>
            {detail.description ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{detail.description}</p> : <p className="text-sm text-slate-500">Không có mô tả.</p>}
            {(detail.attachments ?? []).some((item) => isHttpUrl(item.imageUrl)) && (
              <ul className="grid grid-cols-3 gap-2">
                {(detail.attachments ?? []).filter((item) => isHttpUrl(item.imageUrl)).map((item) => (
                  <li key={item.attachmentId}>
                    <a href={item.imageUrl} target="_blank" rel="noreferrer" title={item.caption ?? "Ảnh tham khảo"} className="block overflow-hidden rounded border border-studio-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.caption || "Ảnh tham khảo"} loading="lazy" className="aspect-square w-full bg-studio-wash object-contain" />
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
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-studio-ink"><History size={17} className="text-studio-link" /> Lịch sử bản nộp</h2>
      {sorted.length === 0 ? <p className="text-sm text-slate-500">Chưa nộp bản nào.</p> : (
        <ol className="space-y-3">
          {sorted.map((item) => (
            <li key={item.submissionId} className="flex gap-3 rounded border border-studio-line p-3">
              {isHttpUrl(item.imageUrl) && (
                <a href={item.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={`Bản nộp #${item.versionNumber}`} loading="lazy" className="h-14 w-20 rounded-lg bg-[#0f172a] object-contain [image-rendering:pixelated]" />
                </a>
              )}
              <div className="min-w-0 text-sm">
                <p className="font-bold text-studio-ink">Bản nộp #{item.versionNumber} · <span className="font-semibold text-slate-600">{SUBMISSION_LABELS[item.status] ?? item.status}</span></p>
                {item.designerNote && <p className="break-words text-xs text-slate-500">Ghi chú: {item.designerNote}</p>}
                {item.staffReviewNote && <p className="break-words text-xs text-amber-800">Staff: {item.staffReviewNote}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
