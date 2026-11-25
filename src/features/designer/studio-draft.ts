import { encodeFramesToGifDataUrl } from "./domain/gifCodec";
import {
  renderDocumentToDataUrl,
  type PixelDocumentState,
  type PixelLayer,
} from "./domain/pixelDocument";

export interface StudioDraftPayload {
  characterName: string;
  description: string;
  doc: PixelDocumentState;
  frames?: PixelDocumentState[];
  activeFrameIndex?: number;
  frameDelayMs?: number;
  layers?: PixelLayer[];
  activeLayerId?: string;
  previewDataUrl: string;
  baseVersionId?: number | null;
  baseVersionNumber?: number | null;
  updatedAt: string;
}

export interface VersionFramesCachePayload {
  frames: PixelDocumentState[];
  frameDelayMs: number;
  layers?: PixelLayer[];
}

function isValidPixelLayer(candidate: unknown): candidate is PixelLayer {
  if (!candidate || typeof candidate !== "object") return false;
  const l = candidate as Partial<PixelLayer>;
  return (
    typeof l.id === "string" &&
    l.id.length > 0 &&
    typeof l.name === "string" &&
    typeof l.visible === "boolean" &&
    typeof l.locked === "boolean" &&
    typeof l.opacity === "number"
  );
}

function getDraftStorageKey(characterId?: number | null): string {
  return characterId && characterId > 0
    ? `studio_draft_${characterId}`
    : "studio_draft_new";
}

function getVersionFramesStorageKey(versionId: number): string {
  return `character_version_frames_${versionId}`;
}

function isValidPixelDocument(candidate: unknown): candidate is PixelDocumentState {
  if (!candidate || typeof candidate !== "object") return false;
  const doc = candidate as Partial<PixelDocumentState>;
  return (
    typeof doc.width === "number" &&
    doc.width > 0 &&
    typeof doc.height === "number" &&
    doc.height > 0 &&
    Array.isArray(doc.pixels) &&
    doc.pixels.length === doc.width * doc.height &&
    Array.isArray(doc.texts)
  );
}

export function loadStudioDraft(
  characterId?: number | null,
): StudioDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(characterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioDraftPayload>;
    if (!parsed || !isValidPixelDocument(parsed.doc)) {
      return null;
    }

    const validFrames = Array.isArray(parsed.frames)
      ? parsed.frames.filter(isValidPixelDocument)
      : [];
    const normalizedFrames = validFrames.length > 0 ? validFrames : [parsed.doc];
    const safeIdx =
      typeof parsed.activeFrameIndex === "number" &&
      parsed.activeFrameIndex >= 0 &&
      parsed.activeFrameIndex < normalizedFrames.length
        ? parsed.activeFrameIndex
        : 0;
    const safeDelay =
      typeof parsed.frameDelayMs === "number" && parsed.frameDelayMs >= 30
        ? parsed.frameDelayMs
        : 100;

    const validLayers = Array.isArray(parsed.layers)
      ? parsed.layers.filter(isValidPixelLayer)
      : [];

    return {
      characterName: typeof parsed.characterName === "string" ? parsed.characterName : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      doc: normalizedFrames[safeIdx],
      frames: normalizedFrames,
      activeFrameIndex: safeIdx,
      frameDelayMs: safeDelay,
      layers: validLayers.length > 0 ? validLayers : undefined,
      activeLayerId:
        typeof parsed.activeLayerId === "string" ? parsed.activeLayerId : undefined,
      previewDataUrl: typeof parsed.previewDataUrl === "string" ? parsed.previewDataUrl : "",
      baseVersionId: typeof parsed.baseVersionId === "number" ? parsed.baseVersionId : null,
      baseVersionNumber:
        typeof parsed.baseVersionNumber === "number" ? parsed.baseVersionNumber : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function hasStudioDraft(characterId?: number | null): boolean {
  const draft = loadStudioDraft(characterId);
  if (!draft) return false;
  const allFrames = draft.frames && draft.frames.length > 0 ? draft.frames : [draft.doc];
  return allFrames.some(
    (f) =>
      f.pixels.some(Boolean) ||
      f.texts.length > 0 ||
      Boolean(
        f.layerContents &&
          Object.values(f.layerContents).some(
            (cel) => cel.pixels.some(Boolean) || cel.texts.length > 0,
          ),
      ),
  );
}

export function saveStudioDraft(
  characterId: number | null | undefined,
  payload: Omit<StudioDraftPayload, "previewDataUrl" | "updatedAt"> & {
    previewDataUrl?: string;
  },
): StudioDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const frames = payload.frames && payload.frames.length > 0 ? payload.frames : [payload.doc];
    const frameDelayMs = payload.frameDelayMs ?? 100;
    const activeCompositeDoc = frames[payload.activeFrameIndex ?? 0] ?? payload.doc;
    const previewDataUrl =
      payload.previewDataUrl ||
      (frames.length > 1
        ? encodeFramesToGifDataUrl(frames, frameDelayMs, 1)
        : renderDocumentToDataUrl(activeCompositeDoc, "PNG", 1));

    const fullPayload: StudioDraftPayload = {
      characterName: payload.characterName,
      description: payload.description,
      doc: payload.doc,
      frames,
      activeFrameIndex: payload.activeFrameIndex ?? 0,
      frameDelayMs,
      layers: payload.layers,
      activeLayerId: payload.activeLayerId,
      previewDataUrl,
      baseVersionId: payload.baseVersionId ?? null,
      baseVersionNumber: payload.baseVersionNumber ?? null,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      getDraftStorageKey(characterId),
      JSON.stringify(fullPayload),
    );
    return fullPayload;
  } catch {
    return null;
  }
}

export function clearStudioDraft(characterId?: number | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getDraftStorageKey(characterId));
  } catch {
    // Ignore storage removal errors
  }
}

export function saveVersionFramesCache(
  versionId: number,
  frames: PixelDocumentState[],
  frameDelayMs: number,
  layers?: PixelLayer[],
): void {
  if (typeof window === "undefined" || !versionId) return;
  try {
    const payload: VersionFramesCachePayload = { frames, frameDelayMs, layers };
    window.localStorage.setItem(
      getVersionFramesStorageKey(versionId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota errors
  }
}

export function loadVersionFramesCache(
  versionId?: number | null,
): VersionFramesCachePayload | null {
  if (typeof window === "undefined" || !versionId) return null;
  try {
    const raw = window.localStorage.getItem(getVersionFramesStorageKey(versionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VersionFramesCachePayload>;
    if (!parsed || !Array.isArray(parsed.frames)) return null;
    const validFrames = parsed.frames.filter(isValidPixelDocument);
    if (validFrames.length === 0) return null;
    const validLayers = Array.isArray(parsed.layers)
      ? parsed.layers.filter(isValidPixelLayer)
      : [];
    return {
      frames: validFrames,
      frameDelayMs:
        typeof parsed.frameDelayMs === "number" && parsed.frameDelayMs >= 30
          ? parsed.frameDelayMs
          : 100,
      layers: validLayers.length > 0 ? validLayers : undefined,
    };
  } catch {
    return null;
  }
}
