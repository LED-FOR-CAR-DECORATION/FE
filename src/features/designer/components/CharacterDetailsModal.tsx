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
import Modal from "@/components/ui/Modal";
import { ApiError } from "@/api_client/core/ApiError";
import {
  formatDesignerApiError,
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
    <Modal
      onClose={onClose}
      title={`Chi tiết nhân vật: ${character.characterName}`}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Button B: Publish to Store */}
            <button
              type="button"
              disabled={isLoading || Boolean(historyError) || !versions.some((version) => !version.isListedOnStore)}
              onClick={() => onOpenPublish(character, versions)}
              title={
                versions.length === 0
                  ? "Cần có ít nhất 1 phiên bản trước khi đăng bán lên Store"
                  : "Chọn 1 phiên bản để gửi duyệt bán lên Store"
              }
              className="inline-flex items-center gap-2 rounded-lg border border-studio-accent bg-white px-4 py-2 text-sm font-bold text-studio-ink transition hover:bg-studio-wash disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Store size={15} /> Publish to Store
            </button>

            {/* Button A: Draw New Version */}
            <button
              type="button"
              onClick={handleDrawNewVersion}
              className="inline-flex items-center gap-2 rounded-lg bg-studio-accent px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-studio-accent-hover"
            >
              <Palette size={15} /> Vẽ phiên bản mới
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Character Header Summary */}
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-studio-line bg-studio-wash p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-studio-ink">{character.characterName}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-studio-accent-hover px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                <Grid size={11} /> {matrixSize} (Đã khóa)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {character.description || "Chưa có mô tả chi tiết cho nhân vật này."}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-bold text-studio-ink">
              Tổng phiên bản: {loadedVersions?.length ?? character.totalVersions}
            </p>
            <p>ID: #{character.characterId}</p>
          </div>
        </div>

        {actionError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Versions List (Chronologically Newest First) */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-studio-ink">
              <History size={14} /> Danh sách phiên bản (Mới nhất trước)
            </h4>
            <span className="text-[11px] text-slate-500">
              Phiên bản đã đăng Store sẽ bị khóa chỉnh sửa/xóa
            </span>
          </div>

          {historyError ? (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
              <p role="alert" className="text-red-700">{historyError}</p>
              <button type="button" className="min-h-11 font-semibold text-studio-ink underline" onClick={() => {
                setHistoryError("");
                setHistoryAttempt((attempt) => attempt + 1);
              }}>Tải lại lịch sử phiên bản</button>
            </div>
          ) : isLoading || !loadedVersions ? (
            <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-studio-line bg-white p-8 text-xs text-slate-500">
              <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" /> Đang tải lịch sử phiên bản…
            </div>
          ) : versions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-studio-line bg-white p-8 text-center">
              <Palette size={28} className="mx-auto mb-2 text-studio-muted" />
              <p className="font-bold text-studio-ink">Nhân vật này chưa có phiên bản nào</p>
              <p className="mt-1 text-xs text-slate-500">
                Chọn <strong>Vẽ phiên bản mới</strong> để mở Pixel Art Studio với bảng vẽ{" "}
                {matrixSize}.
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {versions.map((ver) => {
                const isLocked = Boolean(ver.isListedOnStore);
                const isDeleting = deletingVersionId === ver.versionId;

                return (
                  <div
                    key={ver.versionId}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      isLocked
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-studio-line bg-white hover:bg-studio-wash"
                    }`}
                  >
                    {/* Preview Artwork */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                      {ver.previewGifUrl ? (
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

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm font-black text-studio-ink">
                          v{ver.versionNumber}
                        </span>
                        {ver.isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Mới nhất
                          </span>
                        )}
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Lock size={10} /> Đã đăng Store ({ver.productStatus ?? "LISTED"})
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Nội bộ
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>{ver.frameCount ?? 1} frames</span>
                        <span>{ver.byteSize ? `${Math.round(ver.byteSize / 1024)} KB` : "—"}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(ver.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Actions (Enforce Version Lock Logic when isListedOnStore === true) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={handleDrawNewVersion}
                        title={
                          isLocked
                            ? "Phiên bản đã đăng bán lên Store — không thể chỉnh sửa"
                            : "Mở Studio vẽ kế thừa từ bản này"
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-studio-line bg-white px-2.5 py-1.5 text-xs font-bold text-studio-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Edit3 size={12} /> Sửa
                      </button>

                      <button
                        type="button"
                        disabled={isLocked || isDeleting}
                        onClick={() => handleDeleteVersion(ver)}
                        title={
                          isLocked
                            ? "Phiên bản đã đăng bán lên Store — không thể xóa"
                            : "Xóa phiên bản này"
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
    </Modal>
  );
}

