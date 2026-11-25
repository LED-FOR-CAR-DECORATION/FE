"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  Film,
  FolderHeart,
  Grid,
  Image as ImageIcon,
  Layers,
  LayoutList,
  Loader2,
  Maximize2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createCharacterVersion,
  deleteCharacterVersion,
  deleteDesignerCharacter,
  fetchCharacterVersions,
  fetchMyCharacters,
  formatDesignerApiError,
  isStoreCharacterType,
  readFileAsDataUrl,
  updateDesignerCharacter,
  uploadDesignerAssetFile,
  type CharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
  type PaginationMeta,
} from "@/lib/api/designerCharacters";

const PAGE_SIZE = 12;

function getCharacterArtwork(character: DesignerCharacterItem): string | null {
  if (character.currentVersion?.previewGifUrl) {
    return character.currentVersion.previewGifUrl;
  }
  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(`character_artwork_${character.characterId}`);
    if (cached) return cached;

    const lastArtwork = window.localStorage.getItem("last_studio_artwork");
    const lastName = window.localStorage.getItem("last_studio_name");
    const lastId = window.localStorage.getItem("last_studio_character_id");

    if (lastArtwork) {
      if (lastId && Number(lastId) === character.characterId) {
        return lastArtwork;
      }
      if (lastName && lastName.toLowerCase() === character.characterName.toLowerCase()) {
        return lastArtwork;
      }
    }
  }
  return null;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

type ViewMode = "grid" | "table";
type FilterType = "all" | "has-versions" | "no-versions";

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<DesignerCharacterItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [characterTypeFilter, setCharacterTypeFilter] = useState<"ALL" | CharacterType>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail & Versions Modal
  const [viewingItem, setViewingItem] = useState<DesignerCharacterItem | null>(null);
  const [itemVersions, setItemVersions] = useState<CharacterVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  // Quick upload inside detail modal
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Zoom image modal
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Edit Modal
  const [editingItem, setEditingItem] = useState<DesignerCharacterItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirm Modal
  const [deletingItem, setDeletingItem] = useState<DesignerCharacterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notice
  const [notice, setNotice] = useState<string | null>(null);

  // Load characters from API
  const loadCharacters = useCallback(
    async (
      targetPage: number,
      query: string,
      charType: "ALL" | CharacterType = characterTypeFilter,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMyCharacters({
          page: targetPage,
          size: PAGE_SIZE,
          query: query.trim() || undefined,
          characterType: charType === "ALL" ? undefined : charType,
        });
        setCharacters(res.items);
        setMeta(res.meta);
      } catch (err) {
        setError(formatDesignerApiError(err, "Không thể tải danh sách nhân vật."));
      } finally {
        setLoading(false);
      }
    },
    [characterTypeFilter],
  );

  useEffect(() => {
    void loadCharacters(page, activeQuery, characterTypeFilter);
  }, [loadCharacters, page, activeQuery, characterTypeFilter]);

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setActiveQuery(searchInput);
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setPage(0);
  };

  // Open Version History Modal
  const openVersionsModal = async (item: DesignerCharacterItem) => {
    setViewingItem(item);
    setItemVersions([]);
    setVersionError(null);
    setUploadNotice(null);
    setLoadingVersions(true);
    try {
      const vList = await fetchCharacterVersions(item.characterId);
      const sorted = [...vList].sort((a, b) => {
        if (b.versionNumber !== a.versionNumber) return b.versionNumber - a.versionNumber;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setItemVersions(sorted);
    } catch (err) {
      setVersionError(formatDesignerApiError(err, "Không thể tải danh sách phiên bản."));
    } finally {
      setLoadingVersions(false);
    }
  };

  // Quick upload image inside versions modal
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingItem) return;

    if (!file.type.startsWith("image/")) {
      setVersionError("Vui lòng chọn tệp hình ảnh (PNG, GIF, WEBP, JPG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVersionError("Dung lượng tệp không được vượt quá 10MB.");
      return;
    }

    setUploadingVersion(true);
    setVersionError(null);
    setUploadNotice(null);

    try {
      const uploaded = await uploadDesignerAssetFile(file, "CHARACTER_ASSET");
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl && typeof window !== "undefined") {
        window.localStorage.setItem(`character_artwork_${viewingItem.characterId}`, dataUrl);
      }

      await createCharacterVersion(viewingItem.characterId, {
        previewGifUrl: uploaded.publicUrl,
        frameCount: 1,
        frameDelayMs: 100,
        byteSize: Math.max(1, file.size),
        isCurrent: true,
      });

      setUploadNotice("Tải ảnh và tạo phiên bản mới thành công!");
      // Reload versions and catalog
      const updatedVersions = await fetchCharacterVersions(viewingItem.characterId);
      setItemVersions(updatedVersions);
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setVersionError(formatDesignerApiError(err, "Tải ảnh lên thất bại. Vui lòng thử lại."));
    } finally {
      setUploadingVersion(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  // Handle Edit
  const openEdit = (item: DesignerCharacterItem) => {
    setEditingItem(item);
    setEditName(item.characterName);
    setEditDescription(item.description ?? "");
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || savingEdit) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Vui lòng nhập tên nhân vật.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    try {
      await updateDesignerCharacter(editingItem.characterId, {
        characterName: trimmed,
        description: editDescription.trim() || undefined,
      });
      setNotice(`Đã cập nhật nhân vật "${trimmed}" (#${editingItem.characterId}).`);
      setEditingItem(null);
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setEditError(formatDesignerApiError(err, "Không thể cập nhật nhân vật."));
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteDesignerCharacter(deletingItem.characterId);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`character_artwork_${deletingItem.characterId}`);
      }
      setNotice(`Đã xóa nhân vật "${deletingItem.characterName}" (#${deletingItem.characterId}).`);
      setDeletingItem(null);
      await loadCharacters(page, activeQuery);
    } catch (err) {
      setDeleteError(formatDesignerApiError(err, "Không thể xóa nhân vật này."));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered in memory for instant tab switching
  const displayedCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (filterType === "has-versions") return c.totalVersions > 0;
      if (filterType === "no-versions") return c.totalVersions === 0;
      return true;
    });
  }, [characters, filterType]);

  // Summary counts
  const totalWithVersions = useMemo(
    () => characters.filter((c) => c.totalVersions > 0).length,
    [characters],
  );
  const totalNoVersions = useMemo(
    () => characters.filter((c) => c.totalVersions === 0).length,
    [characters],
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf7ef] text-[#198653]">
              <Sparkles size={20} />
            </span>
            <h1 className="text-2xl font-black text-[#173b28]">
              Bộ Sưu Tập Nhân Vật Của Bạn
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#66736b]">
            Quản lý toàn bộ danh mục nhân vật pixel art, xem lại hình ảnh animation GIF và tải phiên bản lên Store.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadCharacters(page, activeQuery)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce8df] bg-white px-3 py-2 text-xs font-bold text-[#26352f] shadow-sm transition hover:bg-[#edf7ef] disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <Link
            href="/designer/store-uploads"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#3f9660] bg-[#eefaf1] px-3.5 py-2 text-xs font-black text-[#198653] shadow-sm transition hover:bg-[#d9f5df]"
          >
            <Store size={15} />
            Đăng tải cho Store
          </Link>

          <Link
            href="/designer/characters"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-4 py-2 text-xs font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd]"
          >
            <Palette size={15} />
            + Mở Studio Vẽ Mới
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <FolderHeart size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng số nhân vật
            </p>
            <p className="text-2xl font-black text-slate-900">
              {meta.totalElements}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Film size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đã có bản vẽ / GIF
            </p>
            <p className="text-2xl font-black text-slate-900">
              {totalWithVersions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chưa có phiên bản
            </p>
            <p className="text-2xl font-black text-slate-900">
              {totalNoVersions}
            </p>
          </div>
        </div>
      </div>

      {/* SUCCESS NOTICE */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân vật theo tên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-[#198653] focus:bg-white sm:w-72"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#198653] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#12633f]"
          >
            Tìm
          </button>
          {activeQuery && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy lọc
            </button>
          )}
        </form>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Character Type Pills */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
            {(
              [
                { value: "ALL" as const, label: "Mọi loại" },
                { value: "STORE" as CharacterType, label: "Bán Store" },
                { value: "COMMISSION" as CharacterType, label: "Commission" },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPage(0);
                  setCharacterTypeFilter(opt.value);
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  characterTypeFilter === opt.value
                    ? "bg-white text-[#198653] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-2.5 py-1 transition ${
                filterType === "all"
                  ? "bg-white text-[#198653] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({characters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("has-versions")}
              className={`rounded-lg px-2.5 py-1 transition ${
                filterType === "has-versions"
                  ? "bg-white text-[#198653] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Có GIF ({totalWithVersions})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("no-versions")}
              className={`rounded-lg px-2.5 py-1 transition ${
                filterType === "no-versions"
                  ? "bg-white text-[#198653] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chưa có ({totalNoVersions})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-[#198653] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chế độ Lưới (Showcase)"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-[#198653] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Chế độ Bảng"
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* CONTENT: LOADING */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#198653]" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Đang tải danh sách nhân vật...
          </p>
        </div>
      ) : displayedCharacters.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dce8df] bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#198653]">
            <Palette size={28} />
          </div>
          <h3 className="mt-3 font-black text-[#173b28]">
            {activeQuery
              ? `Không tìm thấy nhân vật nào phù hợp với "${activeQuery}"`
              : "Chưa có nhân vật nào trong bộ sưu tập"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-[#66736b]">
            {activeQuery
              ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
              : "Hãy bắt đầu bằng cách mở Studio và vẽ nhân vật pixel art đầu tiên của bạn!"}
          </p>
          <div className="mt-5 flex items-center gap-3">
            {activeQuery ? (
              <button
                type="button"
                onClick={handleResetSearch}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            ) : (
              <Link
                href="/designer/characters"
                className="inline-flex items-center gap-2 rounded-xl bg-[#198653] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#12633f]"
              >
                <Plus size={15} />
                Vẽ Nhân Vật Ngay
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* 1. GRID / GALLERY VIEW */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {displayedCharacters.map((c) => {
            const artwork = getCharacterArtwork(c);
            const hasArtwork = Boolean(artwork);

            return (
              <div
                key={c.characterId}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#198653] hover:shadow-md"
              >
                <div>
                  {/* Image Canvas Box with Pixel Art Checkerboard pattern */}
                  <div className="relative aspect-square w-full overflow-hidden border-b border-slate-100 bg-[#f4f7f5]">
                    {/* Background checkerboard grid */}
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: `linear-gradient(45deg, #e6ede8 25%, transparent 25%), linear-gradient(-45deg, #e6ede8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e6ede8 75%), linear-gradient(-45deg, transparent 75%, #e6ede8 75%)`,
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      }}
                    />

                    {hasArtwork ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artwork!}
                        alt={c.characterName}
                        className="relative h-full w-full object-contain p-3 transition-transform duration-300 [image-rendering:pixelated] group-hover:scale-105"
                      />
                    ) : (
                      <div className="relative flex h-full w-full flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={32} />
                        <span className="mt-1 text-[11px] font-semibold text-slate-400">
                          Chưa có bản vẽ GIF
                        </span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                      <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                        #{c.characterId}
                      </span>
                    </div>

                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                      {c.currentVersion ? (
                        <span className="rounded-lg border border-emerald-300 bg-emerald-100/90 px-2 py-0.5 text-[10px] font-black text-emerald-900 backdrop-blur-sm">
                          v{c.currentVersion.versionNumber}
                        </span>
                      ) : (
                        <span className="rounded-lg border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-900 backdrop-blur-sm">
                          Chưa có GIF
                        </span>
                      )}
                    </div>

                    {/* Zoom button on hover */}
                    {hasArtwork && (
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            url: artwork!,
                            title: c.characterName,
                          })
                        }
                        className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-700 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-black group-hover:opacity-100"
                        title="Xem phóng to ảnh"
                      >
                        <Maximize2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Character Info */}
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate font-black text-slate-900" title={c.characterName}>
                        {c.characterName}
                      </h3>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {isStoreCharacterType(c.characterType) ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                          Bán Store
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          {c.commissionId ? `Commission #${c.commissionId}` : "Commission"}
                        </span>
                      )}
                    </div>

                    <p
                      className="mt-1 line-clamp-2 text-xs text-slate-500"
                      title={c.description ?? "Chưa có mô tả."}
                    >
                      {c.description || "Chưa có mô tả cho nhân vật này."}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="font-semibold text-slate-500">
                        Tổng phiên bản:{" "}
                        <strong className="text-slate-800">{c.totalVersions}</strong>
                      </span>
                      {c.totalVersions > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 size={12} /> Đã sẵn sàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                          <Clock size={12} /> Cần nạp file
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 p-2.5">
                  <button
                    type="button"
                    onClick={() => openVersionsModal(c)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#198653] hover:text-[#198653]"
                  >
                    <Layers size={13} />
                    Phiên bản ({c.totalVersions})
                  </button>

                  {isStoreCharacterType(c.characterType) && (
                    <Link
                      href={`/designer/store-uploads?characterId=${c.characterId}`}
                      className="inline-flex items-center justify-center rounded-lg border border-[#3f9660] bg-[#eefaf1] p-1.5 text-[#198653] transition hover:bg-[#d8f5df]"
                      title="Đăng tải phiên bản Store"
                    >
                      <Store size={14} />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    title="Chỉnh sửa thông tin"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingItem(c)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                    title="Xóa nhân vật"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Hình ảnh</th>
                  <th className="px-4 py-3">Tên & Mô tả</th>
                  <th className="px-4 py-3">Phiên bản hiện hành</th>
                  <th className="px-4 py-3">Tổng versions</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCharacters.map((c) => {
                  const artwork = getCharacterArtwork(c);
                  const hasArtwork = Boolean(artwork);

                  return (
                    <tr key={c.characterId} className="transition hover:bg-[#f9fdfa]">
                      <td className="whitespace-nowrap px-4 py-3 font-black text-slate-800">
                        #{c.characterId}
                      </td>

                      <td className="px-4 py-3">
                        <div
                          onClick={() =>
                            hasArtwork &&
                            setZoomedImage({ url: artwork!, title: c.characterName })
                          }
                          className={`relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-[#f4f7f5] ${
                            hasArtwork ? "cursor-pointer" : ""
                          }`}
                        >
                          {hasArtwork ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={artwork!}
                              alt={c.characterName}
                              className="h-full w-full object-contain p-1 [image-rendering:pixelated]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900">{c.characterName}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isStoreCharacterType(c.characterType)
                                ? "bg-sky-100 text-sky-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {isStoreCharacterType(c.characterType)
                              ? "Store"
                              : c.commissionId
                                ? `Commission #${c.commissionId}`
                                : "Commission"}
                          </span>
                        </div>
                        <p className="max-w-xs truncate text-[11px] text-slate-500">
                          {c.description || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {c.currentVersion ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            Version {c.currentVersion.versionNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                            Chưa có bản vẽ
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {c.totalVersions} phiên bản
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(c.createdAt)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openVersionsModal(c)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm hover:border-[#198653] hover:text-[#198653]"
                          >
                            Chi tiết
                          </button>
                          {isStoreCharacterType(c.characterType) && (
                            <Link
                              href={`/designer/store-uploads?characterId=${c.characterId}`}
                              className="rounded-lg border border-[#3f9660] bg-[#eefaf1] px-2.5 py-1 text-xs font-bold text-[#198653] hover:bg-[#d8f5df]"
                            >
                              Đăng Store
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                            title="Sửa"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(c)}
                            className="rounded-lg border border-red-200 p-1 text-red-600 hover:bg-red-50"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#e5eee6] pt-4 text-xs font-bold text-[#26352f]">
          <p>
            Hiển thị trang {meta.page + 1} / {meta.totalPages} ({meta.totalElements} nhân vật)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!meta.hasPrevious}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-[#dce8df] bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#edf7ef] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trang trước
            </button>
            <button
              type="button"
              disabled={!meta.hasNext}
              onClick={() => setPage((prev) => prev + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#dce8df] bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#edf7ef] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW VERSIONS & DETAILS */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Layers size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    #{viewingItem.characterId} · {viewingItem.characterName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lịch sử các phiên bản đồ họa &amp; hoạt ảnh đã đăng tải
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto p-5">
              {viewingItem.description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Mô tả: </span>
                  {viewingItem.description}
                </div>
              )}

              {uploadNotice && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  {uploadNotice}
                </div>
              )}

              {versionError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={15} className="text-red-600" />
                  {versionError}
                </div>
              )}

              {/* Version List */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Danh sách phiên bản ({itemVersions.length})
                  </h4>
                  {isStoreCharacterType(viewingItem.characterType) && (
                    <Link
                      href={`/designer/store-uploads?characterId=${viewingItem.characterId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#198653] hover:underline"
                    >
                      <Store size={13} /> Đi tới trang Đăng tải Store
                    </Link>
                  )}
                </div>

                {loadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Loader2 size={24} className="animate-spin text-[#198653]" />
                    <span className="mt-2 text-xs">Đang nạp phiên bản...</span>
                  </div>
                ) : itemVersions.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-6 text-center text-xs text-amber-800">
                    <p className="font-bold">Nhân vật này chưa có phiên bản animation nào.</p>
                    <p className="mt-1 text-slate-500">
                      Bạn có thể nạp tệp ảnh/GIF từ máy tính ngay bên dưới hoặc dùng trang Đăng tải Store.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {itemVersions.map((v) => (
                      <div
                        key={v.versionId}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                      >
                        {/* Preview */}
                        <div
                          onClick={() =>
                            v.previewGifUrl &&
                            setZoomedImage({
                              url: v.previewGifUrl,
                              title: `${viewingItem.characterName} - Version ${v.versionNumber}`,
                            })
                          }
                          className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          {v.previewGifUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.previewGifUrl}
                              alt={`v${v.versionNumber}`}
                              className="h-full w-full object-contain [image-rendering:pixelated]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>

                        {/* Specs */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              Version {v.versionNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (ID #{v.versionId})
                            </span>
                            {v.isCurrent && (
                              <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800">
                                Bản hiện hành
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {v.frameCount} khung hình · {v.frameDelayMs}ms/khung · {(v.byteSize / 1024).toFixed(1)} KB
                          </p>

                          <div className="mt-1.5">
                            {v.isListedOnStore ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✓ Đang bán trên Store (Sản phẩm #{v.productId})
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                Chờ Manager sử dụng
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400">
                          {formatDate(v.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick upload section */}
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-center">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQuickUpload}
                  className="hidden"
                />
                <p className="text-xs font-bold text-emerald-950">
                  Tải trực tiếp ảnh/GIF từ máy tính cho nhân vật này
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Hỗ trợ PNG, GIF, WEBP dung lượng tối đa 10MB
                </p>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploadingVersion}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-[#3f9660] bg-[#eefaf1] px-3.5 py-1.5 text-xs font-black text-[#198653] shadow-sm transition hover:bg-[#d8f5df] disabled:opacity-50"
                >
                  {uploadingVersion ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  {uploadingVersion ? "Đang tải lên..." : "Chọn tệp tải lên"}
                </button>
                <Link
                  href="/designer/characters"
                  className="mt-2.5 ml-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700"
                >
                  <Plus size={13} />
                  Vẽ bản mới trên Studio
                </Link>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ZOOM IMAGE */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] max-w-[85vw] flex-col items-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/40"
            >
              <X size={18} />
            </button>

            <h3 className="mb-4 text-sm font-bold text-white">{zoomedImage.title}</h3>

            {/* Checkerboard container */}
            <div
              className="relative max-h-[60vh] max-w-[60vw] overflow-hidden rounded-xl border border-slate-600 bg-slate-800 p-4"
              style={{
                backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="max-h-[55vh] max-w-full object-contain [image-rendering:pixelated]"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT CHARACTER */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900">
                Chỉnh sửa nhân vật #{editingItem.characterId}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {editError && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {editError}
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Tên nhân vật <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#198653]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Mô tả nhân vật
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#198653]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#198653] px-4 py-2 text-xs font-bold text-white hover:bg-[#12633f] disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={13} className="animate-spin" /> : null}
                  {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRM */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Trash2 size={24} />
            </div>
            <h3 className="mt-4 text-base font-black text-slate-900">
              Xóa nhân vật #{deletingItem.characterId}?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Bạn có chắc chắn muốn xóa nhân vật <strong>"{deletingItem.characterName}"</strong>?
              Thao tác này sẽ xóa hồ sơ nhân vật và các phiên bản hoạt ảnh chưa niêm yết.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

