"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Grid, Loader2, Sparkles } from "lucide-react";
import PixelArtStudio from "@/features/designer/components/PixelArtStudio";
import { linkedCommissionId } from "@/features/designer/commission-link";
import {
  getStoredMatrixSize,
  sortVersionsNewestFirst,
  type MatrixSize,
} from "@/features/designer/context/DesignerCharactersContext";
import {
  fetchCharacterVersions,
  fetchMyCharacters,
  formatDesignerApiError,
  type DesignerCharacterItem,
} from "@/lib/api/designerCharacters";
import { fetchAllPages } from "@/lib/api/paging";

export default function DesignerCharacterStudioPage() {
  const params = useParams<{ characterId: string }>();
  const router = useRouter();
  const characterId = Number(params?.characterId);

  const [character, setCharacter] = useState<DesignerCharacterItem | null>(null);
  const [latestArtworkUrl, setLatestArtworkUrl] = useState<string | null>(null);
  const [fallbackArtworkUrl, setFallbackArtworkUrl] = useState<string | null>(null);
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
      fetchAllPages(async (page) => {
        const res = await fetchMyCharacters({ page, size: 100 });
        return { items: res.items, totalPages: res.meta.totalPages };
      }),
      fetchCharacterVersions(characterId),
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
          const versionCached =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`character_version_artwork_${newest.versionId}`)
              : null;
          const charCached =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`character_artwork_${characterId}`)
              : null;
          const localFallback = versionCached || charCached || null;

          setLatestArtworkUrl(newest.previewGifUrl || localFallback);
          setFallbackArtworkUrl(localFallback);
          setNextVersionNumber(newest.versionNumber + 1);
        } else {
          // Empty Character (0 versions) -> blank canvas
          setLatestArtworkUrl(null);
          setFallbackArtworkUrl(null);
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
  }, [characterId]);

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

  const commissionId = linkedCommissionId(character.description);
  const backHref = commissionId ? `/designer/commissions/${commissionId}` : "/designer/characters";

  return (
    <div className="flex flex-col">
      {/* Studio document bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[var(--ps-chrome)] px-3 py-1.5">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-studio-line px-2.5 py-1 text-[11px] font-semibold text-studio-ink hover:bg-slate-100"
          >
            <ArrowLeft size={14} /> {commissionId ? `Về Commission #${commissionId}` : "Quay lại danh sách"}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-semibold text-studio-ink">{character.characterName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-studio-accent-hover px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                <Grid size={11} /> {lockedMatrixSize}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <Sparkles size={11} /> Tạo phiên bản mới v{nextVersionNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {latestArtworkUrl
                ? "Bản mới nhất đã được hiển thị trên bảng vẽ để bạn tiếp tục vẽ phiên bản mới."
                : `Nhân vật chưa có phiên bản nào — Bảng vẽ trống ${lockedMatrixSize} để tạo v1.`}
            </p>
          </div>
        </div>
        {commissionId && (
          <p className="max-w-sm text-[11px] text-slate-500">
            Character của <strong className="text-studio-ink">Commission #{commissionId}</strong>. Lưu bao nhiêu version tùy ý,
            rồi{" "}
            <Link href={backHref} className="font-bold text-studio-link underline">quay lại commission</Link> để chọn version nộp staff duyệt.
          </p>
        )}
      </div>

      {/* Pixel Art Studio Canvas */}
      <PixelArtStudio
        key={`${character.characterId}-${lockedMatrixSize}-${nextVersionNumber}`}
        characterId={character.characterId}
        initialCharacterName={character.characterName}
        initialDescription={character.description ?? ""}
        initialArtworkUrl={latestArtworkUrl}
        fallbackArtworkUrl={fallbackArtworkUrl}
        targetVersionNumber={nextVersionNumber}
        lockedMatrixSize={lockedMatrixSize}
        hideStoreActions={Boolean(commissionId)}
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
