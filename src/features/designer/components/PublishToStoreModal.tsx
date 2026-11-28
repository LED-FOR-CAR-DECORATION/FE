"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Grid,
  History,
  Layers,
  Loader2,
  Lock,
  Palette,
  Plus,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import StoreModal from "@/features/store-listing/components/StoreModal";
import { getQueryClient } from "@/lib/query/client";
import { fetchStoreTagsCached } from "@/lib/query/store";
import {
  formatDesignerApiError,
  isStoreCharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { useDesignerCharacters } from "../context/DesignerCharactersContext";
import type { CreatedStoreProductResponse, TagItem } from "@/api_client";

interface PublishToStoreModalProps {
  character: DesignerCharacterItem;
  mode?: "versions" | "publish";
  onClose: () => void;
  onSuccess?: (created: CreatedStoreProductResponse, version: CharacterVersionItem) => void;
}

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

export default function PublishToStoreModal({
  character,
  mode = "publish",
  onClose,
  onSuccess,
}: PublishToStoreModalProps) {
  const isVersionsOnly = mode === "versions";
  const {
    versionsByCharacter,
    loadingVersions,
    loadVersions,
    deleteVersion,
    getMatrixSize,
    publishVersionToStore,
  } = useDesignerCharacters();

  const matrixSize = getMatrixSize(character.characterId);
  const loadedVersions = versionsByCharacter[character.characterId];
  const versions = useMemo(() => loadedVersions ?? [], [loadedVersions]);
  const isLoading = Boolean(loadingVersions[character.characterId]) || !loadedVersions;

  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [productName, setProductName] = useState(character.characterName);
  const [description, setDescription] = useState(character.description ?? "");
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [deletingVersionId, setDeletingVersionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [locallyPublishedIds, setLocallyPublishedIds] = useState<Set<number>>(new Set());

  // Load versions of character
  useEffect(() => {
    let active = true;
    setHistoryError(null);
    loadVersions(character.characterId).catch((err) => {
      if (active) {
        setHistoryError(formatDesignerApiError(err, "Không thể tải danh sách phiên bản."));
      }
    });
    return () => {
      active = false;
    };
  }, [character.characterId, historyAttempt, loadVersions]);

  // Load store tags
  useEffect(() => {
    let cancelled = false;
    setIsLoadingTags(true);
    fetchStoreTagsCached(getQueryClient())
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

  // Automatically default to the newest version (index 0) when versions load or change
  useEffect(() => {
    if (versions.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    const stillExists = versions.some((v) => v.versionId === selectedVersionId);
    if (!stillExists) {
      const newest = versions[0];
      setSelectedVersionId(newest.versionId);
      setProductName(`${character.characterName} (v${newest.versionNumber})`);
    }
  }, [versions, selectedVersionId, character.characterName]);

  const selectedVersion =
    versions.find((v) => v.versionId === selectedVersionId) ?? versions[0] ?? null;

  const isSelectedVersionLatest =
    Boolean(selectedVersion) && versions[0]?.versionId === selectedVersion?.versionId;

  const isSelectedVersionListed = Boolean(
    selectedVersion &&
      (selectedVersion.isListedOnStore || locallyPublishedIds.has(selectedVersion.versionId)),
  );
  const nextVersionNumber =
    versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;

  const previewArtwork = getVersionArtwork(
    selectedVersion,
    character.characterId,
    isSelectedVersionLatest,
  );

  const handleSelectVersion = (ver: CharacterVersionItem) => {
    setSelectedVersionId(ver.versionId);
    setProductName(`${character.characterName} (v${ver.versionNumber})`);
    setError(null);
    setPublishSuccess(null);
  };

  const toggleTag = (tagId?: number) => {
    if (!tagId) return;
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleDeleteVersion = async (e: React.MouseEvent, ver: CharacterVersionItem) => {
    e.stopPropagation();
    const locked = Boolean(ver.isListedOnStore || locallyPublishedIds.has(ver.versionId));
    if (locked || deletingVersionId !== null) return;

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Xóa phiên bản v${ver.versionNumber} của "${character.characterName}"?`)
    ) {
      return;
    }

    setError(null);
    setPublishSuccess(null);
    setDeletingVersionId(ver.versionId);
    try {
      await deleteVersion(character.characterId, ver.versionId);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`character_version_artwork_${ver.versionId}`);
      }
    } catch (err) {
      setError(formatDesignerApiError(err, "Không thể xóa phiên bản này."));
    } finally {
      setDeletingVersionId(null);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPublishSuccess(null);

    if (!isStoreCharacterType(character.characterType)) {
      setError("Nhân vật thuộc loại Commission không được phép đăng bán lên Store.");
      return;
    }
    if (!selectedVersion) {
      setError("Nhân vật chưa có phiên bản nào để đăng bán lên Store.");
      return;
    }
    if (isSelectedVersionListed) {
      setError("Phiên bản này đã được đăng bán lên Store trước đó.");
      return;
    }

    const trimmedName =
      productName.trim() || `${character.characterName} (v${selectedVersion.versionNumber})`;
    setIsSubmitting(true);
    try {
      const created = await publishVersionToStore({
        character,
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
        `Publish lên Store thành công! Sản phẩm "${created.productName ?? trimmedName}" (v${selectedVersion.versionNumber}) đã được gửi duyệt thành công.`,
      );
      onSuccess?.(created, selectedVersion);
    } catch (err) {
      setError(
        formatDesignerApiError(
          err,
          "Không thể đăng phiên bản lên Store. Vui lòng kiểm tra lại thông tin.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      onClose={onClose}
      title={
        isVersionsOnly
          ? `Phiên bản: ${character.characterName}`
          : `Đăng bán Store: ${character.characterName}`
      }
      badge={isVersionsOnly ? "Versions" : "Store"}
      icon={
        isVersionsOnly ? (
          <Layers className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Store className="h-5 w-5" aria-hidden="true" />
        )
      }
      description={`Kích thước bản vẽ: ${matrixSize} · ID: #${character.characterId}`}
      size="xl"
      busy={isSubmitting}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary text-sm"
          >
            Đóng
          </button>

          {isVersionsOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              {(versions.length === 0 || isSelectedVersionLatest) && (
                <Link
                  href={
                    selectedVersion
                      ? `/designer/studio/${character.characterId}?versionId=${selectedVersion.versionId}`
                      : `/designer/studio/${character.characterId}`
                  }
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <Palette size={15} />{" "}
                  {versions.length > 0 ? "Mở Studio chỉnh sửa" : "Mở Studio vẽ v1"}
                </Link>
              )}
              {versions.length > 0 && (
                <Link
                  href={
                    selectedVersion
                      ? `/designer/studio/${character.characterId}?versionId=${selectedVersion.versionId}&newVersion=1`
                      : `/designer/studio/${character.characterId}?newVersion=1`
                  }
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <Plus size={15} /> Tạo thêm phiên bản (v{nextVersionNumber})
                </Link>
              )}
            </div>
          ) : (
            <button
              type="submit"
              form="publish-to-store-form"
              disabled={
                isSubmitting ||
                isLoading ||
                !selectedVersion ||
                isSelectedVersionListed ||
                !isStoreCharacterType(character.characterType)
              }
              title={
                !isStoreCharacterType(character.characterType)
                  ? "Nhân vật loại Commission không được đăng bán lên Store"
                  : !selectedVersion
                    ? "Cần có ít nhất 1 phiên bản để đăng bán lên Store"
                    : isSelectedVersionListed
                      ? "Phiên bản đang chọn đã được đăng lên Store"
                      : "Đăng bán phiên bản này lên Store"
              }
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Đang publish...
                </>
              ) : (
                <>
                  <Store size={15} /> Gửi yêu cầu đăng bán
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <form id="publish-to-store-form" onSubmit={handlePublish} className="space-y-4 text-sm text-black">
        {/* Publish Success Banner */}
        {publishSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 border-2 border-black bg-[#eef8f0] p-3.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000] sm:text-sm"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-ink" />
            <span>{publishSuccess}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 border-2 border-black bg-red-50 p-3 text-xs font-bold text-red-700 shadow-[2px_2px_0_0_#000]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isVersionsOnly && (
          <div className="flex items-start gap-2.5 border-2 border-black bg-sky-50 p-3 text-xs text-black">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-black uppercase">Chờ manager duyệt</p>
              <p className="mt-0.5 font-medium text-text-muted">
                Yêu cầu được tạo với giá tạm 0 VNĐ. Manager sẽ đặt giá trước khi đăng bán.
              </p>
            </div>
          </div>
        )}

        {historyError ? (
          <div className="space-y-2 border-2 border-black bg-red-50 p-5 text-center">
            <p role="alert" className="text-sm font-bold text-red-700">
              {historyError}
            </p>
            <button
              type="button"
              onClick={() => setHistoryAttempt((n) => n + 1)}
              className="btn-secondary text-xs font-black uppercase"
            >
              Thử tải lại phiên bản
            </button>
          </div>
        ) : isLoading ? (
          <div
            role="status"
            className="flex min-h-[300px] items-center justify-center gap-2 border-2 border-black bg-[#f7fbf8] text-xs font-bold text-black"
          >
            <Loader2 size={18} className="animate-spin" />
            <span>Đang tải phiên bản của nhân vật...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* CENTER / LEFT STAGE */}
            <div className="space-y-4 md:col-span-7">
              <div className="relative flex min-h-[270px] flex-col items-center justify-center border-2 border-black bg-[#090d14] p-5 text-center shadow-[4px_4px_0_0_#000]">
                {/* Matrix Size & Version Badges */}
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black">
                    <Grid size={11} /> {matrixSize}
                  </span>
                  {selectedVersion && (
                    <span className="border border-black bg-primary px-2 py-0.5 font-mono text-[11px] font-black text-black">
                      v{selectedVersion.versionNumber}
                      {isSelectedVersionLatest ? " · Mới nhất" : ""}
                    </span>
                  )}
                </div>

                {selectedVersion && isSelectedVersionListed && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 border border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black">
                    <Lock size={11} /> Đã đăng Store
                  </span>
                )}

                {selectedVersion ? (
                  previewArtwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewArtwork}
                      alt={`${character.characterName} v${selectedVersion.versionNumber}`}
                      className="h-52 w-52 object-contain sm:h-60 sm:w-60"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                      <Layers size={36} className="opacity-60" />
                      <span className="text-xs font-bold">
                        Phiên bản v{selectedVersion.versionNumber} chưa có ảnh xem trước
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-300">
                    <Layers size={36} className="opacity-60" />
                    <p className="text-sm font-black uppercase text-white">
                      Nhân vật này chưa có phiên bản nào
                    </p>
                    <p className="max-w-xs text-xs text-slate-400">
                      Hãy mở Pixel Art Studio để vẽ và lưu bản đầu tiên.
                    </p>
                  </div>
                )}

                {selectedVersion && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-300">
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

              {/* Store Listing Inputs */}
              {!isVersionsOnly && selectedVersion && (
                <div className="space-y-3 border-2 border-black bg-[#f7fbf8] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black">
                      Tên sản phẩm trên Store <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={255}
                      disabled={isSelectedVersionListed || isSubmitting}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full border-2 border-black bg-white px-3 py-1.5 text-xs font-semibold text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black">
                      Mô tả sản phẩm
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSelectedVersionListed || isSubmitting}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả phong cách, điểm nổi bật của nhân vật..."
                      className="w-full border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none disabled:bg-gray-100"
                    />
                  </div>

                  {!isLoadingTags && availableTags.length > 0 && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-black uppercase tracking-wider text-black">
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
                              className={`inline-flex cursor-pointer items-center gap-1 border-2 border-black px-2.5 py-0.5 text-[11px] font-bold transition ${
                                active
                                  ? "bg-primary font-black text-black shadow-[2px_2px_0_0_#000]"
                                  : "bg-white text-black hover:bg-gray-50"
                              } disabled:opacity-50`}
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
            </div>

            {/* RIGHT COLUMN: Version List */}
            <div className="flex flex-col border-2 border-black bg-white p-4 md:col-span-5">
              <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-black pb-2.5">
                <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
                  <History size={14} /> Danh sách phiên bản ({versions.length})
                </h4>
                <span className="text-[10px] font-bold uppercase text-text-muted">Mới nhất trước</span>
              </div>

              {versions.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center border-2 border-dashed border-black bg-[#f7fbf8] p-6 text-center text-xs text-text-muted">
                  <p className="font-black uppercase text-black">Chưa có phiên bản nào</p>
                  <p className="mt-1 text-[11px]">
                    Bấm Mở Studio ở bên dưới để bắt đầu vẽ v1.
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] flex-1 space-y-2 overflow-y-auto pr-1">
                  {versions.map((ver, idx) => {
                    const isSelected = ver.versionId === selectedVersion?.versionId;
                    const isLatest = idx === 0;
                    const locked = Boolean(
                      ver.isListedOnStore || locallyPublishedIds.has(ver.versionId),
                    );
                    const isDeleting = deletingVersionId === ver.versionId;
                    const thumb = getVersionArtwork(ver, character.characterId, isLatest);

                    return (
                      <div
                        key={ver.versionId}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectVersion(ver)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectVersion(ver);
                          }
                        }}
                        className={`flex cursor-pointer items-center gap-2.5 border-2 p-2.5 transition ${
                          isSelected
                            ? "border-black bg-[#eef8f0] shadow-[3px_3px_0_0_#000]"
                            : locked
                              ? "border-black bg-amber-50 hover:bg-amber-100/70"
                              : "border-black/30 bg-white hover:border-black"
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
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

                        <button
                          type="button"
                          disabled={locked || isDeleting}
                          onClick={(e) => void handleDeleteVersion(e, ver)}
                          title={
                            locked
                              ? "Phiên bản đã đăng Store — không thể xóa"
                              : `Xóa phiên bản v${ver.versionNumber}`
                          }
                          aria-label={`Xóa phiên bản v${ver.versionNumber}`}
                          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center border-2 border-black bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {isDeleting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </StoreModal>
  );
}
