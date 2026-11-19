"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Clock3, Grid, Layers, Loader2,
  Plus, Sparkles, Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import {
  getCommissionQueue,
  type CommissionQueueItem,
} from "@/features/commission/services/management-commission.api";
import { COMMISSION_STATUS_LABELS } from "@/features/commission-chat/commission-status";

const GROUPS = {
  todo: ["IN_PROGRESS", "INTERNAL_REVISION_REQUIRED"],
  review: ["INTERNAL_REVIEW"],
  customer: ["PREVIEW_DELIVERED", "CUSTOMER_REVISION_REQUESTED", "AWAITING_EXTRA_PAYMENT"],
  done: ["COMPLETED"],
} as const;

const MAX_QUEUE_PAGES = 5;
const RECENT_LIMIT = 7;

function useAssignedCommissions() {
  const [items, setItems] = useState<CommissionQueueItem[]>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const all: CommissionQueueItem[] = [];
      for (let page = 0; page < MAX_QUEUE_PAGES; page += 1) {
        const { data, meta } = await getCommissionQueue(page, true);
        all.push(...data);
        if (!meta?.hasNext) break;
      }
      if (active) setItems(all);
    })().catch((failure) => {
      if (active) setError(getApiErrorMessage(failure, "Không tải được commission được phân công."));
    });
    return () => {
      active = false;
    };
  }, []);

  return { items, error };
}

function StatCard({
  label, value, hint, icon: Icon, href, emphasis,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  icon: typeof Layers;
  href: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start justify-between gap-3 rounded-md border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
        emphasis && value ? "border-amber-300" : "border-studio-line hover:border-studio-accent"
      }`}
    >
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-studio-ink">
          {value ?? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-100 align-middle" />}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${
          emphasis && value ? "bg-amber-100 text-amber-800" : "bg-studio-soft text-studio-link"
        }`}
      >
        <Icon size={17} />
      </span>
    </Link>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { characters, meta, loading, error } = useDesignerCharacters();
  const { items: commissions, error: commissionError } = useAssignedCommissions();
  const [showCreate, setShowCreate] = useState(false);
  // Artwork comes from localStorage, so read it after mount to keep SSR and client markup equal.
  const [artwork, setArtwork] = useState<Record<number, string | null>>({});

  useEffect(() => {
    setArtwork(Object.fromEntries(characters.map((item) => [item.characterId, getCharacterArtwork(item)])));
  }, [characters]);

  const counts = useMemo(() => {
    if (!commissions) return undefined;
    const count = (statuses: readonly string[]) => commissions.filter((item) => statuses.includes(item.status)).length;
    return {
      todo: count(GROUPS.todo),
      review: count(GROUPS.review),
      customer: count(GROUPS.customer),
      done: count(GROUPS.done),
    };
  }, [commissions]);

  const todoList = useMemo(
    () => (commissions ?? []).filter((item) => (GROUPS.todo as readonly string[]).includes(item.status)),
    [commissions],
  );
  const recent = characters.slice(0, RECENT_LIMIT);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-md border border-studio-line bg-white p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-studio-link">Designer workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-studio-ink">
            Chào {user?.fullName ?? "bạn"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Bắt đầu một nhân vật LED mới, tiếp tục bản vẽ gần đây hoặc xử lý commission được giao.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/designer/characters"
            className="inline-flex items-center gap-2 rounded border border-studio-line bg-white px-4 py-2.5 text-sm font-semibold text-studio-ink transition hover:bg-studio-wash"
          >
            <Layers size={16} /> Tất cả nhân vật
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded bg-studio-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-studio-accent-hover"
          >
            <Plus size={17} /> Tạo nhân vật mới
          </button>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Thống kê" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Nhân vật" value={loading && !characters.length ? undefined : meta.totalElements} hint="Trong thư viện của bạn" icon={Sparkles} href="/designer/characters" />
        <StatCard label="Commission cần làm" value={counts?.todo} hint="Thiết kế hoặc sửa theo staff" icon={ClipboardList} href="/designer/commissions" emphasis />
        <StatCard label="Chờ staff duyệt" value={counts?.review} hint="Version đã nộp" icon={Clock3} href="/designer/commissions" />
        <StatCard label="Phía khách" value={counts?.customer} hint="Khách đang xem / yêu cầu sửa" icon={Users} href="/designer/commissions" />
        <StatCard label="Hoàn thành" value={counts?.done} hint="Commission đã xong" icon={CheckCircle2} href="/designer/commissions" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent characters */}
        <section className="rounded-md border border-studio-line bg-white">
          <header className="flex items-center justify-between border-b border-studio-line px-4 py-3">
            <h2 className="text-sm font-semibold text-studio-ink">Nhân vật gần đây</h2>
            <Link href="/designer/characters" className="inline-flex items-center gap-1 text-xs font-semibold text-studio-link hover:underline">
              Xem tất cả <ArrowRight size={13} />
            </Link>
          </header>

          {error && (
            <p className="m-4 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="group flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-studio-line text-studio-link transition hover:border-studio-accent hover:bg-studio-wash"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-studio-soft transition group-hover:scale-105">
                <Plus size={22} />
              </span>
              <span className="text-sm font-semibold">Tạo mới</span>
              <span className="text-[11px] text-slate-500">32×32 · 64×32 · 64×64</span>
            </button>

            {loading && !characters.length
              ? Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="aspect-[4/5] animate-pulse rounded-md bg-slate-100" />
                ))
              : recent.map((character) => {
                  const image = artwork[character.characterId];
                  const commissionId = linkedCommissionId(character.description);
                  return (
                    <button
                      key={character.characterId}
                      type="button"
                      onClick={() => router.push(`/designer/studio/${character.characterId}`)}
                      className="group flex aspect-[4/5] flex-col overflow-hidden rounded-md border border-studio-line bg-white text-left transition hover:-translate-y-0.5 hover:border-studio-accent hover:shadow-sm"
                    >
                      <div className="relative flex-1 bg-[#0f172a]">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={character.characterName} className="h-full w-full object-contain p-3" style={{ imageRendering: "pixelated" }} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Grid size={22} className="opacity-60" />
                          </div>
                        )}
                        {commissionId !== undefined && (
                          <span className="absolute left-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            #{commissionId}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-studio-line px-2.5 py-2">
                        <p className="truncate text-xs font-semibold text-studio-ink group-hover:text-studio-link">{character.characterName}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {character.currentVersion ? `v${character.currentVersion.versionNumber}` : "Chưa vẽ"}
                          {stripCommissionMarker(character.description) ? ` · ${stripCommissionMarker(character.description)}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
          </div>
        </section>

        {/* To-do commissions */}
        <section className="flex flex-col rounded-md border border-studio-line bg-white">
          <header className="flex items-center justify-between border-b border-studio-line px-4 py-3">
            <h2 className="text-sm font-semibold text-studio-ink">Việc cần làm</h2>
            <Link href="/designer/commissions" className="inline-flex items-center gap-1 text-xs font-semibold text-studio-link hover:underline">
              Mở bảng commission <ArrowRight size={13} />
            </Link>
          </header>
          {commissionError ? (
            <p className="m-4 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} /> {commissionError}
            </p>
          ) : !commissions ? (
            <div className="flex flex-1 items-center justify-center gap-2 p-8 text-xs text-slate-500">
              <Loader2 size={15} className="animate-spin" /> Đang tải commission...
            </div>
          ) : todoList.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
              <CheckCircle2 size={24} className="text-studio-link" />
              <p className="text-sm font-semibold text-studio-ink">Không có việc tồn đọng</p>
              <p className="text-xs text-slate-500">Commission mới được staff phân công sẽ hiện ở đây.</p>
            </div>
          ) : (
            <ul className="divide-y divide-studio-line">
              {todoList.slice(0, 6).map((item) => (
                <li key={item.commissionId}>
                  <Link href={`/designer/commissions/${item.commissionId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-studio-wash">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-studio-soft font-mono text-[11px] font-semibold text-studio-ink">
                      #{item.commissionId}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-studio-ink">{item.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {item.customerName ?? "Khách hàng"}{item.targetMatrixDimensions ? ` · ${item.targetMatrixDimensions}` : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                        item.status === "INTERNAL_REVISION_REQUIRED" ? "bg-red-50 text-red-700" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {COMMISSION_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showCreate && (
        <CreateCharacterModal
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false);
            router.push(`/designer/studio/${created.characterId}`);
          }}
        />
      )}
    </div>
  );
}

export default function DesignerDashboard() {
  return (
    <DesignerCharactersProvider>
      <DashboardContent />
    </DesignerCharactersProvider>
  );
}
