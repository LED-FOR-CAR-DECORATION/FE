"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Edit3,
  Grid,
  History,
  Loader2,
  Lock,
  Palette,
  Store,
  Trash2,
} from "lucide-react";
import StoreModal from "@/features/store-listing/components/StoreModal";
import { ApiError } from "@/api_client/core/ApiError";
import {
  formatDesignerApiError,
  isStoreCharacterType,
  type CharacterVersionItem,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { useDesignerCharacters } from "../context/DesignerCharactersContext";

interface CharacterDetailsModalProps {
  character: DesignerCharacterItem;
  onClose: () => void;
  onOpenPublish: (character: DesignerCharacterItem, versions: CharacterVersionItem[]) => void;
}

export default function CharacterDetailsModal({
  character,
  onClose,
  onOpenPublish,
}: CharacterDetailsModalProps) {
  const router = useRouter();
  const {
    versionsByCharacter,
    loadingVersions,
    loadVersions,
    deleteVersion,
    getMatrixSize,
  } = useDesignerCharacters();

  const [deletingVersionId, setDeletingVersionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyAttempt, setHistoryAttempt] = useState(0);

  const matrixSize = getMatrixSize(character.characterId);
  const loadedVersions = versionsByCharacter[character.characterId];
  const versions = loadedVersions ?? [];
  const isLoading = Boolean(loadingVersions[character.characterId]);

  useEffect(() => {
    let active = true;
    loadVersions(character.characterId).catch((error) => {
      if (!active) return;
      if (error instanceof ApiError && error.status >= 500) {
        setHistoryError("Máy chủ chưa tải được lịch sử phiên bản. Vui lòng thử lại.");
      } else {
        setHistoryError(formatDesignerApiError(error, "Không thể tải lịch sử phiên bản."));
      }
    });
    return () => { active = false; };
  }, [character.characterId, historyAttempt, loadVersions]);

  const handleDrawNewVersion = () => {
    onClose();
    router.push(`/designer/studio/${character.characterId}`);
  };

  const handleDeleteVersion = async (ver: CharacterVersionItem) => {
    if (ver.isListedOnStore) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Xóa phiên bản v${ver.versionNumber} của "${character.characterName}"?`)
    ) {
      return;
    }

    setActionError(null);
    setDeletingVersionId(ver.versionId);
    try {
      await deleteVersion(character.characterId, ver.versionId);
    } catch (err) {
      setActionError(formatDesignerApiError(err, "Không thể xóa phiên bản này."));
    } finally {
      setDeletingVersionId(null);
    }
  };

  return (
    <StoreModal
      onClose={onClose}
      title={`Chi tiết: ${character.characterName}`}
      badge="Character"
      icon={<Palette className="h-5 w-5" aria-hidden="true" />}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Đóng
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {isStoreCharacterType(character.characterType) && (
              <button
                type="button"
                disabled={isLoading || Boolean(historyError) || !versions.some((version) => !version.isListedOnStore)}
                onClick={() => onOpenPublish(character, versions)}
                title={
                  versions.length === 0
                    ? "Cần có ít nhất 1 phiên bản trước khi đăng bán lên Store"
                    : "Chọn 1 phiên bản để gửi duyệt bán lên Store"
                }
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Store size={15} /> Publish to Store
              </button>
            )}

            <button
              type="button"
              onClick={handleDrawNewVersion}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Palette size={15} /> Vẽ phiên bản mới
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-black">
        <div className="flex flex-wrap items-start justify-between gap-3 border-2 border-black bg-[#f7fbf8] p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-black">{character.characterName}</h3>
              <span className="inline-flex items-center gap-1 border border-black bg-primary px-2 py-0.5 font-mono text-[11px] font-black text-black">
                <Grid size={11} /> {matrixSize} (Đã khóa)
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-text-muted">
              {character.description || "Chưa có mô tả chi tiết cho nhân vật này."}
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p className="font-black text-black">
              Tổng phiên bản: {loadedVersions?.length ?? character.totalVersions}
            </p>
            <p className="font-mono">ID: #{character.characterId}</p>
          </div>
        </div>

        {actionError && (
          <div className="flex items-start gap-2 border-2 border-black bg-red-50 p-3 text-xs font-bold text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black">
              <History size={14} /> Danh sách phiên bản (Mới nhất trước)
            </h4>
            <span className="text-[11px] font-medium text-text-muted">
              Phiên bản đã đăng Store sẽ bị khóa chỉnh sửa/xóa
            </span>
          </div>

          {historyError ? (
            <div className="space-y-2 border-2 border-black bg-red-50 p-4">
              <p role="alert" className="font-bold text-red-700">{historyError}</p>
              <button type="button" className="min-h-11 font-black text-black underline" onClick={() => {
                setHistoryError("");
                setHistoryAttempt((attempt) => attempt + 1);
              }}>Tải lại lịch sử phiên bản</button>
            </div>
          ) : isLoading || !loadedVersions ? (
            <div role="status" className="flex items-center justify-center gap-2 border-2 border-black bg-white p-8 text-xs font-bold text-text-muted">
              <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> Đang tải lịch sử phiên bản…
            </div>
          ) : versions.length === 0 ? (
            <div className="border-2 border-dashed border-black bg-white p-8 text-center">
              <Palette size={28} className="mx-auto mb-2 text-black/40" />
              <p className="font-black uppercase text-black">Nhân vật này chưa có phiên bản nào</p>
              <p className="mt-1 text-xs font-medium text-text-muted">
                Chọn <strong>Vẽ phiên bản mới</strong> để mở Pixel Art Studio với bảng vẽ{" "}
                {matrixSize}.
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {versions.map((ver, idx) => {
                const isLocked = Boolean(ver.isListedOnStore);
                const isLatest = idx === 0;
                const isDeleting = deletingVersionId === ver.versionId;

                return (
                  <div
                    key={ver.versionId}
                    className={`flex items-center gap-3 border-2 border-black p-3 transition ${
                      isLocked
                        ? "bg-amber-50"
                        : "bg-white hover:bg-[#eef8f0]"
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-black bg-[#090d14]">
                      {ver.previewGifUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ver.previewGifUrl}
                          alt={`v${ver.versionNumber}`}
                          className="h-full w-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-[10px] text-slate-400">
                          No GIF
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-black text-black">
                          v{ver.versionNumber}
                        </span>
                        {ver.isCurrent && (
                          <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            Mới nhất
                          </span>
                        )}
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                            <Lock size={10} /> Đã đăng Store ({ver.productStatus ?? "LISTED"})
                          </span>
                        ) : (
                          <span className="border border-black bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                            Nội bộ
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-medium text-text-muted">
                        <span>{ver.frameCount ?? 1} frames</span>
                        <span>{ver.byteSize ? `${Math.round(ver.byteSize / 1024)} KB` : "—"}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(ver.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isLatest && (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={handleDrawNewVersion}
                          title={
                            isLocked
                              ? "Phiên bản đã đăng bán lên Store — không thể chỉnh sửa"
                              : "Mở Studio chỉnh sửa bản mới nhất"
                          }
                          className="btn-secondary inline-flex items-center gap-1 px-2.5! py-1.5! text-xs"
                        >
                          <Edit3 size={12} /> Sửa
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isLocked || isDeleting}
                        onClick={() => handleDeleteVersion(ver)}
                        title={
                          isLocked
                            ? "Phiên bản đã đăng bán lên Store — không thể xóa"
                            : "Xóa phiên bản này"
                        }
                        className="inline-flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isDeleting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StoreModal>
  );
}

