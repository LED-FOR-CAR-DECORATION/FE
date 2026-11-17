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
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import CharacterDetailsModal from "@/features/designer/components/CharacterDetailsModal";
import PublishToStoreModal from "@/features/designer/components/PublishToStoreModal";
import type {
  CharacterVersionItem,
  DesignerCharacterItem,
} from "@/lib/api/designerCharacters";

function getCharacterArtwork(character: DesignerCharacterItem): string | null {
  if (character.currentVersion?.previewGifUrl) {
    return character.currentVersion.previewGifUrl;
  }
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(`character_artwork_${character.characterId}`);
  }
  return null;
}

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
  const [selectedCharacter, setSelectedCharacter] = useState<DesignerCharacterItem | null>(null);
  const [publishTarget, setPublishTarget] = useState<{
    character: DesignerCharacterItem;
    versions: CharacterVersionItem[];
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Open Create Character modal if ?create=1 is passed from Sidebar
  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setShowCreateModal(true);
      router.replace("/designer/characters");
    }
  }, [searchParams, router]);

  // Open Character Details modal if ?characterId=... is passed (e.g. returning from Studio)
  useEffect(() => {
    const paramId = Number(searchParams?.get("characterId"));
    if (Number.isFinite(paramId) && paramId > 0 && characters.length > 0) {
      const match = characters.find((c) => c.characterId === paramId);
      if (match) {
        setSelectedCharacter(match);
        router.replace("/designer/characters");
      }
    }
  }, [searchParams, characters, router]);

  // Auto-dismiss toast notice
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d8e6dc] bg-white p-6 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f5ed] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#1f432b]">
            <Sparkles size={13} /> Designer Workspace
          </span>
          <h1 className="mt-2 text-2xl font-black text-[#1f432b]">
            Danh sách nhân vật (Characters)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mỗi Character là một thư mục chứa nhiều Versions. Bấm vào thẻ nhân vật để xem phiên
            bản, vẽ phiên bản mới hoặc gửi đăng bán lên Store.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2d6a4f] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1f432b]"
        >
          <Plus size={17} /> Create Character
        </button>
      </header>

      {/* Notice */}
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 hover:bg-emerald-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search & Refresh Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[260px] max-w-md gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm nhân vật theo tên..."
              className="w-full rounded-xl border border-[#d8e6dc] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#439660]"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-[#d8e6dc] bg-white px-4 py-2 text-xs font-bold text-[#1f432b] hover:bg-slate-50"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Tổng cộng: <strong className="text-[#1f432b]">{meta.totalElements}</strong> nhân vật
          </span>
          <button
            type="button"
            onClick={() => void refreshCharacters()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8e6dc] bg-white px-3 py-2 font-bold text-[#1f432b] hover:bg-slate-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Character Cards Grid */}
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-2xl border border-[#d8e6dc] bg-white text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin text-[#2d6a4f]" />
          <span>Đang tải danh sách Character...</span>
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbe0d1] bg-white p-14 text-center">
          <Sparkles size={36} className="mx-auto mb-3 text-[#88b998]" />
          <h2 className="text-lg font-black text-[#1f432b]">Chưa có Character nào</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Hãy bấm <strong>Create Character</strong> để khởi tạo nhân vật đầu tiên (chọn tên, mô
            tả và khóa kích thước ma trận LED).
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2d6a4f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1f432b]"
          >
            <Plus size={16} /> Create Character
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {characters.map((char) => {
              const artwork = getCharacterArtwork(char);
              const matrixSize = getMatrixSize(char.characterId);
              const hasVersions = char.totalVersions > 0;

              return (
                <article
                  key={char.characterId}
                  onClick={() => setSelectedCharacter(char)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCharacter(char);
                    }
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#d8e6dc] bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-[#2d6a4f] hover:shadow-md"
                >
                  {/* Thumbnail Preview */}
                  <div className="relative aspect-square w-full overflow-hidden border-b border-[#eef5f0] bg-[#0f172a]">
                    {artwork ? (
                      <img
                        src={artwork}
                        alt={char.characterName}
                        className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                        <Layers size={28} className="opacity-60" />
                        <span className="text-xs font-semibold">Thư mục trống (0 bản)</span>
                      </div>
                    )}

                    {/* Matrix Size Badge */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 font-mono text-[11px] font-bold text-white backdrop-blur-xs">
                      <Grid size={11} /> {matrixSize}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-base font-black text-[#1f432b] group-hover:text-[#2d6a4f]">
                          {char.characterName}
                        </h3>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">
                          #{char.characterId}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-slate-500">
                        {char.description || "Chưa có mô tả cho nhân vật này."}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#eef5f0] pt-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-[#1f432b]">
                        <Layers size={13} className="text-[#2d6a4f]" />
                        {hasVersions ? `${char.totalVersions} phiên bản` : "0 phiên bản"}
                      </span>
                      {char.currentVersion ? (
                        <span className="rounded bg-[#e9f5ed] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1f432b]">
                          v{char.currentVersion.versionNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Chưa vẽ
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-[#d8e6dc] bg-white px-4 py-3 text-xs">
              <span className="text-slate-500">
                Trang <strong>{meta.page + 1}</strong> / {meta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!meta.hasPrevious}
                  onClick={() => setPage(Math.max(0, page - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <button
                  type="button"
                  disabled={!meta.hasNext}
                  onClick={() => setPage(page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
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
            setNotice(
              `Đã khởi tạo Character "${created.characterName}" (0 phiên bản). Hãy bấm vào thẻ để vẽ phiên bản đầu tiên!`,
            );
            setSelectedCharacter(created);
          }}
        />
      )}

      {/* Character Details Modal */}
      {selectedCharacter && (
        <CharacterDetailsModal
          key={selectedCharacter.characterId}
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onOpenPublish={(char, versions) => {
            setSelectedCharacter(null);
            setPublishTarget({ character: char, versions });
          }}
        />
      )}

      {/* Publish to Store Modal */}
      {publishTarget && (
        <PublishToStoreModal
          character={publishTarget.character}
          versions={publishTarget.versions}
          onClose={() => setPublishTarget(null)}
          onSuccess={(created) => {
            const char = publishTarget.character;
            setPublishTarget(null);
            setNotice(
              `Đã gửi "${created.productName}" (ID #${created.productId}) lên Store ở trạng thái UNPUBLISHED (chờ Manager duyệt) kèm Watermarked Preview!`,
            );
            setSelectedCharacter(char);
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
          <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
            Đang tải Designer Dashboard...
          </div>
        }
      >
        <DesignerDashboardContent />
      </Suspense>
    </DesignerCharactersProvider>
  );
}
