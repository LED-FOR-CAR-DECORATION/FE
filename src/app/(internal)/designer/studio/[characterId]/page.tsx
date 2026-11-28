"use client";

import { fetchAllMyCharactersCached, fetchCharacterVersionsCached } from "@/features/designer/designer-characters-cache";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Grid, Loader2, Sparkles } from "lucide-react";
import PixelArtStudio from "@/features/designer/components/PixelArtStudio";
import { linkedCommissionId } from "@/features/designer/commission-link";
import {
  getStoredMatrixSize,
  sortVersionsNewestFirst,
  type MatrixSize,
} from "@/features/designer/context/DesignerCharactersContext";
import {
  formatDesignerApiError,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";

export default function DesignerCharacterStudioPage() {
  const params = useParams<{ characterId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = Number(params?.characterId);
  const requestedVersionIdParam = Number(searchParams?.get("versionId"));
  const requestedVersionId =
    Number.isFinite(requestedVersionIdParam) && requestedVersionIdParam > 0
      ? requestedVersionIdParam
      : null;
  const requestedNewVersion = searchParams?.get("newVersion") === "1";

  const [character, setCharacter] = useState<DesignerCharacterItem | null>(null);
  const [latestArtworkUrl, setLatestArtworkUrl] = useState<string | null>(null);
  const [fallbackArtworkUrl, setFallbackArtworkUrl] = useState<string | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  const [currentVersionListedOnStore, setCurrentVersionListedOnStore] = useState<boolean>(false);
  const [isSelectedLatestVersion, setIsSelectedLatestVersion] = useState<boolean>(true);
  const [nextVersionNumber, setNextVersionNumber] = useState<number>(1);
  const [lockedMatrixSize, setLockedMatrixSize] = useState<MatrixSize>("32x32");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(characterId) || characterId <= 0) {
      setError("Mã Character không hợp lệ.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLockedMatrixSize(getStoredMatrixSize(characterId));

    Promise.all([
      // Danh sách dùng chung cache với các trang designer khác (BE chưa có GET nhân vật theo id).
      fetchAllMyCharactersCached(),
      fetchCharacterVersionsCached(characterId),
    ])
      .then(([characters, rawVersions]) => {
        if (cancelled) return;
        const found = characters.find((c) => c.characterId === characterId) ?? null;
        if (!found) {
          setError("Không tìm thấy Character này trong danh sách của bạn.");
          return;
        }
        setCharacter(found);

        const sorted = sortVersionsNewestFirst(rawVersions);
        if (sorted.length > 0) {
          const newest = sorted[0];
          const target =
            (requestedVersionId
              ? sorted.find((v) => v.versionId === requestedVersionId)
              : undefined) ?? newest;
          const isLatest = target.versionId === newest.versionId;

          const versionCached =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`character_version_artwork_${target.versionId}`)
              : null;
          const charCached =
            isLatest && typeof window !== "undefined"
              ? window.localStorage.getItem(`character_artwork_${characterId}`)
              : null;
          const localFallback = versionCached || charCached || null;

          setLatestArtworkUrl(target.previewGifUrl || localFallback);
          setFallbackArtworkUrl(localFallback);
          setCurrentVersionId(target.versionId);
          setCurrentVersionNumber(target.versionNumber);
          setCurrentVersionListedOnStore(Boolean(target.isListedOnStore || target.productId));
          setIsSelectedLatestVersion(isLatest);
          setNextVersionNumber(newest.versionNumber + 1);
        } else {
          // Empty Character (0 versions) -> blank canvas
          setLatestArtworkUrl(null);
          setFallbackArtworkUrl(null);
          setCurrentVersionId(null);
          setCurrentVersionNumber(null);
          setCurrentVersionListedOnStore(false);
          setIsSelectedLatestVersion(true);
          setNextVersionNumber(1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatDesignerApiError(err, "Không thể tải dữ liệu Studio cho nhân vật này."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [characterId, requestedVersionId]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-sm font-semibold text-studio-ink">
        <Loader2 size={24} className="animate-spin text-studio-link" />
        <span>Đang chuẩn bị Pixel Art Studio &amp; nạp phiên bản mới nhất...</span>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-[4px] border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-base font-bold text-red-700">{error || "Không tìm thấy nhân vật."}</p>
        <Link
          href="/designer/characters"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-studio-accent px-4 py-2 text-sm font-bold text-white"
        >
          <ArrowLeft size={15} /> Quay lại Danh sách nhân vật
        </Link>
      </div>
    );
  }

  const commissionId = character.commissionId ?? linkedCommissionId(character.description) ?? undefined;
  const isCommissionCharacter = (character.characterType ?? "STORE") === "COMMISSION" || Boolean(commissionId);
  const backHref = commissionId ? `/designer/commissions/${commissionId}` : "/designer/characters";
  const isCreateNewVersionMode = Boolean(
    currentVersionId && (requestedNewVersion || !isSelectedLatestVersion),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Studio document bar */}
      <div className="ase-bar flex flex-wrap items-center justify-between gap-3 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="ase-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#1f2a24]"
          >
            <ArrowLeft size={14} /> {commissionId ? `Về Commission #${commissionId}` : "Quay lại danh sách"}
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[13px] font-black uppercase tracking-tight text-[#1f2a24]">
                {character.characterName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#163d2c] bg-[#2d6a4f] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                <Grid size={11} /> {lockedMatrixSize}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[11px] font-bold ${
                  isCommissionCharacter
                    ? "border-amber-400 bg-amber-100 text-amber-900"
                    : "border-sky-400 bg-sky-100 text-sky-900"
                }`}
              >
                {isCommissionCharacter
                  ? commissionId
                    ? `Commission #${commissionId}`
                    : "Loại: Commission"
                  : "Loại: Bán Store"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#2d6a4f] bg-[#dcebe2] px-2 py-0.5 text-[11px] font-bold text-[#163d2c]">
                <Sparkles size={11} />
                {isCreateNewVersionMode && currentVersionNumber
                  ? `Tạo phiên bản mới v${nextVersionNumber} (từ v${currentVersionNumber})`
                  : currentVersionNumber
                    ? currentVersionListedOnStore
                      ? `v${currentVersionNumber} (Đã lên Store) → Lưu mới v${nextVersionNumber}`
                      : `Đang chỉnh sửa v${currentVersionNumber}`
                    : "Chưa có phiên bản · Bản nháp v1"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#4b554f]">
              {isCreateNewVersionMode && currentVersionNumber
                ? `Đang phác thảo phiên bản mới v${nextVersionNumber} từ v${currentVersionNumber}. Tự động lưu nháp liên tục; bấm "Lưu v${nextVersionNumber}" khi hoàn thành.`
                : currentVersionNumber
                  ? currentVersionListedOnStore
                    ? `v${currentVersionNumber} đã niêm yết trên Store nên được bảo vệ. Tự động lưu nháp khi vẽ và bấm "Lưu v${nextVersionNumber}" khi hoàn thành.`
                    : `Đang chỉnh sửa v${currentVersionNumber}. Tự động lưu nháp liên tục như Word; bấm "Lưu v${currentVersionNumber}" để cập nhật bản vẽ.`
                  : `Nhân vật chưa có phiên bản hoàn thiện — tự động lưu nháp khi vẽ trên khung ${lockedMatrixSize} và bấm "Lưu v1" khi hoàn thành.`}
            </p>
          </div>
        </div>
        {commissionId && (
          <p className="max-w-sm text-[11px] text-[#4b554f]">
            Character của <strong className="text-[#1f2a24]">Commission #{commissionId}</strong>. Lưu bao nhiêu version tùy ý,
            rồi{" "}
            <Link href={backHref} className="font-bold text-[#2d6a4f] underline">quay lại commission</Link> để chọn version nộp staff duyệt.
          </p>
        )}
      </div>

      {/* Pixel Art Studio Canvas */}
      <PixelArtStudio
        key={`${character.characterId}-${lockedMatrixSize}-${currentVersionId ?? 0}-${isCreateNewVersionMode ? "new" : "edit"}`}
        characterId={character.characterId}
        initialCharacterName={character.characterName}
        initialDescription={character.description ?? ""}
        initialArtworkUrl={latestArtworkUrl}
        fallbackArtworkUrl={fallbackArtworkUrl}
        currentVersionId={currentVersionId}
        currentVersionNumber={currentVersionNumber}
        currentVersionListedOnStore={currentVersionListedOnStore}
        createNewVersionMode={isCreateNewVersionMode}
        targetVersionNumber={nextVersionNumber}
        lockedMatrixSize={lockedMatrixSize}
        characterType={character.characterType ?? (commissionId ? "COMMISSION" : "STORE")}
        commissionId={commissionId}
        hideStoreActions={isCommissionCharacter}
        onSaveVersion={() => {
          router.push(
            `/designer/characters?saved=1&name=${encodeURIComponent(character.characterName)}`,
          );
        }}
        onCancel={() => {
          router.push("/designer/characters");
        }}
      />
    </div>
  );
}
