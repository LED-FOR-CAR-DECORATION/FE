"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Grid, Loader2, Sparkles } from "lucide-react";
import PixelArtStudio from "@/features/designer/components/PixelArtStudio";
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

export default function DesignerCharacterStudioPage() {
  const params = useParams<{ characterId: string }>();
  const router = useRouter();
  const characterId = Number(params?.characterId);

  const [character, setCharacter] = useState<DesignerCharacterItem | null>(null);
  const [latestArtworkUrl, setLatestArtworkUrl] = useState<string | null>(null);
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
      fetchMyCharacters({ page: 0, size: 100 }),
      fetchCharacterVersions(characterId),
    ])
      .then(([charRes, rawVersions]) => {
        if (cancelled) return;
        const found = charRes.items.find((c) => c.characterId === characterId) ?? null;
        if (!found) {
          setError("Không tìm thấy Character này trong danh sách của bạn.");
          return;
        }
        setCharacter(found);

        const sorted = sortVersionsNewestFirst(rawVersions);
        if (sorted.length > 0) {
          const newest = sorted[0];
          const cached =
            typeof window !== "undefined"
              ? window.localStorage.getItem(`character_artwork_${characterId}`)
              : null;
          setLatestArtworkUrl(newest.previewGifUrl || cached || null);
          setNextVersionNumber(newest.versionNumber + 1);
        } else {
          // Empty Character (0 versions) -> blank canvas
          setLatestArtworkUrl(null);
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
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-sm font-semibold text-[#1f432b]">
        <Loader2 size={24} className="animate-spin text-[#2d6a4f]" />
        <span>Đang chuẩn bị Pixel Art Studio & kế thừa phiên bản...</span>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-base font-bold text-red-700">{error || "Không tìm thấy nhân vật."}</p>
        <Link
          href="/designer/characters"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-bold text-white"
        >
          <ArrowLeft size={15} /> Quay lại Designer Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Studio Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8e6dc] bg-white px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/designer/characters?characterId=${character.characterId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8e6dc] bg-[#f7fbf8] px-3 py-1.5 text-xs font-bold text-[#1f432b] hover:bg-[#eaf5ed]"
          >
            <ArrowLeft size={14} /> Quay lại Dashboard
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#1f432b]">{character.characterName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1f432b] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                <Grid size={11} /> {lockedMatrixSize}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <Sparkles size={11} /> Đang vẽ v{nextVersionNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {latestArtworkUrl
                ? "Đã nạp pixel phiên bản mới nhất lên canvas để bạn vẽ kế thừa."
                : `Character trống (0 phiên bản) — Khởi tạo bảng vẽ trắng ${lockedMatrixSize}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Pixel Art Studio Canvas */}
      <PixelArtStudio
        key={`${character.characterId}-${lockedMatrixSize}-${nextVersionNumber}`}
        characterId={character.characterId}
        initialCharacterName={character.characterName}
        initialDescription={character.description ?? ""}
        initialArtworkUrl={latestArtworkUrl}
        targetVersionNumber={nextVersionNumber}
        lockedMatrixSize={lockedMatrixSize}
        onSaveVersion={() => {
          router.push(`/designer/characters?characterId=${character.characterId}`);
        }}
        onCancel={() => {
          router.push(`/designer/characters?characterId=${character.characterId}`);
        }}
      />
    </div>
  );
}

