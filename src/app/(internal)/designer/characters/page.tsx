"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grid,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Store,
  X,
} from "lucide-react";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import { useAdaptiveGridLayout } from "@/features/designer/hooks/useResponsiveGrid";
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import PublishToStoreModal from "@/features/designer/components/PublishToStoreModal";
import {
  isStoreCharacterType,
  type CharacterType,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { hasStudioDraft } from "@/features/designer/studio-draft";

const TYPE_FILTER_TABS: Array<{ key: CharacterType | "ALL"; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "STORE", label: "Nhân vật tự tạo" },
  { key: "COMMISSION", label: "Từ Commission" },
];

function DesignerDashboardContent({
  showInlineCreateCard,
  gridRows,
  gridColumns,
}: {
  showInlineCreateCard: boolean;
  gridRows: number;
  gridColumns: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    characters,
    meta,
    page,
    setPage,
    setQuery,
    characterTypeFilter,
    setCharacterTypeFilter,
    loading,
    error,
    refreshCharacters,
    getMatrixSize,
  } = useDesignerCharacters();

  const [searchInput, setSearchInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [versionsModalCharacter, setVersionsModalCharacter] =
    useState<DesignerCharacterItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Open Create Character modal if ?create=1 is passed
  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setShowCreateModal(true);
      router.replace("/designer/characters");
    }
  }, [searchParams, router]);

  // Show notice if returning from Studio after saving a version
  useEffect(() => {
    if (searchParams?.get("saved") === "1") {
      const savedName = searchParams.get("name");
      setNotice(
        savedName
          ? `Đã lưu phiên bản mới cho nhân vật "${savedName}" thành công!`
          : "Đã lưu phiên bản mới thành công!",
      );
      router.replace("/designer/characters");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setQuery(searchInput);
  };

  const handleTypeFilterChange = (nextType: CharacterType | "ALL") => {
    setCharacterTypeFilter(nextType);
    setPage(0);
  };

  const handleOpenStudio = (char: DesignerCharacterItem) => {
    router.push(`/designer/studio/${char.characterId}`);
  };

  const showCreateCardInGrid = showInlineCreateCard && page === 0;
  const visibleCount = characters.length;
  const pageSizeSlots = Math.max(1, gridColumns * gridRows);
  const firstPageCharCap = showInlineCreateCard ? Math.max(1, pageSizeSlots - 1) : pageSizeSlots;
  const rangeStart =
    meta.totalElements === 0
      ? 0
      : page === 0
        ? 1
        : firstPageCharCap + (page - 1) * pageSizeSlots + 1;
  const rangeEnd =
    meta.totalElements === 0 ? 0 : Math.min(meta.totalElements, rangeStart + Math.max(visibleCount, 1) - 1);

  return (
    <div className="flex min-h-[calc(100dvh-114px)] flex-col gap-3">
      {/* Notice */}
      {notice && (
        <div
          role="status"
          className="neo-box-no-hover flex items-center justify-between gap-3 border-l-8 border-l-[#2d6a4f] bg-[#eef8f0] px-4 py-2.5 text-sm font-bold text-black"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-primary-ink" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
            className="btn-secondary p-1!"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Compact Neo-Brutalist Toolbar: Search + Origin Type Filter + Mobile Create + Refresh */}
      <div className="neo-box-no-hover flex flex-wrap items-center justify-between gap-2.5 bg-white p-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex min-w-[180px] max-w-xs flex-1 gap-1.5"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhân vật theo tên..."
                aria-label="Tìm nhân vật theo tên"
                className="w-full min-w-0 border-2 border-black bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-black placeholder:font-normal placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary shrink-0 px-3 py-1.5 text-xs font-black uppercase">
              Tìm
            </button>
          </form>

          {/* Character origin filter tabs (Tự tạo Store vs Commission) */}
          <div role="tablist" aria-label="Phân loại nhân vật" className="flex flex-wrap gap-1.5">
            {TYPE_FILTER_TABS.map((tab) => {
              const active = characterTypeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleTypeFilterChange(tab.key)}
                  className={`cursor-pointer border-2 border-black px-2.5 py-1.5 text-[11px] uppercase transition-colors ${
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
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-black">
          {!showCreateCardInGrid && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-black uppercase"
            >
              <Plus size={13} strokeWidth={2.5} /> Tạo mới
            </button>
          )}
          <span className="border-2 border-black bg-[#f7fbf8] px-2.5 py-1.5 font-mono text-xs font-bold text-black">
            Tổng: {meta.totalElements}
          </span>
          <button
            type="button"
            onClick={() => void refreshCharacters()}
            className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="neo-box-no-hover flex items-center gap-2 border-l-8 border-l-red-600 bg-red-50 p-3 text-sm font-bold text-red-700"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Character Cards Grid (adaptive rows × responsive cols, persistent bottom pagination) */}
      {loading ? (
        <div
          aria-busy="true"
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={
            gridColumns >= 2
              ? { gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` }
              : undefined
          }
        >
          <span className="sr-only" role="status">
            Đang tải danh sách nhân vật...
          </span>
          {Array.from({ length: pageSizeSlots }, (_, idx) => (
            <div
              key={idx}
              aria-hidden="true"
              className="neo-box-no-hover flex h-full animate-pulse flex-col overflow-hidden bg-white"
            >
              <div className="min-h-[112px] flex-1 border-b-2 border-black bg-gray-200" />
              <div className="shrink-0 space-y-2 p-2.5">
                <div className="h-3.5 w-3/4 bg-gray-200" />
                <div className="h-3 w-1/2 bg-gray-100" />
                <div className="h-7 w-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={
            gridColumns >= 2 && characters.length > 0
              ? { gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` }
              : undefined
          }
        >
            {/* Word-style Create New Character Card inside slot 1 of page 0 on sm+ */}
            {showCreateCardInGrid && (
              <article
                role="button"
                tabIndex={0}
                onClick={() => setShowCreateModal(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowCreateModal(true);
                  }
                }}
                className="neo-box group flex h-full cursor-pointer flex-col overflow-hidden bg-white transition hover:-translate-y-0.5"
              >
                <div className="relative flex min-h-[112px] w-full flex-1 items-center justify-center border-b-2 border-black bg-[#f7fbf8] p-3">
                  <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-primary text-black shadow-[3px_3px_0_0_#000] transition-transform group-hover:scale-105">
                    <Plus size={24} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col justify-between p-2.5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-black">
                      Tạo nhân vật mới
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-text-muted">
                      Khởi tạo bản vẽ nhân vật LED mới.
                    </p>
                  </div>

                  <div className="mt-2 border-t-2 border-dashed border-gray-200 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                      }}
                      className="btn-primary flex w-full items-center justify-center gap-1 py-1 text-[11px] font-black uppercase"
                    >
                      <Plus size={12} strokeWidth={2.5} /> Tạo nhân vật
                    </button>
                  </div>
                </div>
              </article>
            )}

            {characters.length === 0 ? (
              <div
                className={`neo-box-no-hover flex h-full flex-col items-center justify-center bg-white p-8 text-center ${
                  showCreateCardInGrid
                    ? "sm:col-span-1 lg:col-span-2 xl:col-span-3"
                    : "sm:col-span-2 lg:col-span-3 xl:col-span-4"
                }`}
              >
                <Palette size={28} className="mb-2 text-black/40" />
                <p className="text-sm font-black uppercase text-black">
                  Chưa có nhân vật nào phù hợp bộ lọc
                </p>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  Hãy tạo nhân vật mới hoặc chuyển tab phân loại bên trên.
                </p>
              </div>
            ) : (
              characters.map((char) => {
                const artwork = getCharacterArtwork(char);
                const matrixSize = getMatrixSize(char.characterId);
                const hasVersions = char.totalVersions > 0;
                const hasDraft = hasStudioDraft(char.characterId);

                return (
                  <article
                    key={char.characterId}
                    onClick={() => handleOpenStudio(char)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenStudio(char);
                      }
                    }}
                    className="neo-box group flex h-full cursor-pointer flex-col overflow-hidden bg-white transition hover:-translate-y-0.5"
                  >
                    {/* Thumbnail Preview */}
                    <div className="relative min-h-[112px] w-full flex-1 overflow-hidden border-b-2 border-black bg-[#090d14]">
                      {artwork ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artwork}
                          alt={char.characterName}
                          className="h-full w-full object-contain transition-transform group-hover:scale-105"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                          <Layers size={22} className="opacity-60" />
                          <span className="text-[11px] font-bold">Chưa có bản vẽ (0 bản)</span>
                        </div>
                      )}

                      {/* Matrix Size & Draft Badges */}
                      <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black text-black shadow-[2px_2px_0_0_#000]">
                          <Grid size={10} /> {matrixSize}
                        </span>
                        {hasDraft && (
                          <span className="inline-flex items-center gap-1 border border-black bg-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow-[2px_2px_0_0_#000]">
                            Có bản nháp
                          </span>
                        )}
                      </div>

                      {/* Hover Hint */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1 border-2 border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[2px_2px_0_0_#000]">
                          <Palette size={11} />
                          {hasDraft
                            ? "Tiếp tục bản nháp"
                            : hasVersions
                              ? `Mở Studio (v${char.currentVersion?.versionNumber ?? char.totalVersions})`
                              : "Mở Studio phác thảo"}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex shrink-0 flex-col justify-between p-2.5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-xs font-black text-black group-hover:underline">
                            {char.characterName}
                          </h3>
                          <span className="shrink-0 font-mono text-[10px] font-bold text-text-muted">
                            #{char.characterId}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-text-muted">
                          {stripCommissionMarker(char.description) ||
                            "Chưa có mô tả cho nhân vật này."}
                        </p>
                      </div>

                      <div className="mt-2 space-y-2 border-t-2 border-dashed border-gray-200 pt-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1 font-black text-black">
                            <Layers size={12} />
                            {hasVersions ? `${char.totalVersions} phiên bản` : "0 phiên bản"}
                          </span>
                          {char.currentVersion ? (
                            <span className="border border-black bg-primary px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                              v{char.currentVersion.versionNumber}
                            </span>
                          ) : (
                            <span className="border border-black bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                              Chưa vẽ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionsModalCharacter(char);
                            }}
                            className="btn-secondary inline-flex flex-1 items-center justify-center gap-1 whitespace-nowrap px-2 py-1 text-[11px] font-black uppercase"
                          >
                            <Layers size={12} /> Phiên bản
                          </button>
                          {isStoreCharacterType(char.characterType) &&
                            char.commissionId == null &&
                            linkedCommissionId(char.description) === undefined && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/designer/publish?characterId=${char.characterId}`,
                                );
                              }}
                              title="Đăng bán lên Store"
                              className="btn-primary inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-1 text-[11px] font-black uppercase"
                            >
                              <Store size={12} /> Đăng bán
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
        </div>
      )}

      {/* Bottom-pinned Pagination (always mounted) */}
      <div className="neo-box-no-hover mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 bg-white px-4 py-2 text-xs">
        <span className="font-bold text-black">
          {meta.totalElements > 0 && (
            <>
              <strong className="font-mono">
                {rangeStart}–{rangeEnd}
              </strong>{" "}
              / {meta.totalElements} ·{" "}
            </>
          )}
          Trang <strong className="font-mono">{meta.page + 1}</strong> /{" "}
          {meta.totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !meta.hasPrevious}
            onClick={() => setPage(Math.max(0, page - 1))}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <button
            type="button"
            disabled={loading || !meta.hasNext}
            onClick={() => setPage(page + 1)}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase disabled:opacity-40"
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Create Character Modal */}
      {showCreateModal && (
        <CreateCharacterModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            router.push(`/designer/studio/${created.characterId}`);
          }}
        />
      )}

      {/* Character Versions Modal */}
      {versionsModalCharacter && (
        <PublishToStoreModal
          key={versionsModalCharacter.characterId}
          character={versionsModalCharacter}
          mode="versions"
          onClose={() => setVersionsModalCharacter(null)}
          onSuccess={(created) => {
            setNotice(
              `Đã gửi “${created.productName}” (#${created.productId}) để manager đặt giá và duyệt đăng bán.`,
            );
          }}
        />
      )}
    </div>
  );
}

export default function DesignerCharactersPage() {
  const { columns, rows, pageSize, ready } = useAdaptiveGridLayout({
    estimatedRowHeight: 256,
    chromeHeight: 286,
    maxRows: 3,
  });
  const showInlineCreateCard = columns >= 2;

  return (
    <DesignerCharactersProvider
      pageSize={pageSize}
      reserveCreateSlotOnFirstPage={showInlineCreateCard}
      ready={ready}
    >
      <Suspense
        fallback={
          <div className="neo-box-no-hover flex min-h-[240px] items-center justify-center bg-white text-sm font-bold text-black">
            Đang tải Danh sách nhân vật...
          </div>
        }
      >
        <DesignerDashboardContent
          showInlineCreateCard={showInlineCreateCard}
          gridRows={rows}
          gridColumns={columns}
        />
      </Suspense>
    </DesignerCharactersProvider>
  );
}
