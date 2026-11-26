"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { AlertTriangle, History, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import StoreModal from "./StoreModal";
import { formatBytes, formatDate } from "../format";
import { getCharacterVersions } from "../services/store-listing.service";
import type { CharacterVersion, PublishMode, StoreCharacterRow } from "../types";
import StatusBadge from "./StatusBadge";

interface PublishVersionModalProps {
  character: StoreCharacterRow;
  mode: PublishMode;
  onClose: () => void;
  /** Được gọi với version mà Manager chọn trực tiếp. */
  onConfirm: (versionId: string) => Promise<void>;
}

const COPY: Record<PublishMode, { title: string; confirm: (version: number) => string }> = {
  review: { title: "Duyệt và mở bán nhân vật", confirm: (version) => `Mở bán phiên bản ${version}` },
  change: { title: "Đổi phiên bản trên cửa hàng", confirm: (version) => `Chuyển sang phiên bản ${version}` },
  republish: { title: "Mở bán lại trên cửa hàng", confirm: (version) => `Mở bán lại phiên bản ${version}` },
};

/**
 * Cho phép Manager chọn chính xác CHARACTER_VERSION mà Store sẽ tham chiếu.
 *
 * BR-10: Tuyệt đối không chọn trước (pre-select) bất kỳ version nào và không tự động
 * chọn version cao nhất hoặc version mới nhất của Designer. Nút xác nhận bị vô hiệu hoá
 * cho đến khi Manager chủ động click chọn một version cụ thể.
 */
export default function PublishVersionModal({ character, mode, onClose, onConfirm }: PublishVersionModalProps) {
  const groupName = useId();
  const [versions, setVersions] = useState<CharacterVersion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const copy = COPY[mode];
  const storeVersionId = character.activeVersion?.versionId ?? null;
  const selectedVersion = versions?.find((item) => item.versionId === selectedVersionId) ?? null;
  const isSameAsLive = mode === "change" && selectedVersionId !== null && selectedVersionId === storeVersionId;
  const canConfirm = selectedVersion !== null && !isSameAsLive && !isSubmitting;

  useEffect(() => {
    let cancelled = false;
    setVersions(null);
    setLoadError(null);
    getCharacterVersions(character.characterId)
      .then((result) => {
        if (!cancelled) setVersions(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Không thể tải danh sách version cho Character này.");
      });
    return () => {
      cancelled = true;
    };
  }, [character.characterId, attempt]);

  const submit = async () => {
    if (!selectedVersion) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm(selectedVersion.versionId);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <StoreModal
      title={copy.title}
      badge="CHỌN PHIÊN BẢN"
      description="Chọn chính xác phiên bản sẽ được kích hoạt để hiển thị và bán cho khách hàng trên cửa hàng."
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          <p className="mr-auto text-xs font-bold text-text-muted" aria-live="polite">
            {isSameAsLive
              ? "Phiên bản này hiện đang hoạt động trên cửa hàng — vui lòng chọn phiên bản khác."
              : selectedVersion
                ? `Đã chọn: Phiên bản ${selectedVersion.versionNumber}`
                : "Chưa chọn phiên bản nào"}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canConfirm}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {selectedVersion ? copy.confirm(selectedVersion.versionNumber) : "Vui lòng chọn version"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3 border-2 border-black bg-gray-50 p-3 shadow-[2px_2px_0_0_#000]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-white">
          <Image
            src={character.thumbnailUrl}
            alt={`Thumbnail của ${character.name}`}
            width={48}
            height={48}
            className="h-full w-full object-contain [image-rendering:pixelated]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black uppercase text-black">{character.name}</p>
          <p className="truncate text-xs font-medium text-text-muted">
            #{character.characterId} · Nhà thiết kế: {character.creatorName}
          </p>
        </div>
        <StatusBadge status={character.status} />
      </div>

      <p className="mb-4 flex items-start gap-2.5 border-2 border-black bg-primary/15 px-3.5 py-2.5 text-xs font-medium text-black">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary-ink" aria-hidden="true" />
        <span>
          <strong className="font-black">Quy tắc BR-10 &amp; BR-14:</strong> Chỉ Manager mới có quyền publish. Hệ thống không tự động chọn
          version cho bạn — bản upload mới nhất chưa hẳn đã phù hợp. Vui lòng kiểm tra changelog và thông số kỹ thuật
          trước khi kích hoạt.
        </span>
      </p>

      {!versions && !loadError && <VersionListSkeleton />}

      {loadError && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 border-2 border-black bg-[#fee2e2] px-4 py-8 text-center shadow-[4px_4px_0_0_#000]"
        >
          <AlertTriangle size={22} className="text-red-700" aria-hidden="true" />
          <p className="text-sm font-black text-black">{loadError}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]"
          >
            <RotateCcw size={13} aria-hidden="true" /> Thử lại
          </button>
        </div>
      )}

      {versions && versions.length === 0 && (
        <div className="border-2 border-dashed border-black/30 bg-gray-50 px-4 py-10 text-center">
          <History size={22} className="mx-auto mb-2 text-text-muted" aria-hidden="true" />
          <p className="text-sm font-black uppercase text-black">Chưa có version nào được tải lên</p>
          <p className="mt-1 text-xs font-medium text-text-muted">
            Designer cần upload ít nhất một version trước khi Character có thể publish lên Store.
          </p>
        </div>
      )}

      {versions && versions.length > 0 && (
        <fieldset disabled={isSubmitting} className="min-w-0">
          <legend className="mb-2.5 text-xs font-black uppercase tracking-wider text-black">
            Danh sách version khả dụng ({versions.length})
          </legend>
          <div role="radiogroup" className="flex flex-col gap-2.5">
            {versions.map((item) => {
              const checked = item.versionId === selectedVersionId;
              const isStoreVersion = item.versionId === storeVersionId;
              return (
                <label
                  key={item.versionId}
                  className={`relative flex cursor-pointer gap-3 border-2 border-black p-3.5 transition-all duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                    checked
                      ? "bg-primary/25 shadow-[3px_3px_0_0_#000]"
                      : "bg-white hover:bg-primary/10"
                  }`}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={item.versionId}
                    checked={checked}
                    onChange={() => setSelectedVersionId(item.versionId)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#1f432b]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black uppercase text-black">
                        Version {item.versionNumber}
                      </span>
                      {isStoreVersion && (
                        <span className="border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                          {character.status === "PUBLISHED" ? "Đang bán trên Store" : "Bản publish trước đó"}
                        </span>
                      )}
                      {item.isCurrent && (
                        <span className="border border-black bg-[#bae6fd] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
                          Bản mới nhất của Designer
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-bold text-text-muted tabular-nums">
                        {formatDate(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs font-medium text-text-muted">
                      {item.changelog || "Chưa có changelog."}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black uppercase text-black tabular-nums">
                      <Spec>{item.format}</Spec>
                      <Spec>{item.width}×{item.height}px</Spec>
                      <Spec>{item.frameCount} khung hình</Spec>
                      {item.frameDelayMs > 0 && <Spec>{item.frameDelayMs} ms/khung hình</Spec>}
                      <Spec>{formatBytes(item.byteSize)}</Spec>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {submitError && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 border-2 border-black bg-[#fee2e2] px-3.5 py-2.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
          {submitError}
        </p>
      )}
    </StoreModal>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-black bg-gray-100 px-1.5 py-0.5 text-black">
      {children}
    </span>
  );
}

function VersionListSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-label="Đang tải danh sách version">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[88px] animate-pulse border-2 border-black/15 bg-gray-100" />
      ))}
    </div>
  );
}
