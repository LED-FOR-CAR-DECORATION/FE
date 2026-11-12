"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { AlertTriangle, History, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
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
  review: { title: "Duyệt & Publish Character", confirm: (version) => `Publish version ${version}` },
  change: { title: "Đổi Version trên Store", confirm: (version) => `Chuyển sang version ${version}` },
  republish: { title: "Republish lên Store", confirm: (version) => `Republish version ${version}` },
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
    <Modal
      title={copy.title}
      description="Chọn chính xác version sẽ được kích hoạt để hiển thị và bán cho khách hàng trên Store."
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          <p className="mr-auto text-xs font-medium text-text-muted" aria-live="polite">
            {isSameAsLive
              ? "Version này hiện đang hoạt động trên Store — vui lòng chọn version khác."
              : selectedVersion
                ? `Đã chọn: Version ${selectedVersion.versionNumber}`
                : "Chưa chọn version nào"}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#cfe0d4] bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-[#eef8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canConfirm}
            className="inline-flex items-center gap-2 rounded-lg border border-[#3f9660] bg-gradient-to-br from-[#8bd49f] to-[#5fb97d] px-4 py-2 text-sm font-black text-[#10351f] shadow-[2px_2px_0_#c6e8cd] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#c6e8cd] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-none disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {selectedVersion ? copy.confirm(selectedVersion.versionNumber) : "Vui lòng chọn version"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#e3efe6] bg-[#f6fbf7] p-3">
        <Image
          src={character.thumbnailUrl}
          alt={`Thumbnail của ${character.name}`}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-lg border border-[#d8e6dc] bg-white object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{character.name}</p>
          <p className="truncate text-xs font-medium text-text-muted">
            {character.characterId} · Designer: {character.creatorName}
          </p>
        </div>
        <StatusBadge status={character.status} />
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-lg border border-[#cfe5d6] bg-[#f1faf4] px-3 py-2 text-xs font-medium text-[#2c5a3f]">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <span>
          <strong>Quy tắc BR-10 &amp; BR-14:</strong> Chỉ Manager mới có quyền publish. Hệ thống không tự động chọn
          version cho bạn — bản upload mới nhất chưa hẳn đã phù hợp. Vui lòng kiểm tra changelog và thông số kỹ thuật
          trước khi kích hoạt.
        </span>
      </p>

      {!versions && !loadError && <VersionListSkeleton />}

      {loadError && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <AlertTriangle size={22} className="text-red-600" />
          <p className="text-sm font-semibold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <RotateCcw size={13} /> Thử lại
          </button>
        </div>
      )}

      {versions && versions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#cfe0d4] px-4 py-10 text-center">
          <History size={22} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm font-bold">Chưa có version nào được tải lên</p>
          <p className="mt-1 text-xs text-text-muted">
            Designer cần upload ít nhất một version trước khi Character có thể publish lên Store.
          </p>
        </div>
      )}

      {versions && versions.length > 0 && (
        <fieldset disabled={isSubmitting} className="min-w-0">
          <legend className="mb-2 text-xs font-black uppercase tracking-wide text-text-muted">
            Danh sách version khả dụng ({versions.length})
          </legend>
          <div role="radiogroup" className="flex flex-col gap-2.5">
            {versions.map((item) => {
              const checked = item.versionId === selectedVersionId;
              const isStoreVersion = item.versionId === storeVersionId;
              return (
                <label
                  key={item.versionId}
                  className={`relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#48a56a]/25 ${
                    checked
                      ? "border-[#3f9660] bg-[#effaf2] shadow-[3px_3px_0_#c6e8cd]"
                      : "border-[#e0ebe3] bg-white hover:border-[#a3d7b2] hover:bg-[#f8fdf9]"
                  }`}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={item.versionId}
                    checked={checked}
                    onChange={() => setSelectedVersionId(item.versionId)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#2f8a55]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black">Version {item.versionNumber}</span>
                      {isStoreVersion && (
                        <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-black uppercase text-green-800">
                          {character.status === "Published" ? "Đang bán trên Store" : "Bản publish trước đó"}
                        </span>
                      )}
                      {item.isCurrent && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase text-sky-700">
                          Bản mới nhất của Designer
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-medium text-text-muted">{formatDate(item.createdAt)}</span>
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[#3d5a47]">
                      {item.changelog || "Chưa có changelog."}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-text-muted">
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
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {submitError}
        </p>
      )}
    </Modal>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-[#e0ebe3] bg-[#f6fbf7] px-1.5 py-0.5">{children}</span>;
}

function VersionListSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-label="Đang tải danh sách version">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[88px] animate-pulse rounded-xl border border-[#e0ebe3] bg-[#f3f9f5]" />
      ))}
    </div>
  );
}
