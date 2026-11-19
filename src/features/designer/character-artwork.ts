import type { DesignerCharacterItem } from "@/lib/api/designerCharacters";

/** Best available preview for a character: cached local render first, then the server GIF. */
export function getCharacterArtwork(character: DesignerCharacterItem): string | null {
  if (typeof window !== "undefined") {
    try {
      if (character.currentVersion?.versionId) {
        const versionCached = window.localStorage.getItem(
          `character_version_artwork_${character.currentVersion.versionId}`,
        );
        if (versionCached) return versionCached;
      }
      const cached = window.localStorage.getItem(`character_artwork_${character.characterId}`);
      if (cached && character.totalVersions > 0) return cached;
    } catch {
      // storage unavailable
    }
  }
  return character.currentVersion?.previewGifUrl ?? null;
}
