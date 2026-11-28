"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid,
  History,
  Layers,
  Loader2,
  Lock,
  Palette,
  RefreshCw,
  Search,
  Store,
  Tag,
  X,
} from "lucide-react";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import { useAdaptiveListRows } from "@/features/designer/hooks/useResponsiveGrid";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import { fetchStoreTags } from "@/lib/api/products";
import { fetchAllPages } from "@/lib/api/paging";
import {
  fetchMyCharacters,
  formatDesignerApiError,
  isStoreCharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import type { TagItem } from "@/api_client";

function getVersionArtwork(
  version: CharacterVersionItem | null,
  characterId: number,
  isLatest: boolean,
): string | null {
  if (!version) return null;
  if (typeof window !== "undefined") {
    const versionCached = window.localStorage.getItem(
      `character_version_artwork_${version.versionId}`,
    );
    if (versionCached) return versionCached;
  }
  if (version.previewGifUrl) return version.previewGifUrl;
  if (isLatest && typeof window !== "undefined") {
    const charCached = window.localStorage.getItem(`character_artwork_${characterId}`);
    if (charCached) return charCached;
  }
  return null;
}

function DesignerPublishWorkspace() {
  const searchParams = useSearchParams();
  const requestedCharacterIdParam = Number(searchParams?.get("characterId"));
  const requestedCharacterId =
    Number.isFinite(requestedCharacterIdParam) && requestedCharacterIdParam > 0
      ? requestedCharacterIdParam
      : null;

  const {
    versionsByCharacter,
    loadingVersions,
    loadVersions,
    refreshCharacters,
    getMatrixSize,
    publishVersionToStore,
  } = useDesignerCharacters();

  const { rows: charPageSize, ready: charLayoutReady } = useAdaptiveListRows({
    estimatedRowHeight: 64,
    rowGap: 6,
    chromeHeight: 300,
    minRows: 3,
    maxRows: 8,
    defaultRows: 4,
  });
  const { rows: versionPageSize } = useAdaptiveListRows({
    estimatedRowHeight: 58,
    rowGap: 6,
    chromeHeight: 325,
    minRows: 3,
    maxRows: 8,
    defaultRows: 5,
  });

  const [ownCharacters, setOwnCharacters] = useState<DesignerCharacterItem[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [versionPage, setVersionPage] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<DesignerCharacterItem | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagsOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setTagsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTagsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tagsOpen]);

  const [versionError, setVersionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locallyPublishedIds, setLocallyPublishedIds] = useState<Set<number>>(new Set());

  const loadOwnCharacters = useCallback(async () => {
    setLoadingCharacters(true);
    setCharactersError(null);
    try {
      const all = await fetchAllPages(async (p) => {
        const res = await fetchMyCharacters({ page: p, size: 100 });
        return { items: res.items, totalPages: res.meta.totalPages };
      });
      // Exclude commission characters (both characterType === COMMISSION, commissionId, and legacy [COMMISSION #id] marker)
      const personalOnly = all.filter(
        (char) =>
          isStoreCharacterType(char.characterType) &&
          char.commissionId == null &&
          linkedCommissionId(char.description) === undefined,
      );
      setOwnCharacters(personalOnly);
    } catch (err) {
      setCharactersError(
        formatDesignerApiError(err, "Không thể tải danh sách nhân vật của bạn."),
      );
    } finally {
      setLoadingCharacters(false);
    }
  }, []);

  useEffect(() => {
    void loadOwnCharacters();
  }, [loadOwnCharacters]);

  const filteredCharacters = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return ownCharacters;
    return ownCharacters.filter(
      (char) =>
        char.characterName.toLowerCase().includes(q) ||
        (char.description ?? "").toLowerCase().includes(q) ||
        String(char.characterId).includes(q),
    );
  }, [ownCharacters, appliedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / charPageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedCharacters = useMemo(
    () =>
      filteredCharacters.slice(
        safePage * charPageSize,
        (safePage + 1) * charPageSize,
      ),
    [filteredCharacters, safePage, charPageSize],
  );
  const charRangeStart =
    filteredCharacters.length === 0 ? 0 : safePage * charPageSize + 1;
  const charRangeEnd = Math.min(
    filteredCharacters.length,
    (safePage + 1) * charPageSize,
  );

  // Clamp current page when adaptive pageSize grows on viewport resize
  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  // Load Store tags once
  useEffect(() => {
    let cancelled = false;
    setIsLoadingTags(true);
    fetchStoreTags()
      .then((tags) => {
        if (!cancelled) setAvailableTags(tags);
      })
      .catch(() => {
        // Tags are optional
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTags(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve initial selection from ?characterId (non-commission only) or first eligible character
  useEffect(() => {
    if (requestedCharacterId && charLayoutReady) {
      const requestedIndex = ownCharacters.findIndex(
        (c) => c.characterId === requestedCharacterId,
      );
      if (requestedIndex >= 0) {
        setSelectedCharacter(ownCharacters[requestedIndex]);
        setPage(Math.floor(requestedIndex / charPageSize));
        return;
      }
    }

    if (
      ownCharacters.length > 0 &&
      (!selectedCharacter ||
        !ownCharacters.some((c) => c.characterId === selectedCharacter.characterId))
    ) {
      setSelectedCharacter(ownCharacters[0]);
    } else if (ownCharacters.length === 0) {
      setSelectedCharacter(null);
    }
  }, [requestedCharacterId, charLayoutReady, charPageSize, ownCharacters, selectedCharacter]);

  // Load versions whenever selected character changes
  useEffect(() => {
    if (!selectedCharacter) return;
    let cancelled = false;
    setVersionError(null);
    setSubmitError(null);
    setPublishSuccess(null);
    setSelectedVersionId(null);
    setVersionPage(0);
    setProductName(selectedCharacter.characterName);
    setDescription(stripCommissionMarker(selectedCharacter.description) ?? "");
    setSelectedTagIds([]);

    loadVersions(selectedCharacter.characterId).catch((err) => {
      if (!cancelled) {
        setVersionError(formatDesignerApiError(err, "Không thể tải danh sách phiên bản."));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCharacter, loadVersions]);

  const versions = useMemo(
    () => (selectedCharacter ? versionsByCharacter[selectedCharacter.characterId] ?? [] : []),
    [selectedCharacter, versionsByCharacter],
  );
  const versionTotalPages = Math.max(1, Math.ceil(versions.length / versionPageSize));
  const safeVersionPage = Math.min(versionPage, versionTotalPages - 1);
  const pagedVersions = useMemo(
    () =>
      versions.slice(
        safeVersionPage * versionPageSize,
        (safeVersionPage + 1) * versionPageSize,
      ),
    [versions, safeVersionPage, versionPageSize],
  );

  useEffect(() => {
    if (versionPage > 0 && versionPage >= versionTotalPages) {
      setVersionPage(Math.max(0, versionTotalPages - 1));
    }
  }, [versionPage, versionTotalPages]);
  const isVersionsLoading = Boolean(
    selectedCharacter &&
      (loadingVersions[selectedCharacter.characterId] ||
        !versionsByCharacter[selectedCharacter.characterId]),
  );

  // Default to newest version when versions finish loading
  useEffect(() => {
    if (!selectedCharacter) return;
    if (versions.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    const exists = versions.some((v) => v.versionId === selectedVersionId);
    if (!exists) {
      const newest = versions[0];
      setSelectedVersionId(newest.versionId);
      setProductName(`${selectedCharacter.characterName} (v${newest.versionNumber})`);
    }
  }, [versions, selectedVersionId, selectedCharacter]);

  const selectedVersion =
    versions.find((v) => v.versionId === selectedVersionId) ?? versions[0] ?? null;
  const isSelectedVersionLatest =
    Boolean(selectedVersion) && versions[0]?.versionId === selectedVersion?.versionId;
  const isSelectedVersionListed = Boolean(
    selectedVersion &&
      (selectedVersion.isListedOnStore || locallyPublishedIds.has(selectedVersion.versionId)),
  );
  const selectedMatrixSize = selectedCharacter
    ? getMatrixSize(selectedCharacter.characterId)
    : "32x32";
  const selectedArtwork =
    selectedCharacter && selectedVersion
      ? getVersionArtwork(selectedVersion, selectedCharacter.characterId, isSelectedVersionLatest)
      : null;

  const handleSelectCharacter = (char: DesignerCharacterItem) => {
    setSelectedCharacter(char);
  };

  const handleSelectVersion = (ver: CharacterVersionItem) => {
    setSelectedVersionId(ver.versionId);
    if (selectedCharacter) {
      setProductName(`${selectedCharacter.characterName} (v${ver.versionNumber})`);
    }
    setSubmitError(null);
    setPublishSuccess(null);
  };

  const toggleTag = (tagId?: number) => {
    if (!tagId) return;
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setAppliedQuery(searchInput);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;
    setSubmitError(null);
    setPublishSuccess(null);

    if (!selectedVersion) {
      setSubmitError("Nhân vật này chưa có phiên bản hoàn thiện để đăng bán.");
      return;
    }
    if (isSelectedVersionListed) {
      setSubmitError("Phiên bản đang chọn đã được đăng lên Store trước đó.");
      return;
    }

    const trimmedName =
      productName.trim() || `${selectedCharacter.characterName} (v${selectedVersion.versionNumber})`;

    setIsSubmitting(true);
    try {
      const created = await publishVersionToStore({
        character: selectedCharacter,
        version: selectedVersion,
        productName: trimmedName,
        description: description.trim() || undefined,
        tagIds: selectedTagIds,
      });

      setLocallyPublishedIds((prev) => {
        const next = new Set(prev);
        next.add(selectedVersion.versionId);
        return next;
      });
      setPublishSuccess(
        `Đã gửi yêu cầu đăng bán “${created.productName ?? trimmedName}” (v${selectedVersion.versionNumber})! Manager sẽ định giá và duyệt hiển thị trên Store.`,
      );
    } catch (err) {
      setSubmitError(
        formatDesignerApiError(
          err,
          "Không thể gửi yêu cầu đăng bán. Vui lòng kiểm tra lại thông tin.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-112px)] flex-col gap-3">
      {/* Slim Neo-Brutalist Top Bar */}
      <header className="neo-box-no-hover flex shrink-0 flex-wrap items-center justify-between gap-2.5 bg-white px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
            <Store size={16} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-black uppercase tracking-tight text-black sm:text-base">
              Đăng bán lên Store
            </h1>
            <p className="text-[11px] font-medium text-text-muted">
              Chọn nhân vật Store và phiên bản đã chốt để gửi Manager duyệt giá.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/designer/characters"
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
          >
            <Layers size={14} /> Danh sách nhân vật
          </Link>
          <button
            type="button"
            onClick={() => {
              void loadOwnCharacters();
              void refreshCharacters();
            }}
            disabled={loadingCharacters}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
          >
            <RefreshCw size={14} className={loadingCharacters ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </header>

      {charactersError && (
        <div
          role="alert"
          className="neo-box-no-hover flex items-center gap-2 border-l-8 border-l-red-600 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700"
        >
          <AlertCircle size={16} />
          <span>{charactersError}</span>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* LEFT COLUMN: Adaptive-height Character Selector with bottom-pinned pagination */}
        <section className="neo-box-no-hover flex min-w-0 flex-col bg-white p-3.5 lg:col-span-4">
          <form onSubmit={handleSearchSubmit} className="mb-2.5 flex shrink-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhân vật..."
                aria-label="Tìm nhân vật để đăng bán"
                className="w-full min-w-0 border-2 border-black bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn-primary shrink-0 px-3 py-1.5 text-xs font-black uppercase"
            >
              Tìm
            </button>
          </form>

          {loadingCharacters ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-xs font-bold text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              <span>Đang tải danh sách nhân vật...</span>
            </div>
          ) : pagedCharacters.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-black bg-[#f7fbf8] p-5 text-center text-xs text-text-muted">
              <Layers size={26} className="mb-2 opacity-50" />
              <p className="font-black uppercase text-black">Không có nhân vật cá nhân nào phù hợp.</p>
              <Link
                href="/designer/characters"
                className="mt-2.5 font-black text-primary-ink underline"
              >
                Về Danh sách nhân vật
              </Link>
            </div>
          ) : (
            <div className="flex-1 space-y-1.5">
              {pagedCharacters.map((char) => {
                const isActive = selectedCharacter?.characterId === char.characterId;
                const thumb = getCharacterArtwork(char);
                const matrix = getMatrixSize(char.characterId);

                return (
                  <button
                    key={char.characterId}
                    type="button"
                    onClick={() => handleSelectCharacter(char)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 border-2 p-2 text-left transition ${
                      isActive
                        ? "border-black bg-[#eef8f0] shadow-[3px_3px_0_0_#000]"
                        : "border-black/25 bg-white hover:border-black"
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={char.characterName}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-[10px] text-slate-500">
                          0 bản
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-black">
                          {char.characterName}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-text-muted">
                          #{char.characterId}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="border border-black bg-gray-100 px-1.5 py-0.5 font-mono font-bold text-black">
                          {matrix}
                        </span>
                        <span
                          className={`border border-black px-1.5 py-0.5 font-black ${
                            char.totalVersions > 0
                              ? "bg-primary text-black"
                              : "bg-amber-100 text-black"
                          }`}
                        >
                          {char.totalVersions} phiên bản
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredCharacters.length > 0 && (
            <div className="mt-auto shrink-0 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-black pt-2.5 text-xs">
                <span className="font-semibold text-black/80">
                  <strong className="font-mono text-black">
                    {charRangeStart}–{charRangeEnd}
                  </strong>{" "}
                  / {filteredCharacters.length} · Trang{" "}
                  <strong className="font-mono text-black">{safePage + 1}</strong>/{totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 0}
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase disabled:opacity-40"
                  >
                    <ChevronLeft size={12} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[11px] font-black uppercase disabled:opacity-40"
                  >
                    Sau <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Version Selector & Editable Publish Form */}
        <section className="neo-box-no-hover flex min-w-0 flex-col bg-white p-4 lg:col-span-8">
          {!selectedCharacter ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-text-muted">
              <Store size={32} className="mb-2 opacity-40" />
              <p className="font-black uppercase text-black">
                Chọn một nhân vật ở cột bên trái để chỉnh sửa thông tin đăng bán.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="flex flex-1 flex-col gap-3">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black uppercase tracking-tight text-black">
                    {selectedCharacter.characterName}
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-text-muted">
                    Mã #{selectedCharacter.characterId} · Ma trận {selectedMatrixSize}
                  </p>
                </div>

                <Link
                  href={`/designer/studio/${selectedCharacter.characterId}`}
                  className="btn-secondary inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase"
                >
                  <Palette size={14} /> Chỉnh sửa trên Studio
                </Link>
              </div>

              {publishSuccess && (
                <div
                  role="status"
                  className="flex shrink-0 items-start gap-2 border-2 border-black bg-[#eef8f0] p-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary-ink" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              {(submitError || versionError) && (
                <div
                  role="alert"
                  className="flex shrink-0 items-start gap-2 border-2 border-black bg-red-50 p-2.5 text-xs font-bold text-red-700 shadow-[2px_2px_0_0_#000]"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{submitError || versionError}</span>
                </div>
              )}

              {isVersionsLoading ? (
                <div className="flex flex-1 items-center justify-center gap-2 border-2 border-black bg-[#f7fbf8] text-xs font-bold text-text-muted">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang tải các phiên bản của nhân vật...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-black bg-[#f7fbf8] p-6 text-center">
                  <Layers size={30} className="mb-2 text-black/40" />
                  <p className="text-sm font-black uppercase text-black">
                    Nhân vật này chưa có phiên bản hoàn thiện nào
                  </p>
                  <p className="mt-1 max-w-md text-xs font-medium text-text-muted">
                    Hãy vào Pixel Art Studio để hoàn thành bản vẽ và bấm <strong>Chốt v1</strong> trước khi đăng bán lên Store.
                  </p>
                  <Link
                    href={`/designer/studio/${selectedCharacter.characterId}`}
                    className="btn-primary mt-3 inline-flex items-center gap-2 text-xs font-black uppercase"
                  >
                    <Palette size={14} /> Mở Studio để vẽ v1
                  </Link>
                </div>
              ) : (
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-12">
                  {/* Preview + Form */}
                  <div className="flex min-w-0 flex-col gap-2.5 md:col-span-7">
                    <div className="relative flex min-h-[140px] flex-1 flex-col items-center justify-center border-2 border-black bg-[#090d14] px-3 py-2.5 text-center shadow-[4px_4px_0_0_#000]">
                      <div className="mb-1.5 flex w-full shrink-0 flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-[10px] font-black text-black">
                            <Grid size={10} /> {selectedMatrixSize}
                          </span>
                          {selectedVersion && (
                            <span className="border border-black bg-primary px-2 py-0.5 font-mono text-[10px] font-black text-black">
                              v{selectedVersion.versionNumber}
                              {isSelectedVersionLatest ? " · Mới nhất" : ""}
                            </span>
                          )}
                        </div>

                        {isSelectedVersionListed && (
                          <span className="inline-flex items-center gap-1 border border-black bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            <Lock size={10} /> Đã đăng Store
                          </span>
                        )}
                      </div>

                      {selectedArtwork ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedArtwork}
                          alt={`${selectedCharacter.characterName} v${selectedVersion?.versionNumber}`}
                          className="min-h-0 w-full max-w-[200px] flex-1 object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-4 text-slate-400">
                          <Layers size={26} className="opacity-60" />
                          <span className="text-xs font-bold">Chưa có ảnh xem trước</span>
                        </div>
                      )}

                      {selectedVersion && (
                        <div className="mt-1.5 flex shrink-0 flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300">
                          <span>{selectedVersion.frameCount ?? 1} frames</span>
                          <span>•</span>
                          <span>
                            {selectedVersion.byteSize
                              ? `${Math.max(1, Math.round(selectedVersion.byteSize / 1024))} KB`
                              : "—"}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(selectedVersion.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 space-y-2.5 border-2 border-black bg-[#f7fbf8] p-3">
                      <div>
                        <label
                          htmlFor="publish-product-name"
                          className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                        >
                          Tên sản phẩm trên Store <span className="text-red-600">*</span>
                        </label>
                        <input
                          id="publish-product-name"
                          type="text"
                          required
                          maxLength={255}
                          disabled={isSelectedVersionListed || isSubmitting}
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          className="w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none disabled:bg-gray-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="publish-product-desc"
                          className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                        >
                          Mô tả sản phẩm
                        </label>
                        <textarea
                          id="publish-product-desc"
                          rows={2}
                          disabled={isSelectedVersionListed || isSubmitting}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Mô tả phong cách, hiệu ứng, điểm nổi bật của nhân vật..."
                          className="w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-medium text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none disabled:bg-gray-100"
                        />
                      </div>

                      {!isLoadingTags && availableTags.length > 0 && (
                        <div ref={tagsDropdownRef} className="relative">
                          <label className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-black">
                            <Tag size={11} /> Thẻ phân loại (Tags)
                          </label>
                          <button
                            type="button"
                            disabled={isSelectedVersionListed || isSubmitting}
                            aria-expanded={tagsOpen}
                            onClick={() => setTagsOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between gap-2 border-2 border-black bg-white px-2.5 py-1.5 text-left text-xs font-bold text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
                          >
                            <span className="truncate">
                              {selectedTagIds.length === 0
                                ? "Chọn thẻ phân loại (tùy chọn)..."
                                : availableTags
                                    .filter((t) => t.tagId != null && selectedTagIds.includes(t.tagId))
                                    .map((t) => t.name)
                                    .join(", ")}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {selectedTagIds.length > 0 && (
                                <span className="border border-black bg-primary px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                                  {selectedTagIds.length}
                                </span>
                              )}
                              <ChevronDown
                                size={14}
                                className={`transition-transform ${tagsOpen ? "rotate-180" : ""}`}
                              />
                            </span>
                          </button>

                          {tagsOpen && (
                            <div className="absolute bottom-full left-0 right-0 z-30 mb-1 border-2 border-black bg-white p-2.5 shadow-[4px_4px_0_0_#000]">
                              <div className="mb-2 flex items-center justify-between border-b border-black/15 pb-1.5 text-[11px]">
                                <span className="font-black uppercase text-black">
                                  Chọn thẻ ({selectedTagIds.length}/{availableTags.length})
                                </span>
                                <div className="flex items-center gap-2">
                                  {selectedTagIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTagIds([])}
                                      className="inline-flex items-center gap-0.5 font-bold text-red-700 hover:underline"
                                    >
                                      <X size={11} /> Xóa hết
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setTagsOpen(false)}
                                    className="border border-black bg-primary px-2 py-0.5 font-black text-black"
                                  >
                                    Xong
                                  </button>
                                </div>
                              </div>
                              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                                {availableTags.map((tag) => {
                                  const id = tag.tagId;
                                  const active = id != null && selectedTagIds.includes(id);
                                  return (
                                    <button
                                      key={id ?? tag.name}
                                      type="button"
                                      disabled={isSelectedVersionListed || isSubmitting}
                                      onClick={() => toggleTag(id)}
                                      className={`inline-flex cursor-pointer items-center gap-1 border-2 border-black px-2 py-0.5 text-[11px] font-bold transition ${
                                        active
                                          ? "bg-primary font-black text-black shadow-[2px_2px_0_0_#000]"
                                          : "bg-white text-black hover:bg-gray-50"
                                      } disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                      {active && <Check size={10} />}
                                      {tag.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={isSubmitting || !selectedVersion || isSelectedVersionListed}
                          className="btn-primary inline-flex w-full items-center justify-center gap-2 py-2 text-xs font-black uppercase sm:text-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={15} className="animate-spin" /> Đang gửi yêu cầu...
                            </>
                          ) : isSelectedVersionListed ? (
                            <>
                              <Lock size={15} /> Phiên bản này đã đăng Store
                            </>
                          ) : (
                            <>
                              <Store size={15} /> Gửi yêu cầu đăng bán
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Version List Column (adaptive paging, bottom-pinned pager, no inner scrollbar) */}
                  <div className="flex min-w-0 flex-col border-2 border-black bg-[#f7fbf8] p-3 md:col-span-5">
                    <div className="mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-1 border-b-2 border-black pb-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                        <History size={13} /> Chọn phiên bản ({versions.length})
                      </h3>
                      <span className="text-[10px] font-bold uppercase text-text-muted">Mới nhất trước</span>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      {pagedVersions.map((ver) => {
                        const isSelected = ver.versionId === selectedVersion?.versionId;
                        const isLatest = versions[0]?.versionId === ver.versionId;
                        const locked = Boolean(
                          ver.isListedOnStore || locallyPublishedIds.has(ver.versionId),
                        );
                        const thumb = getVersionArtwork(ver, selectedCharacter.characterId, isLatest);

                        return (
                          <button
                            key={ver.versionId}
                            type="button"
                            onClick={() => handleSelectVersion(ver)}
                            className={`flex w-full cursor-pointer items-center gap-2.5 border-2 p-2 text-left transition ${
                              isSelected
                                ? "border-black bg-[#eef8f0] shadow-[3px_3px_0_0_#000]"
                                : locked
                                  ? "border-black bg-amber-50 hover:bg-amber-100/70"
                                  : "border-black/25 bg-white hover:border-black"
                            }`}
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt={`v${ver.versionNumber}`}
                                  className="h-full w-full object-contain"
                                  style={{ imageRendering: "pixelated" }}
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-[9px] text-slate-400">
                                  No Img
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-mono text-xs font-black text-black">
                                  v{ver.versionNumber}
                                </span>
                                {isLatest && (
                                  <span className="border border-black bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                                    Mới nhất
                                  </span>
                                )}
                                {locked && (
                                  <span className="inline-flex items-center gap-0.5 border border-black bg-amber-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                                    <Lock size={9} /> Đã đăng
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] font-medium text-text-muted">
                                {new Date(ver.createdAt).toLocaleDateString("vi-VN")} ·{" "}
                                {ver.frameCount ?? 1} frames
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto shrink-0 pt-3">
                      <div className="flex items-center justify-between gap-2 border-t-2 border-black pt-2 text-[11px]">
                        <span className="font-bold text-black">
                          Trang <strong className="font-mono">{safeVersionPage + 1}</strong>/
                          {versionTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={safeVersionPage <= 0}
                            onClick={() => setVersionPage(Math.max(0, safeVersionPage - 1))}
                            className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
                          >
                            <ChevronLeft size={11} /> Trước
                          </button>
                          <button
                            type="button"
                            disabled={safeVersionPage >= versionTotalPages - 1}
                            onClick={() =>
                              setVersionPage(Math.min(versionTotalPages - 1, safeVersionPage + 1))
                            }
                            className="btn-secondary inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-black uppercase disabled:opacity-40"
                          >
                            Sau <ChevronRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

export default function DesignerPublishPage() {
  return (
    <DesignerCharactersProvider autoLoadCharacters={false}>
      <Suspense
        fallback={
          <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-studio-link" />
            <span>Đang khởi tạo trang đăng bán...</span>
          </div>
        }
      >
        <DesignerPublishWorkspace />
      </Suspense>
    </DesignerCharactersProvider>
  );
}
