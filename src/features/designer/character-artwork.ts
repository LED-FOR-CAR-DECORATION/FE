import type { DesignerCharacterItem } from "@/lib/api/designerCharacters";
import { loadStudioDraft } from "./studio-draft";

/** Best available preview for a character: unsaved local draft first, then cached version render, then server GIF. */
export function getCharacterArtwork(character: DesignerCharacterItem): string | null {
  if (typeof window !== "undefined") {
    try {
      const draft = loadStudioDraft(character.characterId);
      if (
        draft?.previewDataUrl &&
        (draft.doc.pixels.some(Boolean) || draft.doc.texts.length > 0)
      ) {
        return draft.previewDataUrl;
      }
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
