"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FilePlus2,
  Grid,
  Loader2,
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
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import { getStudioDraftMeta } from "@/features/designer/studio-draft";
import {
  getCommissionQueue,
  type CommissionQueueItem,
} from "@/features/commission/services/management-commission.api";
import { COMMISSION_STATUS_LABELS } from "@/features/commission-chat/commission-status";

const TODO_STATUSES = [
  "IN_PROGRESS",
  "INTERNAL_REVISION_REQUIRED",
  "AWAITING_ESTIMATE",
] as const;

const MAX_QUEUE_PAGES = 5;
const RECENT_LIMIT = 12;

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
    ratioClass: "h-9 w-9",
    isCustom: true,
  },
  {
    key: "32x32",
    title: "Khổ 32 × 32",
    subtitle: "Vuông tiêu chuẩn",
    size: "32x32",
    ratioClass: "h-9 w-9",
  },
  {
    key: "64x64",
    title: "Khổ 64 × 64",
    subtitle: "Vuông chi tiết cao",
    size: "64x64",
    ratioClass: "h-11 w-11",
  },
  {
    key: "64x32",
    title: "Khổ 64 × 32",
    subtitle: "LED màn hình rộng",
    size: "64x32",
    ratioClass: "h-7 w-14",
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

function DashboardContent() {
  const router = useRouter();
  const { characters, loading, error, getMatrixSize } = useDesignerCharacters();
  const { items: commissions, error: commissionError } = useAssignedCommissions();
  const [createPresetSize, setCreatePresetSize] = useState<MatrixSize | null>(null);
  const [fileTab, setFileTab] = useState<FileFilterTab>("RECENT");
  const [fileSearch, setFileSearch] = useState("");

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

  const todoList = useMemo(
    () =>
      (commissions ?? []).filter((item) =>
        (TODO_STATUSES as readonly string[]).includes(item.status),
      ),
    [commissions],
  );

  const recommendedFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
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

    const filtered = enriched.filter((entry) => {
      if (fileTab === "DRAFT" && !entry.hasDraft) return false;
      if (fileTab === "STORE" && entry.isCommissionChar) return false;
      if (fileTab === "COMMISSION" && !entry.isCommissionChar) return false;
      if (q) {
        const cleanDesc = stripCommissionMarker(entry.char.description).toLowerCase();
        const matchesName = entry.char.characterName.toLowerCase().includes(q);
        const matchesDesc = cleanDesc.includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });

    // Prioritize unsaved local drafts first, then most recently modified/created files
    return filtered
      .sort((a, b) => {
        if (a.hasDraft !== b.hasDraft) return a.hasDraft ? -1 : 1;
        return b.modifiedMs - a.modifiedMs;
      })
      .slice(0, RECENT_LIMIT);
  }, [characters, draftMetaMap, fileTab, fileSearch]);

  const draftCount = useMemo(
    () => characters.filter((c) => draftMetaMap[c.characterId]?.hasDraft).length,
    [characters, draftMetaMap],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 1. Word-style "New" Quick Create Strip (no bloated hero or KPI summary cards) */}
      <section aria-label="Khởi tạo file pixel art nhanh" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-sm font-black uppercase tracking-wider text-black">
            Tạo mới (Quick Start)
          </h1>
          <Link
            href="/designer/characters"
            className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5 hover:bg-primary"
          >
            Tất cả nhân vật <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NEW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setCreatePresetSize(tpl.size)}
              className="neo-box group flex cursor-pointer flex-col justify-between gap-3 bg-white p-3.5 text-left transition hover:-translate-y-0.5"
            >
              <div className="flex h-20 w-full items-center justify-center border-2 border-black bg-[#090d14]">
                {tpl.isCustom ? (
                  <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] transition-transform group-hover:scale-105">
                    <Plus size={20} strokeWidth={2.5} />
                  </span>
                ) : (
                  <div
                    className={`${tpl.ratioClass} flex items-center justify-center border-2 border-primary bg-[#152030] font-mono text-[10px] font-black text-primary transition-transform group-hover:scale-105`}
                  >
                    {tpl.size}
                  </div>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                  <FilePlus2 size={13} className="shrink-0" />
                  {tpl.title}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-text-muted">
                  {tpl.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Word-style Recent / Recommended Files + Right To-do Queue */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="neo-box-no-hover flex flex-col bg-white">
          {/* Toolbar: Tabs + Inline Search */}
          <div className="flex flex-col gap-3 border-b-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    onClick={() => setFileTab(tab.key)}
                    className={`cursor-pointer border-2 border-black px-3 py-1.5 text-xs uppercase transition-transform hover:-translate-y-0.5 ${
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

            <div className="relative min-w-[200px] sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Tìm nhanh tên file..."
                aria-label="Tìm nhanh tên file nhân vật"
                className="w-full border-2 border-black bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-black placeholder:font-normal placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="m-4 flex items-center gap-2 border-2 border-black bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          {/* Table Header (Word-style Name | Status | Modified) */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-black/15 bg-[#f7fbf8] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-text-muted sm:grid-cols-[minmax(0,1fr)_160px_130px]">
            <span>Tên file nhân vật</span>
            <span className="hidden sm:block">Phân loại</span>
            <span className="text-right">Cập nhật</span>
          </div>

          {loading && !characters.length ? (
            <div className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse border border-black bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-44 animate-pulse bg-gray-200" />
                    <div className="h-3 w-28 animate-pulse bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Palette size={28} className="text-black/40" />
              <p className="text-sm font-black uppercase text-black">
                Chưa có file phù hợp trong mục này
              </p>
              <p className="text-xs font-medium text-text-muted">
                Chọn một mẫu ở trên để tạo nhân vật mới và bắt đầu vẽ trên Studio.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recommendedFiles.map(
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
                        className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#eef8f0] sm:grid-cols-[minmax(0,1fr)_160px_130px]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt={char.characterName}
                                className="h-full w-full object-contain p-0.5"
                                style={{ imageRendering: "pixelated" }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">
                                <Grid size={15} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-black text-black group-hover:underline">
                                {char.characterName}
                              </span>
                              <span className="border border-black bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
                                {matrixSize}
                              </span>
                              {hasDraft && (
                                <span className="border border-black bg-amber-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                                  Có bản nháp
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-text-muted">
                              {char.currentVersion
                                ? `v${char.currentVersion.versionNumber}`
                                : "Chưa chốt v1"}
                              {cleanDesc ? ` · ${cleanDesc}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="hidden items-center gap-1.5 sm:flex">
                          {isCommissionChar ? (
                            <span className="border border-black bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              {commissionId !== undefined
                                ? `Commission #${commissionId}`
                                : "Commission"}
                            </span>
                          ) : (
                            <span className="border border-black bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              Store
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 text-right">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-text-muted">
                            <Clock size={11} className="hidden sm:inline" />
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

          {characters.length > RECENT_LIMIT && (
            <div className="border-t-2 border-black bg-[#f7fbf8] px-4 py-2.5 text-right">
              <Link
                href="/designer/characters"
                className="inline-flex items-center gap-1 text-xs font-black uppercase text-black hover:underline"
              >
                Mở toàn bộ danh sách ({characters.length}+) <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </section>

        {/* Right Column: Commission To-do Queue */}
        <section className="neo-box-no-hover flex flex-col bg-white">
          <header className="flex items-center justify-between border-b-2 border-black px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-black">
              Việc cần làm ({todoList.length})
            </h2>
            <Link
              href="/designer/commissions"
              className="inline-flex items-center gap-1 text-xs font-black uppercase text-primary-ink hover:underline"
            >
              Xem bảng <ArrowRight size={13} />
            </Link>
          </header>

          {commissionError ? (
            <p className="m-4 flex items-center gap-2 border-2 border-black bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertCircle size={14} /> {commissionError}
            </p>
          ) : !commissions ? (
            <div className="flex flex-1 items-center justify-center gap-2 p-8 text-xs font-semibold text-text-muted">
              <Loader2 size={15} className="animate-spin" /> Đang tải commission...
            </div>
          ) : todoList.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-8 text-center">
              <CheckCircle2 size={24} className="text-primary-ink" />
              <p className="text-sm font-black uppercase text-black">
                Không có việc tồn đọng
              </p>
              <p className="text-xs font-medium text-text-muted">
                Commission mới được staff phân công sẽ hiện tại đây.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {todoList.slice(0, 7).map((item) => (
                <li key={item.commissionId}>
                  <Link
                    href={`/designer/commissions/${item.commissionId}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#eef8f0]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-primary font-mono text-[11px] font-black text-black">
                      #{item.commissionId}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-black">
                        {item.title}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-text-muted">
                        {item.customerName ?? "Khách hàng"}
                        {item.targetMatrixDimensions
                          ? ` · ${item.targetMatrixDimensions}`
                          : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 border border-black px-2 py-0.5 text-[10px] font-black uppercase text-black ${
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
  return (
    <DesignerCharactersProvider>
      <DashboardContent />
    </DesignerCharactersProvider>
  );
}
