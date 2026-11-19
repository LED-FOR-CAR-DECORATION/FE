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
  Sparkles,
  Store,
  X,
} from "lucide-react";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import CreateCharacterModal from "@/features/designer/components/CreateCharacterModal";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import PublishToStoreModal from "@/features/designer/components/PublishToStoreModal";
import type { DesignerCharacterItem } from "@/lib/api/designerCharacters";
import { getCharacterArtwork } from "@/features/designer/character-artwork";

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
  const [publishCharacter, setPublishCharacter] = useState<DesignerCharacterItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Open Create Character modal if ?create=1 is passed from Sidebar
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

  const handleOpenStudio = (char: DesignerCharacterItem) => {
    router.push(`/designer/studio/${char.characterId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-studio-line bg-white p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-semibold text-studio-ink">Danh sách nhân vật</h1>
          <p className="mt-1 text-xs text-slate-500">
            Bấm trực tiếp vào thẻ nhân vật để mở Pixel Art Studio vẽ phiên bản mới, hoặc bấm{" "}
            <strong>Đăng bán (Publish)</strong> để quản lý phiên bản và đăng lên Store.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded bg-studio-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-studio-accent-hover"
        >
          <Plus size={17} /> Tạo nhân vật
        </button>
      </header>

      {/* Notice */}
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
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
        <form onSubmit={handleSearchSubmit} className="flex min-w-[260px] max-w-md flex-1 gap-2">
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
              className="w-full rounded border border-studio-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-studio-focus"
            />
          </div>
          <button
            type="submit"
            className="rounded border border-studio-line bg-white px-4 py-2 text-xs font-bold text-studio-ink hover:bg-slate-50"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Tổng cộng: <strong className="text-studio-ink">{meta.totalElements}</strong> nhân vật
          </span>
          <button
            type="button"
            onClick={() => void refreshCharacters()}
            className="inline-flex items-center gap-1.5 rounded border border-studio-line bg-white px-3 py-2 font-bold text-studio-ink hover:bg-slate-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Character Cards Grid */}
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-md border border-studio-line bg-white text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin text-studio-link" />
          <span>Đang tải danh sách Character...</span>
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-md border border-dashed border-studio-line bg-white p-14 text-center">
          <Sparkles size={36} className="mx-auto mb-3 text-studio-muted" />
          <h2 className="text-lg font-semibold text-studio-ink">Danh sách nhân vật đang rỗng</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex items-center gap-2 rounded bg-studio-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-studio-accent-hover"
          >
            <Plus size={16} /> Tạo nhân vật mới
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
                  onClick={() => handleOpenStudio(char)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenStudio(char);
                    }
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-md border border-studio-line bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-studio-accent hover:shadow-md"
                >
                  {/* Thumbnail Preview (Clicking goes to Pixel Art Studio) */}
                  <div className="relative aspect-square w-full overflow-hidden border-b border-studio-line bg-[#0f172a]">
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
                        <span className="text-xs font-semibold">Chưa có bản vẽ (0 bản)</span>
                      </div>
                    )}

                    {/* Matrix Size Badge */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 font-mono text-[11px] font-bold text-white backdrop-blur-xs">
                      <Grid size={11} /> {matrixSize}
                    </span>

                    {/* Hover Hint: Open Pixel Art Studio */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-studio-accent px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                        <Palette size={12} />
                        {hasVersions ? "Mở Studio vẽ phiên bản mới" : "Mở Studio tạo bản vẽ v1"}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-base font-semibold text-studio-ink group-hover:text-studio-link">
                          {char.characterName}
                        </h3>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">
                          #{char.characterId}
                        </span>
                      </div>
                      {linkedCommissionId(char.description) !== undefined && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          Commission #{linkedCommissionId(char.description)}
                        </span>
                      )}
                      <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-slate-500">
                        {stripCommissionMarker(char.description) || "Chưa có mô tả cho nhân vật này."}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-studio-line pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-studio-ink">
                          <Layers size={13} className="text-studio-link" />
                          {hasVersions ? `${char.totalVersions} phiên bản` : "0 phiên bản"}
                        </span>
                        {char.currentVersion ? (
                          <span className="rounded bg-studio-soft px-2 py-0.5 font-mono text-[11px] font-bold text-studio-ink">
                            v{char.currentVersion.versionNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-600">Chưa vẽ</span>
                        )}
                      </div>

                      {/* Publish to Store Button (Opens Publish Modal without navigating to Studio) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPublishCharacter(char);
                        }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-studio-accent bg-studio-wash px-3 py-2 text-xs font-bold text-studio-ink transition hover:bg-studio-accent hover:text-white"
                      >
                        <Store size={14} /> Đăng bán (Publish)
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between rounded border border-studio-line bg-white px-4 py-3 text-xs">
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
              `Đã khởi tạo nhân vật "${created.characterName}" (0 phiên bản). Bấm vào thẻ nhân vật để mở Pixel Art Studio vẽ bản đầu tiên!`,
            );
          }}
        />
      )}

      {/* Publish to Store Modal (Replaces old Character Details Modal) */}
      {publishCharacter && (
        <PublishToStoreModal
          key={publishCharacter.characterId}
          character={publishCharacter}
          onClose={() => setPublishCharacter(null)}
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
          <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
            Đang tải Danh sách nhân vật...
          </div>
        }
      >
        <DesignerDashboardContent />
      </Suspense>
    </DesignerCharactersProvider>
  );
}
