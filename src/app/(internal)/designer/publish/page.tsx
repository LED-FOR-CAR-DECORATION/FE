"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
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
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";
import {
  DesignerCharactersProvider,
  useDesignerCharacters,
} from "@/features/designer/context/DesignerCharactersContext";
import { getCharacterArtwork } from "@/features/designer/character-artwork";
import { linkedCommissionId, stripCommissionMarker } from "@/features/designer/commission-link";
import { fetchStoreTags } from "@/lib/api/products";
import { fetchAllPages } from "@/lib/api/paging";
import {
  fetchMyCharacters,
  formatDesignerApiError,
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

  const [ownCharacters, setOwnCharacters] = useState<DesignerCharacterItem[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<DesignerCharacterItem | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

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
      // Exclude commission characters — only Designer-created personal characters can be listed on Store
      const personalOnly = all.filter(
        (char) => linkedCommissionId(char.description) === undefined,
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

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedCharacters = useMemo(
    () => filteredCharacters.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [filteredCharacters, safePage],
  );

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
    if (requestedCharacterId) {
      const requested = ownCharacters.find((c) => c.characterId === requestedCharacterId);
      if (requested) {
        setSelectedCharacter(requested);
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
  }, [requestedCharacterId, ownCharacters, selectedCharacter]);

  // Load versions whenever selected character changes
  useEffect(() => {
    if (!selectedCharacter) return;
    let cancelled = false;
    setVersionError(null);
    setSubmitError(null);
    setPublishSuccess(null);
    setSelectedVersionId(null);
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
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-studio-line bg-white p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-semibold text-studio-ink">Đăng bán lên Store</h1>
          <p className="mt-1 text-xs text-slate-500">
            Chỉ hiển thị nhân vật do bạn tự sáng tạo (nhân vật thuộc đơn Commission không được đăng bán tại đây). Chọn phiên bản đã chốt và gửi Manager duyệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/designer/characters"
            className="inline-flex items-center gap-1.5 rounded border border-studio-line bg-white px-3.5 py-2 text-xs font-semibold text-studio-ink transition hover:bg-studio-wash"
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-studio-line bg-white px-3.5 py-2 text-xs font-semibold text-studio-ink transition hover:bg-studio-wash disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingCharacters ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </header>

      {charactersError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={16} />
          <span>{charactersError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Character Selector */}
        <section className="flex flex-col rounded-md border border-studio-line bg-white p-4 shadow-xs lg:col-span-4">
          <form onSubmit={handleSearchSubmit} className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhân vật..."
                aria-label="Tìm nhân vật để đăng bán"
                className="w-full rounded border border-studio-line bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-studio-focus"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer rounded border border-studio-line bg-studio-wash px-3 py-2 text-xs font-bold text-studio-ink transition hover:bg-studio-soft"
            >
              Tìm
            </button>
          </form>

          {loadingCharacters ? (
            <div className="flex min-h-[280px] items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin text-studio-link" />
              <span>Đang tải danh sách nhân vật...</span>
            </div>
          ) : pagedCharacters.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded border border-dashed border-studio-line bg-studio-wash p-6 text-center text-xs text-slate-500">
              <Layers size={28} className="mb-2 opacity-50" />
              <p className="font-semibold text-studio-ink">Không có nhân vật cá nhân nào phù hợp.</p>
              <Link
                href="/designer/characters"
                className="mt-3 font-bold text-studio-link underline"
              >
                Về Danh sách nhân vật
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {pagedCharacters.map((char) => {
                const isActive = selectedCharacter?.characterId === char.characterId;
                const thumb = getCharacterArtwork(char);
                const matrix = getMatrixSize(char.characterId);

                return (
                  <button
                    key={char.characterId}
                    type="button"
                    onClick={() => handleSelectCharacter(char)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded border p-2.5 text-left transition ${
                      isActive
                        ? "border-studio-accent bg-studio-soft ring-1 ring-studio-accent"
                        : "border-studio-line bg-white hover:bg-studio-wash"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-[#0f172a]">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={char.characterName}
                          className="h-full w-full object-contain p-1"
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
                        <span className="truncate text-xs font-bold text-studio-ink">
                          {char.characterName}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          #{char.characterId}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700">
                          {matrix}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-semibold ${
                            char.totalVersions > 0
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-amber-50 text-amber-800"
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-studio-line pt-3 text-xs">
              <span className="text-slate-500">
                Trang <strong>{safePage + 1}</strong> / {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={13} /> Trước
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                  className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Version Selector & Editable Publish Form */}
        <section className="rounded-md border border-studio-line bg-white p-6 shadow-xs lg:col-span-8">
          {!selectedCharacter ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <Store size={32} className="mb-2 opacity-40" />
              <p className="font-semibold text-studio-ink">Chọn một nhân vật ở cột bên trái để chỉnh sửa thông tin đăng bán.</p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-studio-line pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-studio-ink">
                    {selectedCharacter.characterName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mã #{selectedCharacter.characterId} • Ma trận {selectedMatrixSize}
                  </p>
                </div>

                <Link
                  href={`/designer/studio/${selectedCharacter.characterId}`}
                  className="inline-flex items-center gap-1.5 rounded border border-studio-line bg-studio-wash px-3 py-1.5 text-xs font-bold text-studio-ink transition hover:bg-studio-soft"
                >
                  <Palette size={14} /> Chỉnh sửa trên Studio
                </Link>
              </div>

              {publishSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 sm:text-sm"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              {(submitError || versionError) && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{submitError || versionError}</span>
                </div>
              )}

              {isVersionsLoading ? (
                <div className="flex min-h-[260px] items-center justify-center gap-2 rounded border border-studio-line bg-studio-wash text-xs font-medium text-slate-500">
                  <Loader2 size={18} className="animate-spin text-studio-link" />
                  <span>Đang tải các phiên bản của nhân vật...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded border border-dashed border-studio-line bg-studio-wash p-8 text-center">
                  <Layers size={34} className="mb-2 text-slate-400" />
                  <p className="text-sm font-bold text-studio-ink">
                    Nhân vật này chưa có phiên bản hoàn thiện nào
                  </p>
                  <p className="mt-1 max-w-md text-xs text-slate-500">
                    Hãy vào Pixel Art Studio để hoàn thành bản vẽ và bấm <strong>Chốt v1</strong> trước khi đăng bán lên Store.
                  </p>
                  <Link
                    href={`/designer/studio/${selectedCharacter.characterId}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-studio-accent px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-studio-accent-hover"
                  >
                    <Palette size={14} /> Mở Studio để vẽ v1
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                  {/* Preview + Form */}
                  <div className="space-y-4 md:col-span-7">
                    <div className="relative flex min-h-[240px] flex-col items-center justify-center rounded-md border border-studio-line bg-[#0f172a] p-5 text-center">
                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                          <Grid size={11} /> {selectedMatrixSize}
                        </span>
                        {selectedVersion && (
                          <span className="rounded-full bg-emerald-500/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                            v{selectedVersion.versionNumber}
                            {isSelectedVersionLatest ? " • Mới nhất" : ""}
                          </span>
                        )}
                      </div>

                      {isSelectedVersionListed && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                          <Lock size={11} /> Đã đăng Store
                        </span>
                      )}

                      {selectedArtwork ? (
                        <img
                          src={selectedArtwork}
                          alt={`${selectedCharacter.characterName} v${selectedVersion?.versionNumber}`}
                          className="h-44 w-44 object-contain sm:h-52 sm:w-52"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                          <Layers size={32} className="opacity-60" />
                          <span className="text-xs">Chưa có ảnh xem trước</span>
                        </div>
                      )}

                      {selectedVersion && (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300">
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

                    <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-700" />
                      <div>
                        <p className="font-bold">Chờ manager duyệt &amp; định giá</p>
                        <p className="mt-0.5 text-sky-800">
                          Yêu cầu được tạo ở trạng thái chưa công khai với giá tạm 0 VNĐ để Manager định giá trước khi mở bán.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded border border-studio-line bg-studio-wash p-4">
                      <div>
                        <label
                          htmlFor="publish-product-name"
                          className="mb-1 block text-xs font-bold text-studio-ink"
                        >
                          Tên sản phẩm trên Store <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="publish-product-name"
                          type="text"
                          required
                          maxLength={255}
                          disabled={isSelectedVersionListed || isSubmitting}
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          className="w-full rounded-lg border border-studio-line bg-white px-3 py-2 text-xs outline-none focus:border-studio-focus disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="publish-product-desc"
                          className="mb-1 block text-xs font-bold text-studio-ink"
                        >
                          Mô tả sản phẩm
                        </label>
                        <textarea
                          id="publish-product-desc"
                          rows={3}
                          disabled={isSelectedVersionListed || isSubmitting}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Mô tả phong cách, hiệu ứng, điểm nổi bật của nhân vật..."
                          className="w-full rounded-lg border border-studio-line bg-white px-3 py-2 text-xs outline-none focus:border-studio-focus disabled:bg-slate-100"
                        />
                      </div>

                      {!isLoadingTags && availableTags.length > 0 && (
                        <div>
                          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-studio-ink">
                            <Tag size={12} /> Thẻ phân loại (Tags)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {availableTags.map((tag) => {
                              const id = tag.tagId;
                              const active = id != null && selectedTagIds.includes(id);
                              return (
                                <button
                                  key={id ?? tag.name}
                                  type="button"
                                  disabled={isSelectedVersionListed || isSubmitting}
                                  onClick={() => toggleTag(id)}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                                    active
                                      ? "border-studio-accent bg-studio-accent text-white"
                                      : "border-studio-line bg-white text-studio-ink hover:bg-studio-soft"
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

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !selectedVersion || isSelectedVersionListed}
                          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-studio-accent px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-studio-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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

                  {/* Version List Column */}
                  <div className="flex flex-col rounded-md border border-studio-line bg-studio-wash/50 p-4 md:col-span-5">
                    <div className="mb-3 flex items-center justify-between border-b border-studio-line pb-2.5">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-studio-ink">
                        <History size={14} /> Chọn phiên bản ({versions.length})
                      </h3>
                      <span className="text-[10px] font-medium text-slate-400">Mới nhất trước</span>
                    </div>

                    <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                      {versions.map((ver, idx) => {
                        const isSelected = ver.versionId === selectedVersion?.versionId;
                        const isLatest = idx === 0;
                        const locked = Boolean(
                          ver.isListedOnStore || locallyPublishedIds.has(ver.versionId),
                        );
                        const thumb = getVersionArtwork(ver, selectedCharacter.characterId, isLatest);

                        return (
                          <button
                            key={ver.versionId}
                            type="button"
                            onClick={() => handleSelectVersion(ver)}
                            className={`flex w-full cursor-pointer items-center gap-2.5 rounded border p-2.5 text-left transition ${
                              isSelected
                                ? "border-studio-accent bg-studio-soft ring-1 ring-studio-accent"
                                : locked
                                  ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                                  : "border-studio-line bg-white hover:bg-studio-wash"
                            }`}
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-[#0f172a]">
                              {thumb ? (
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
                                <span className="font-mono text-xs font-semibold text-studio-ink">
                                  v{ver.versionNumber}
                                </span>
                                {isLatest && (
                                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                    Mới nhất
                                  </span>
                                )}
                                {locked && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    <Lock size={9} /> Đã đăng
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {new Date(ver.createdAt).toLocaleDateString("vi-VN")} •{" "}
                                {ver.frameCount ?? 1} frames
                              </p>
                            </div>
                          </button>
                        );
                      })}
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
    <DesignerCharactersProvider>
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
