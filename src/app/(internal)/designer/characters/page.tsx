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
  Loader2,
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
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { stripCommissionMarker } from "@/features/designer/commission-link";
import PublishToStoreModal from "@/features/designer/components/PublishToStoreModal";
import {
  isStoreCharacterType,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { hasStudioDraft } from "@/features/designer/studio-draft";

function DesignerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    characters,
    meta,
    page,
    setPage,
    setQuery,
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

  const handleOpenStudio = (char: DesignerCharacterItem) => {
    router.push(`/designer/studio/${char.characterId}`);
  };

  return (
    <div className="space-y-5">
      {/* Notice */}
      {notice && (
        <div
          role="status"
          className="neo-box-no-hover flex items-center justify-between gap-3 border-l-8 border-l-[#2d6a4f] bg-[#eef8f0] px-4 py-3 text-sm font-bold text-black"
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

      {/* Compact Neo-Brutalist Toolbar (Top banner from Image 1 removed cleanly) */}
      <div className="neo-box-no-hover flex flex-wrap items-center justify-between gap-3 bg-white p-3.5">
        <form
          onSubmit={handleSearchSubmit}
          className="flex min-w-[260px] max-w-md flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm nhân vật theo tên..."
              aria-label="Tìm nhân vật theo tên"
              className="w-full border-2 border-black bg-white py-2 pl-9 pr-3 text-sm font-semibold text-black placeholder:font-normal placeholder:text-gray-400 focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
            />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-xs font-black uppercase">
            Tìm kiếm
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-black">
          <span className="border-2 border-black bg-[#f7fbf8] px-2.5 py-1.5 font-mono text-xs font-bold text-black">
            Tổng: {meta.totalElements}
          </span>

          <button
            type="button"
            onClick={() => void refreshCharacters()}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="neo-box-no-hover flex items-center gap-2 border-l-8 border-l-red-600 bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Character Cards Grid (First card = Word-style Create New Character card) */}
      {loading ? (
        <div className="neo-box-no-hover flex min-h-[260px] items-center justify-center gap-2 bg-white text-sm font-bold text-black">
          <Loader2 size={18} className="animate-spin" />
          <span>Đang tải danh sách nhân vật...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Word-style Create New Character Card inside the Grid */}
            {page === 0 && (
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
                className="neo-box group flex cursor-pointer flex-col overflow-hidden bg-white transition hover:-translate-y-0.5"
              >
                <div className="relative flex aspect-square w-full items-center justify-center border-b-2 border-black bg-[#f7fbf8] p-6">
                  <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-primary text-black shadow-[4px_4px_0_0_#000] transition-transform group-hover:scale-105">
                    <Plus size={30} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-black">
                      Tạo nhân vật mới
                    </h3>
                    <p className="mt-1.5 min-h-[32px] text-xs font-medium text-text-muted">
                      Khởi tạo bản vẽ nhân vật mới và chọn kích thước bản vẽ.
                    </p>
                  </div>

                  <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                      }}
                      className="btn-primary flex w-full items-center justify-center gap-1.5 py-2 text-xs font-black uppercase"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Tạo nhân vật
                    </button>
                  </div>
                </div>
              </article>
            )}

            {characters.length === 0 ? (
              <div className="neo-box-no-hover col-span-1 flex flex-col items-center justify-center bg-white p-10 text-center sm:col-span-1 lg:col-span-2 xl:col-span-3">
                <Palette size={34} className="mb-2 text-black/40" />
                <p className="text-base font-black uppercase text-black">
                  Chưa có nhân vật nào phù hợp bộ lọc
                </p>
                <p className="mt-1 text-xs font-medium text-text-muted">
                  Hãy bấm vào ô <strong>Tạo nhân vật mới</strong> bên cạnh hoặc đổi bộ lọc tìm kiếm.
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
                    className="neo-box group flex cursor-pointer flex-col overflow-hidden bg-white transition hover:-translate-y-0.5"
                  >
                    {/* Thumbnail Preview */}
                    <div className="relative aspect-square w-full overflow-hidden border-b-2 border-black bg-[#090d14]">
                      {artwork ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artwork}
                          alt={char.characterName}
                          className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                          <Layers size={28} className="opacity-60" />
                          <span className="text-xs font-bold">Chưa có bản vẽ (0 bản)</span>
                        </div>
                      )}

                      {/* Matrix Size & Draft Badges */}
                      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-[2px_2px_0_0_#000]">
                          <Grid size={11} /> {matrixSize}
                        </span>
                        {hasDraft && (
                          <span className="inline-flex items-center gap-1 border border-black bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[2px_2px_0_0_#000]">
                            Có bản nháp
                          </span>
                        )}
                      </div>

                      {/* Hover Hint */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1.5 border-2 border-black bg-primary px-3 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0_0_#000]">
                          <Palette size={12} />
                          {hasDraft
                            ? "Tiếp tục bản nháp"
                            : hasVersions
                              ? `Mở Studio (v${char.currentVersion?.versionNumber ?? char.totalVersions})`
                              : "Mở Studio phác thảo"}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-base font-black text-black group-hover:underline">
                            {char.characterName}
                          </h3>
                          <span className="shrink-0 font-mono text-[11px] font-bold text-text-muted">
                            #{char.characterId}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 min-h-[32px] text-xs font-medium text-text-muted">
                          {stripCommissionMarker(char.description) ||
                            "Chưa có mô tả cho nhân vật này."}
                        </p>
                      </div>

                      <div className="mt-4 space-y-3 border-t-2 border-dashed border-gray-200 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 font-black text-black">
                            <Layers size={13} />
                            {hasVersions ? `${char.totalVersions} phiên bản` : "0 phiên bản"}
                          </span>
                          {char.currentVersion ? (
                            <span className="border border-black bg-primary px-2 py-0.5 font-mono text-[11px] font-black text-black">
                              v{char.currentVersion.versionNumber}
                            </span>
                          ) : (
                            <span className="border border-black bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              Chưa vẽ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVersionsModalCharacter(char);
                            }}
                            className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-black uppercase"
                          >
                            <Layers size={14} /> Phiên bản
                          </button>
                          {isStoreCharacterType(char.characterType) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/designer/publish?characterId=${char.characterId}`,
                                );
                              }}
                              title="Đăng bán lên Store"
                              className="btn-primary inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-black uppercase"
                            >
                              <Store size={14} /> Đăng bán
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

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="neo-box-no-hover flex items-center justify-between bg-white px-4 py-3 text-xs">
              <span className="font-bold text-black">
                Trang <strong className="font-mono">{meta.page + 1}</strong> /{" "}
                {meta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!meta.hasPrevious}
                  onClick={() => setPage(Math.max(0, page - 1))}
                  className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black uppercase"
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <button
                  type="button"
                  disabled={!meta.hasNext}
                  onClick={() => setPage(page + 1)}
                  className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black uppercase"
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
  return (
    <DesignerCharactersProvider>
      <Suspense
        fallback={
          <div className="neo-box-no-hover flex min-h-[240px] items-center justify-center bg-white text-sm font-bold text-black">
            Đang tải Danh sách nhân vật...
          </div>
        }
      >
        <DesignerDashboardContent />
      </Suspense>
    </DesignerCharactersProvider>
  );
}
