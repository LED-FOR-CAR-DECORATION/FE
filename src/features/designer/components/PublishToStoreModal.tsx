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
import Modal from "@/components/ui/Modal";
import { fetchStoreTags } from "@/lib/api/products";
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
    <Modal
      onClose={onClose}
      title={
        isVersionsOnly
          ? `Xem các phiên bản: ${character.characterName}`
          : `Đăng bán lên Store: ${character.characterName}`
      }
      description={`Kích thước ma trận: ${matrixSize} • ID: #${character.characterId}`}
      size="xl"
      busy={isSubmitting}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Đóng
          </button>

          {isVersionsOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/designer/studio/${character.characterId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-studio-line bg-white px-4 py-2 text-sm font-bold text-studio-ink transition hover:bg-studio-wash"
              >
                <Palette size={15} /> {versions.length > 0 ? "Mở Studio chỉnh sửa" : "Mở Studio vẽ v1"}
              </Link>
              {versions.length > 0 && (
                <Link
                  href={`/designer/studio/${character.characterId}?newVersion=1`}
                  className="inline-flex items-center gap-2 rounded-lg bg-studio-accent px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-studio-accent-hover"
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
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-studio-accent px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-studio-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
      <form id="publish-to-store-form" onSubmit={handlePublish} className="space-y-4 text-sm">
        {/* Publish Success Banner */}
        {publishSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded border border-emerald-300 bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{publishSuccess}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isVersionsOnly && (
          <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-700" />
            <div>
              <p className="font-bold">Chờ manager duyệt</p>
              <p className="mt-0.5 text-sky-800">
                Yêu cầu được tạo với giá tạm 0 VNĐ. Manager sẽ đặt giá trước khi đăng bán.
              </p>
            </div>
          </div>
        )}

        {historyError ? (
          <div className="space-y-2 rounded border border-red-200 bg-red-50 p-5 text-center">
            <p role="alert" className="text-sm font-semibold text-red-700">
              {historyError}
            </p>
            <button
              type="button"
              onClick={() => setHistoryAttempt((n) => n + 1)}
              className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-studio-ink shadow-xs ring-1 ring-red-200 hover:bg-red-50"
            >
              Thử tải lại phiên bản
            </button>
          </div>
        ) : isLoading ? (
          <div
            role="status"
            className="flex min-h-[300px] items-center justify-center gap-2 rounded border border-studio-line bg-studio-wash text-xs font-medium text-slate-500"
          >
            <Loader2 size={18} className="animate-spin text-studio-link" />
            <span>Đang tải phiên bản của nhân vật...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* CENTER / LEFT STAGE: Large Preview of Selected (Latest) Version + Publish Details */}
            <div className="space-y-4 md:col-span-7">
              <div className="flex flex-col items-center justify-center rounded-md border border-studio-line bg-[#0f172a] p-5 text-center relative min-h-[270px]">
                {/* Matrix Size & Version Badges */}
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white backdrop-blur-xs">
                    <Grid size={11} /> {matrixSize}
                  </span>
                  {selectedVersion && (
                    <span className="rounded-full bg-emerald-500/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                      v{selectedVersion.versionNumber}
                      {isSelectedVersionLatest ? " • Mới nhất" : ""}
                    </span>
                  )}
                </div>

                {selectedVersion && isSelectedVersionListed && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
                    <Lock size={11} /> Đã đăng Store
                  </span>
                )}

                {selectedVersion ? (
                  previewArtwork ? (
                    <img
                      src={previewArtwork}
                      alt={`${character.characterName} v${selectedVersion.versionNumber}`}
                      className="h-52 w-52 sm:h-60 sm:w-60 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                      <Layers size={36} className="opacity-60" />
                      <span className="text-xs font-semibold">
                        Phiên bản v{selectedVersion.versionNumber} chưa có ảnh xem trước
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-300">
                    <Layers size={36} className="opacity-60" />
                    <p className="text-sm font-bold text-white">
                      Nhân vật này chưa có phiên bản nào
                    </p>
                    <p className="max-w-xs text-xs text-slate-400">
                      Hãy đóng hộp thoại và bấm trực tiếp vào thẻ nhân vật ngoài danh sách để mở
                      công cụ vẽ Pixel Art.
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
                <div className="space-y-3 rounded border border-studio-line bg-studio-wash p-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-studio-ink">
                      Tên sản phẩm trên Store <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={255}
                      disabled={isSelectedVersionListed || isSubmitting}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs outline-none focus:border-studio-focus disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-studio-ink">
                      Mô tả sản phẩm
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSelectedVersionListed || isSubmitting}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả phong cách, điểm nổi bật của nhân vật..."
                      className="w-full rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs outline-none focus:border-studio-focus disabled:bg-slate-100"
                    />
                  </div>

                  {/* Optional Tags */}
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
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                                active
                                  ? "border-studio-accent bg-studio-accent text-white"
                                  : "border-studio-line bg-white text-studio-ink hover:bg-studio-soft"
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

            {/* RIGHT COLUMN: Version List (Select to preview/publish, or Delete only — no Update) */}
            <div className="flex flex-col rounded-md border border-studio-line bg-white p-4 md:col-span-5">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-studio-line pb-2.5">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-studio-ink">
                  <History size={14} /> Danh sách phiên bản ({versions.length})
                </h4>
                <span className="text-[10px] font-medium text-slate-400">Mới nhất trước</span>
              </div>

              {versions.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-studio-line bg-studio-wash p-6 text-center text-xs text-slate-500">
                  <p className="font-bold text-studio-ink">Chưa có phiên bản nào</p>
                  <p className="mt-1 text-[11px]">
                    Bấm vào nhân vật ngoài danh sách để bắt đầu vẽ v1.
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
                        className={`flex cursor-pointer items-center gap-2.5 rounded border p-2.5 transition ${
                          isSelected
                            ? "border-studio-accent bg-studio-soft ring-1 ring-studio-accent"
                            : locked
                              ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                              : "border-studio-line bg-white hover:bg-studio-wash"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
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

                        {/* Metadata */}
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

                        {/* Delete Action ONLY (no update version) */}
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
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
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
    </Modal>
  );
}
