"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Keyboard,
  Layers,
  LayoutGrid,
  Loader2,
  Minus,
  Move,
  PaintBucket,
  Pause,
  Pen,
  Pencil,
  Pipette,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Scan,
  Scissors,
  Sparkles,
  Square,
  Star,
  Store,
  Trash,
  Type,
  Undo2,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  createCharacterVersion,
  createDesignerCharacter,
  deleteCharacterVersion,
  formatDesignerApiError,
  isStoreCharacterType,
  updateDesignerCharacter,
  uploadDesignerAssetFile,
  type CharacterType,
} from "@/lib/api/designerCharacters";
import {
  clearStudioDraft,
  loadStudioDraft,
  loadVersionFramesCache,
  saveStudioDraft,
  saveVersionFramesCache,
} from "../studio-draft";
import {
  DEFAULT_SWATCHES,
  PALETTE_PRESETS,
  extractPaletteFromFrames,
  loadCharacterPalette,
  loadCustomPalettePresets,
  saveCharacterPalette,
  saveCustomPalettePresets,
  type ColorSwatch,
  type PalettePreset,
} from "../palette-storage";
import StudioLayersPanel from "./StudioLayersPanel";
import {
  decodeGifBytesToFrames,
  encodeFramesToGifBlob,
  encodeFramesToGifDataUrl,
} from "../domain/gifCodec";
import { apiCreateStoreProduct } from "@/lib/api/products";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import { saveCreatedStoreProduct } from "@/features/store-listing/services/store-listing.service";
import {
  brushStroke,
  CANVAS_SIZE_OPTIONS,
  clearDocumentRegion,
  compositeDocument,
  createDefaultLayer,
  createEmptyDocument,
  drawShape,
  ensureLayeredFrame,
  extractRegionPixels,
  fitsPixelText,
  flattenLayersForFrame,
  flipRegionInDocument,
  floodFill,
  GLYPH_SIZE_PRESETS,
  hexToRgb,
  hsvToRgb,
  normalizeHex,
  normalizeSelectionRect,
  rasterizeImageToPixels,
  rasterizeTextBlockIntoPixels,
  renderDocumentToDataUrl,
  rgbToHex,
  rgbToHsv,
  stampDocumentRegion,
  supportsPixelText,
  type ExportFormat,
  type ImportFitMode,
  type MirrorMode,
  type PixelDocumentState,
  type PixelLayer,
  type PixelShape,
  type PixelText,
  type PixelTool,
  type SelectionRect,
} from "../domain/pixelDocument";

export type { ColorSwatch, PixelTool, MirrorMode, PixelShape, ExportFormat, ImportFitMode };

function constrainPointByShift(
  start: PixelPoint,
  point: PixelPoint,
  mode: "SHAPE" | "MOVE",
  shapeKind: PixelShape,
): PixelPoint {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  if (mode === "MOVE") {
    return Math.abs(dx) >= Math.abs(dy)
      ? { x: point.x, y: start.y }
      : { x: start.x, y: point.y };
  }
  if (shapeKind === "LINE") {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > absDy * 2) return { x: point.x, y: start.y };
    if (absDy > absDx * 2) return { x: start.x, y: point.y };
    const step = Math.max(absDx, absDy);
    return {
      x: start.x + (dx >= 0 ? step : -step),
      y: start.y + (dy >= 0 ? step : -step),
    };
  }
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + (dx >= 0 ? side : -side),
    y: start.y + (dy >= 0 ? side : -side),
  };
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface PixelArtExportPayload {
  dataUrl: string;
  blob: Blob | null;
  characterName: string;
  description: string;
  width: number;
  height: number;
  characterId?: number;
}

export interface PixelArtStudioProps {
  /** Khi vẽ thêm version cho một Character đã có, truyền ID của Character đó */
  characterId?: number | null;
  /** Tên nhân vật ban đầu */
  initialCharacterName?: string;
  /** Mô tả nhân vật ban đầu */
  initialDescription?: string;
  /** URL ảnh của phiên bản trước đó cần kế thừa lên canvas */
  initialArtworkUrl?: string | null;
  /** Data URL dự phòng cục bộ nếu URL ảnh từ CDN bị chặn CORS khi nạp lên Canvas */
  fallbackArtworkUrl?: string | null;
  /** ID phiên bản hiện tại (mới nhất) nếu đã chốt ít nhất 1 phiên bản */
  currentVersionId?: number | null;
  /** Số phiên bản hiện tại (ví dụ 1 cho v1) */
  currentVersionNumber?: number | null;
  /** Phiên bản hiện tại đã gắn sản phẩm trên Store (nếu true sẽ không ghi đè, chỉ chốt bản mới) */
  currentVersionListedOnStore?: boolean;
  /** Chế độ tạo phiên bản mới thay vì ghi đè phiên bản hiện tại */
  createNewVersionMode?: boolean;
  /** Số phiên bản kế tiếp (ví dụ v2, v3) */
  targetVersionNumber?: number;
  /** Khóa cố định kích thước ma trận của Character (32x32, 64x32 hoặc 64x64) */
  lockedMatrixSize?: "32x32" | "64x32" | "64x64";
  /** Callback khi bấm "Lưu phiên bản" (Save Version - DB nội bộ) */
  onSaveVersion?: (payload: PixelArtExportPayload & { versionId?: number; isNewCharacter?: boolean }) => void;
  /** Callback khi bấm "Đăng bày bán" (Publish to Store - Trạng thái UNPUBLISHED) */
  onPublishToStore?: (payload: PixelArtExportPayload & { versionId?: number; isNewCharacter?: boolean }) => void;
  /** Legacy callback */
  onCharacterSaved?: (payload: PixelArtExportPayload) => void;
  /** Callback tùy chọn để hủy/thu gọn Studio */
  onCancel?: () => void;
  /** Ẩn nút "Đăng bày bán" (ví dụ character thuộc commission riêng của khách). */
  hideStoreActions?: boolean;
  /** Loại character (STORE hoặc COMMISSION) */
  characterType?: CharacterType;
  /** ID commission liên kết nếu là character COMMISSION */
  commissionId?: number;
}

const MAX_HISTORY_STEPS = 30;
const ZOOM_STEPS = [1, 1.25, 1.5] as const;

export default function PixelArtStudio({
  characterId: propCharacterId = null,
  initialCharacterName = "",
  initialDescription = "",
  initialArtworkUrl = null,
  fallbackArtworkUrl = null,
  currentVersionId = null,
  currentVersionNumber = null,
  currentVersionListedOnStore = false,
  createNewVersionMode = false,
  targetVersionNumber,
  lockedMatrixSize,
  onSaveVersion,
  onPublishToStore,
  onCharacterSaved,
  onCancel,
  hideStoreActions = false,
  characterType = "STORE",
  commissionId,
}: PixelArtStudioProps) {
  const effectiveHideStoreActions = hideStoreActions || !isStoreCharacterType(characterType);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Primary PixelDocument state & synchronous ref for rapid pointer dragging
  const [sizeKey, setSizeKey] = useState<"32x32" | "64x32" | "64x64">(
    lockedMatrixSize ?? "32x32",
  );
  const sizeOption =
    CANVAS_SIZE_OPTIONS.find((item) => item.key === sizeKey) ??
    CANVAS_SIZE_OPTIONS[0];

  const [layers, setLayers] = useState<PixelLayer[]>(() => [createDefaultLayer()]);
  const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
  const layersRef = useRef<PixelLayer[]>(layers);
  const activeLayerIdRef = useRef<string>(activeLayerId);
  layersRef.current = layers;
  activeLayerIdRef.current = activeLayerId;

  const [frames, setFrames] = useState<PixelDocumentState[]>(() => {
    const initialOpt =
      CANVAS_SIZE_OPTIONS.find((item) => item.key === (lockedMatrixSize ?? "32x32")) ??
      CANVAS_SIZE_OPTIONS[0];
    return [
      ensureLayeredFrame(
        createEmptyDocument(initialOpt.width, initialOpt.height),
        [createDefaultLayer()],
      ),
    ];
  });
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [frameDelayMs, setFrameDelayMs] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState<number>(0);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);

  const framesRef = useRef<PixelDocumentState[]>(frames);
  const activeFrameIndexRef = useRef<number>(activeFrameIndex);
  framesRef.current = frames;
  activeFrameIndexRef.current = activeFrameIndex;

  const activeFrame = frames[activeFrameIndex] ?? frames[0];
  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0];
  const activeCel = activeFrame.layerContents?.[activeLayer.id] ?? {
    pixels: activeFrame.pixels,
    texts: activeFrame.texts,
  };
  const doc: PixelDocumentState = {
    width: activeFrame.width,
    height: activeFrame.height,
    pixels: activeCel.pixels,
    texts: activeCel.texts,
  };
  const docRef = useRef<PixelDocumentState>(doc);
  docRef.current = doc;

  const [previewDoc, setPreviewDoc] = useState<PixelDocumentState | null>(null);
  const previewDocRef = useRef<PixelDocumentState | null>(null);

  const updatePreview = useCallback((next: PixelDocumentState | null) => {
    previewDocRef.current = next;
    setPreviewDoc(next);
  }, []);

  // Undo / Redo stacks storing immutable multi-frame + layer snapshots
  const undoStackRef = useRef<
    Array<{
      frames: PixelDocumentState[];
      activeFrameIndex: number;
      layers: PixelLayer[];
      activeLayerId: string;
    }>
  >([]);
  const redoStackRef = useRef<
    Array<{
      frames: PixelDocumentState[];
      activeFrameIndex: number;
      layers: PixelLayer[];
      activeLayerId: string;
    }>
  >([]);
  const [historyMeta, setHistoryMeta] = useState({ undo: 0, redo: 0 });

  // Active gesture refs
  const isPointerDownRef = useRef(false);
  const gestureToolRef = useRef<PixelTool>("PEN");
  const strokeTouchedRef = useRef<Set<number>>(new Set());
  const strokeStartDocRef = useRef<PixelDocumentState | null>(null);
  const dragStartPixelRef = useRef<PixelPoint | null>(null);
  const lastPixelRef = useRef<PixelPoint | null>(null);
  const moveContextRef = useRef<{
    baseCleared: PixelDocumentState;
    originLeft: number;
    originTop: number;
    regionWidth: number;
    regionHeight: number;
    data: string[];
    movingTexts: PixelText[];
    staticTexts: PixelText[];
  } | null>(null);

  // Tool & visual states
  const [activeTool, setActiveTool] = useState<PixelTool>("PEN");
  const [brushSize, setBrushSize] = useState<number>(1);
  const [opacity, setOpacity] = useState<number>(100);
  const [mirrorMode, setMirrorMode] = useState<MirrorMode>("NONE");
  const [shapeKind, setShapeKind] = useState<PixelShape>("RECTANGLE");
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoomIdx, setZoomIdx] = useState<number>(0);
  const [previewScale, setPreviewScale] = useState<1 | 2 | 4>(2);
  const [hoverPixel, setHoverPixel] = useState<PixelPoint | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pasteboardRef = useRef<HTMLDivElement | null>(null);
  const [fittedCanvasWidth, setFittedCanvasWidth] = useState<number | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // Selection & clipboard state
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [clipboard, setClipboard] = useState<{
    regionWidth: number;
    regionHeight: number;
    data: string[];
  } | null>(null);

  // Palette & RGB/HSV sliders (persisted per character)
  const [selectedColor, setSelectedColor] = useState<string>("#00F5FF");
  const [hexInput, setHexInput] = useState<string>("#00F5FF");
  const [paletteSwatches, setPaletteSwatches] = useState<ColorSwatch[]>(() =>
    loadCharacterPalette(propCharacterId ?? null),
  );
  const [selectedSwatchIdx, setSelectedSwatchIdx] = useState<number>(0);
  const [customPresets, setCustomPresets] = useState<PalettePreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>("");
  const [savingPresetOpen, setSavingPresetOpen] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>("");
  const [colorPanelTab, setColorPanelTab] = useState<"SWATCH" | "SLIDERS">(
    "SWATCH",
  );
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const shortcutsMenuRef = useRef<HTMLDivElement | null>(null);

  // Text layer editor state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>("HI");
  const [textX, setTextX] = useState<number>(2);
  const [textY, setTextY] = useState<number>(2);
  const [textPresetIdx, setTextPresetIdx] = useState<number>(0);

  // Import Image modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedImageEl, setImportedImageEl] =
    useState<HTMLImageElement | null>(null);
  const [importFit, setImportFit] = useState<ImportFitMode>("CONTAIN");
  const [importBrightness, setImportBrightness] = useState<number>(100);
  const [importContrast, setImportContrast] = useState<number>(100);

  // Export File modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("PNG");
  const [exportScale, setExportScale] = useState<number>(16);

  // Character metadata & upload feedback
  const [characterName, setCharacterName] = useState<string>(initialCharacterName);
  const [description, setDescription] = useState<string>(initialDescription);
  const [activeCharacterId, setActiveCharacterId] = useState<number | null>(
    propCharacterId ?? null,
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isInheriting, setIsInheriting] = useState<boolean>(false);
  const [hasLocalDraft, setHasLocalDraft] = useState<boolean>(false);
  const [draftSavedLabel, setDraftSavedLabel] = useState<string | null>(null);
  const [reloadVersionNonce, setReloadVersionNonce] = useState<number>(0);
  const draftHydratedRef = useRef<boolean>(false);
  const userDirtyRef = useRef<boolean>(false);
  const skipDraftOnLoadRef = useRef<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Sync palette & props when character context switches
  useEffect(() => {
    setActiveCharacterId(propCharacterId ?? null);
    setPaletteSwatches(loadCharacterPalette(propCharacterId ?? null));
    setCustomPresets(loadCustomPalettePresets());
    setActivePresetId("");
    setSavingPresetOpen(false);
    if (initialCharacterName !== undefined) {
      setCharacterName(initialCharacterName);
    }
    if (initialDescription !== undefined) {
      setDescription(initialDescription);
    }
  }, [propCharacterId, initialCharacterName, initialDescription]);

  // Keep Hex text input synced whenever selectedColor changes externally (e.g. sliders, picker, swatches)
  useEffect(() => {
    setHexInput(normalizeHex(selectedColor));
  }, [selectedColor]);

  // Persist character's custom palette automatically
  useEffect(() => {
    saveCharacterPalette(activeCharacterId ?? propCharacterId ?? null, paletteSwatches);
  }, [activeCharacterId, propCharacterId, paletteSwatches]);

  // Close shortcuts popover when clicking outside
  useEffect(() => {
    if (!shortcutsOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        shortcutsMenuRef.current &&
        !shortcutsMenuRef.current.contains(event.target as Node)
      ) {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [shortcutsOpen]);

  const zoom = ZOOM_STEPS[zoomIdx] ?? 1;

  const extractActiveLayerDoc = useCallback(
    (
      frame: PixelDocumentState,
      targetLayerId: string,
      layerList: PixelLayer[],
    ): PixelDocumentState => {
      const targetLayer =
        layerList.find((l) => l.id === targetLayerId) ?? layerList[0];
      const cel = frame.layerContents?.[targetLayer.id] ?? {
        pixels: frame.pixels,
        texts: frame.texts,
      };
      return {
        width: frame.width,
        height: frame.height,
        pixels: cel.pixels,
        texts: cel.texts,
      };
    },
    [],
  );

  const updateDocument = useCallback((nextLayerDoc: PixelDocumentState) => {
    const frameIdx = activeFrameIndexRef.current;
    const layerList = layersRef.current;
    const layerId =
      layerList.find((l) => l.id === activeLayerIdRef.current)?.id ??
      layerList[0]?.id ??
      "layer-1";

    const nextFrames = framesRef.current.map((frame, i) => {
      if (i !== frameIdx) return frame;
      const ensured = ensureLayeredFrame(frame, layerList);
      const nextContents = {
        ...(ensured.layerContents ?? {}),
        [layerId]: {
          pixels: nextLayerDoc.pixels,
          texts: nextLayerDoc.texts,
        },
      };
      return {
        width: ensured.width,
        height: ensured.height,
        pixels: flattenLayersForFrame(ensured.width, ensured.height, layerList, nextContents),
        texts: [],
        layerContents: nextContents,
      };
    });

    framesRef.current = nextFrames;
    docRef.current = nextLayerDoc;
    setFrames(nextFrames);
  }, []);

  const applyTimelineState = useCallback(
    (
      nextFrames: PixelDocumentState[],
      nextActiveIdx: number,
      nextLayers?: PixelLayer[],
      nextActiveLayerId?: string,
    ) => {
      const resolvedLayers =
        nextLayers && nextLayers.length > 0 ? nextLayers : layersRef.current;
      const resolvedLayerId =
        nextActiveLayerId && resolvedLayers.some((l) => l.id === nextActiveLayerId)
          ? nextActiveLayerId
          : resolvedLayers.some((l) => l.id === activeLayerIdRef.current)
            ? activeLayerIdRef.current
            : resolvedLayers[0].id;

      const normalizedFrames = nextFrames.map((f) =>
        ensureLayeredFrame(f, resolvedLayers),
      );
      const safeIdx = Math.max(0, Math.min(normalizedFrames.length - 1, nextActiveIdx));

      layersRef.current = resolvedLayers;
      activeLayerIdRef.current = resolvedLayerId;
      framesRef.current = normalizedFrames;
      activeFrameIndexRef.current = safeIdx;
      docRef.current = extractActiveLayerDoc(
        normalizedFrames[safeIdx] ?? normalizedFrames[0],
        resolvedLayerId,
        resolvedLayers,
      );

      setLayers(resolvedLayers);
      setActiveLayerId(resolvedLayerId);
      setFrames(normalizedFrames);
      setActiveFrameIndex(safeIdx);
    },
    [extractActiveLayerDoc],
  );

  const syncHistoryCounts = useCallback(() => {
    setHistoryMeta({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, []);

  const commitTimelineChange = useCallback(
    (
      nextFrames: PixelDocumentState[],
      nextActiveIdx: number,
      nextLayers?: PixelLayer[],
      nextActiveLayerId?: string,
    ) => {
      userDirtyRef.current = true;
      undoStackRef.current = [
        ...undoStackRef.current.slice(-(MAX_HISTORY_STEPS - 1)),
        {
          frames: framesRef.current,
          activeFrameIndex: activeFrameIndexRef.current,
          layers: layersRef.current,
          activeLayerId: activeLayerIdRef.current,
        },
      ];
      redoStackRef.current = [];
      syncHistoryCounts();
      applyTimelineState(nextFrames, nextActiveIdx, nextLayers, nextActiveLayerId);
    },
    [syncHistoryCounts, applyTimelineState],
  );

  const commitDocumentChange = useCallback(
    (previousLayerSnapshot: PixelDocumentState, nextLayerDoc: PixelDocumentState) => {
      const idx = activeFrameIndexRef.current;
      const layerList = layersRef.current;
      const layerId =
        layerList.find((l) => l.id === activeLayerIdRef.current)?.id ??
        layerList[0]?.id ??
        "layer-1";

      const buildFrameWithCel = (
        baseFrame: PixelDocumentState,
        celDoc: PixelDocumentState,
      ): PixelDocumentState => {
        const ensured = ensureLayeredFrame(baseFrame, layerList);
        const nextContents = {
          ...(ensured.layerContents ?? {}),
          [layerId]: { pixels: celDoc.pixels, texts: celDoc.texts },
        };
        return {
          width: ensured.width,
          height: ensured.height,
          pixels: flattenLayersForFrame(ensured.width, ensured.height, layerList, nextContents),
          texts: [],
          layerContents: nextContents,
        };
      };

      const prevFrames = framesRef.current.map((f, i) =>
        i === idx ? buildFrameWithCel(f, previousLayerSnapshot) : f,
      );
      const nextFrames = framesRef.current.map((f, i) =>
        i === idx ? buildFrameWithCel(f, nextLayerDoc) : f,
      );

      userDirtyRef.current = true;
      undoStackRef.current = [
        ...undoStackRef.current.slice(-(MAX_HISTORY_STEPS - 1)),
        {
          frames: prevFrames,
          activeFrameIndex: idx,
          layers: layerList,
          activeLayerId: layerId,
        },
      ];
      redoStackRef.current = [];
      syncHistoryCounts();
      applyTimelineState(nextFrames, idx, layerList, layerId);
    },
    [syncHistoryCounts, applyTimelineState],
  );

  // Restore local draft if available for this exact base version; otherwise fetch committed version from BE
  useEffect(() => {
    const draftKeyId = propCharacterId ?? null;
    const rawDraft = skipDraftOnLoadRef.current ? null : loadStudioDraft(draftKeyId);
    const savedDraft =
      rawDraft &&
      (rawDraft.baseVersionId ?? null) === (currentVersionId ?? null)
        ? rawDraft
        : null;
    skipDraftOnLoadRef.current = false;

    const draftFrames = savedDraft?.frames?.length
      ? savedDraft.frames
      : savedDraft?.doc
        ? [savedDraft.doc]
        : [];
    const draftHasArtwork = draftFrames.some(
      (f) => f.pixels.some(Boolean) || f.texts.length > 0,
    );

    if (savedDraft && draftHasArtwork) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryCounts();

      const firstFrame = draftFrames[0];
      const matchingOpt = CANVAS_SIZE_OPTIONS.find(
        (opt) => opt.width === firstFrame.width && opt.height === firstFrame.height,
      );
      if (!lockedMatrixSize && matchingOpt) {
        setSizeKey(matchingOpt.key);
      }
      if (savedDraft.characterName.trim()) {
        setCharacterName(savedDraft.characterName);
      }
      if (savedDraft.description) {
        setDescription(savedDraft.description);
      }
      if (savedDraft.frameDelayMs) {
        setFrameDelayMs(savedDraft.frameDelayMs);
      }

      applyTimelineState(
        draftFrames,
        savedDraft.activeFrameIndex ?? 0,
        savedDraft.layers ?? [createDefaultLayer()],
        savedDraft.activeLayerId ?? savedDraft.layers?.[0]?.id ?? "layer-1",
      );
      setHasLocalDraft(true);
      if (savedDraft.updatedAt) {
        const parsed = new Date(savedDraft.updatedAt);
        if (!Number.isNaN(parsed.getTime())) {
          setDraftSavedLabel(
            parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          );
        }
      }
      userDirtyRef.current = true;
      draftHydratedRef.current = true;
      setIsInheriting(false);
      setStatusNotice({
        type: "info",
        message: currentVersionNumber
          ? `Đã khôi phục bản nháp gần nhất từ v${currentVersionNumber} (${draftFrames.length} frame). Bấm "Khôi phục v${currentVersionNumber}" nếu muốn quay lại bản đã chốt.`
          : `Đã khôi phục bản nháp phác thảo gần nhất (${draftFrames.length} frame).`,
      });
      return;
    }

    // Check lossless cached version frames (for multi-frame GIF versions)
    const cachedVersionFrames = currentVersionId
      ? loadVersionFramesCache(currentVersionId)
      : null;
    if (cachedVersionFrames && cachedVersionFrames.frames.length > 0) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryCounts();
      setFrameDelayMs(cachedVersionFrames.frameDelayMs);
      applyTimelineState(
        cachedVersionFrames.frames,
        0,
        cachedVersionFrames.layers ?? [createDefaultLayer()],
        cachedVersionFrames.layers?.[0]?.id ?? "layer-1",
      );
      userDirtyRef.current = false;
      setHasLocalDraft(false);
      setDraftSavedLabel(null);
      draftHydratedRef.current = true;
      setIsInheriting(false);
      setStatusNotice({
        type: "success",
        message: currentVersionNumber
          ? `Đã nạp v${currentVersionNumber} (${cachedVersionFrames.frames.length} frame · ${cachedVersionFrames.frameDelayMs}ms).`
          : `Đã nạp dữ liệu pixel (${cachedVersionFrames.frames.length} frame).`,
      });
      return;
    }

    const primaryUrl = initialArtworkUrl || fallbackArtworkUrl;
    if (!primaryUrl) {
      if (!propCharacterId || reloadVersionNonce > 0) {
        undoStackRef.current = [];
        redoStackRef.current = [];
        syncHistoryCounts();
        const opt =
          CANVAS_SIZE_OPTIONS.find((item) => item.key === (lockedMatrixSize ?? "32x32")) ??
          CANVAS_SIZE_OPTIONS[0];
        applyTimelineState(
          [createEmptyDocument(opt.width, opt.height)],
          0,
          [createDefaultLayer()],
          "layer-1",
        );
        setFrameDelayMs(100);
        if (!lockedMatrixSize) {
          setSizeKey("32x32");
        }
      }
      userDirtyRef.current = false;
      draftHydratedRef.current = true;
      return;
    }

    let isCancelled = false;
    let triedFallback = false;
    setIsInheriting(true);
    setStatusNotice({
      type: "info",
      message: currentVersionNumber
        ? `Đang nạp phiên bản v${currentVersionNumber} (${initialCharacterName || "Nhân vật"})...`
        : `Đang nạp dữ liệu pixel (${initialCharacterName || "Nhân vật"})...`,
    });

    const loadImageToCanvas = (srcUrl: string) => {
      const img = new Image();
      if (!srcUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (isCancelled) return;
        try {
          const inheritedPixels = rasterizeImageToPixels(
            img,
            docRef.current.width,
            docRef.current.height,
            "CONTAIN",
            100,
            100,
          );
          if (inheritedPixels && inheritedPixels.length > 0) {
            undoStackRef.current = [];
            redoStackRef.current = [];
            syncHistoryCounts();
            applyTimelineState(
              [
                {
                  ...docRef.current,
                  pixels: inheritedPixels,
                  texts: [],
                },
              ],
              0,
              [createDefaultLayer()],
              "layer-1",
            );
            userDirtyRef.current = false;
            setHasLocalDraft(false);
            setDraftSavedLabel(null);
            setStatusNotice({
              type: "success",
              message: currentVersionNumber
                ? `Đã nạp v${currentVersionNumber}. Bạn có thể chỉnh sửa tiếp hoặc thêm frame tạo GIF.`
                : "Đã nạp dữ liệu pixel lên bảng vẽ.",
            });
          }
          draftHydratedRef.current = true;
          setIsInheriting(false);
        } catch (err) {
          console.warn("Failed to rasterize inherited artwork:", err);
          if (!triedFallback && fallbackArtworkUrl && fallbackArtworkUrl !== srcUrl) {
            triedFallback = true;
            loadImageToCanvas(fallbackArtworkUrl);
          } else {
            draftHydratedRef.current = true;
            setIsInheriting(false);
          }
        }
      };
      img.onerror = () => {
        if (isCancelled) return;
        if (!triedFallback && fallbackArtworkUrl && fallbackArtworkUrl !== srcUrl) {
          triedFallback = true;
          loadImageToCanvas(fallbackArtworkUrl);
          return;
        }
        draftHydratedRef.current = true;
        setIsInheriting(false);
        setStatusNotice({
          type: "info",
          message: "Không thể nạp trực tiếp ảnh qua URL (có thể do CORS). Bạn có thể dùng nút Nhập ảnh để tải tệp.",
        });
      };
      img.src = srcUrl;
    };

    const tryGifDecodeThenFallback = async () => {
      const looksLikeGif =
        primaryUrl.startsWith("data:image/gif") || /\.gif(\?|$)/i.test(primaryUrl);
      if (looksLikeGif) {
        try {
          const resp = await fetch(primaryUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const decoded = decodeGifBytesToFrames(
              new Uint8Array(buf),
              docRef.current.width,
              docRef.current.height,
            );
            if (decoded && decoded.frames.length > 0 && !isCancelled) {
              undoStackRef.current = [];
              redoStackRef.current = [];
              syncHistoryCounts();
              setFrameDelayMs(decoded.frameDelayMs);
              applyTimelineState(
                decoded.frames,
                0,
                [createDefaultLayer()],
                "layer-1",
              );
              userDirtyRef.current = false;
              setHasLocalDraft(false);
              setDraftSavedLabel(null);
              draftHydratedRef.current = true;
              setIsInheriting(false);
              setStatusNotice({
                type: "success",
                message: `Đã nạp ảnh GIF (${decoded.frames.length} frame · ${decoded.frameDelayMs}ms).`,
              });
              return;
            }
          }
        } catch {
          // Fall through to normal image rasterizer
        }
      }
      if (!isCancelled) {
        loadImageToCanvas(primaryUrl);
      }
    };

    void tryGifDecodeThenFallback();

    return () => {
      isCancelled = true;
    };
  }, [
    initialArtworkUrl,
    fallbackArtworkUrl,
    propCharacterId,
    lockedMatrixSize,
    currentVersionId,
    currentVersionNumber,
    currentVersionListedOnStore,
    targetVersionNumber,
    reloadVersionNonce,
    initialCharacterName,
    syncHistoryCounts,
    applyTimelineState,
  ]);

  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push({
      frames: framesRef.current,
      activeFrameIndex: activeFrameIndexRef.current,
      layers: layersRef.current,
      activeLayerId: activeLayerIdRef.current,
    });
    syncHistoryCounts();
    userDirtyRef.current = true;
    applyTimelineState(
      prev.frames,
      prev.activeFrameIndex,
      prev.layers,
      prev.activeLayerId,
    );
  }, [syncHistoryCounts, applyTimelineState]);

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push({
      frames: framesRef.current,
      activeFrameIndex: activeFrameIndexRef.current,
      layers: layersRef.current,
      activeLayerId: activeLayerIdRef.current,
    });
    syncHistoryCounts();
    userDirtyRef.current = true;
    applyTimelineState(
      next.frames,
      next.activeFrameIndex,
      next.layers,
      next.activeLayerId,
    );
  }, [syncHistoryCounts, applyTimelineState]);

  // Composite display frame (overlays active-layer drag preview or live hover text ghost accurately at the active layer's z-order)
  const displayDocument: PixelDocumentState = useMemo(() => {
    const layerDocPreview = previewDoc;
    if (!layerDocPreview) {
      return activeFrame;
    }
    const ensured = ensureLayeredFrame(activeFrame, layers);
    const nextContents = {
      ...(ensured.layerContents ?? {}),
      [activeLayer.id]: {
        pixels: layerDocPreview.pixels,
        texts: layerDocPreview.texts,
      },
    };
    return {
      width: ensured.width,
      height: ensured.height,
      pixels: flattenLayersForFrame(ensured.width, ensured.height, layers, nextContents),
      texts: [],
    };
  }, [activeFrame, activeLayer.id, layers, previewDoc]);
  const renderCompositeToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, targetDoc: PixelDocumentState) => {
      paintPixelDocumentToCanvas(canvas, targetDoc);
    },
    [],
  );

  const effectivePlaying = isPlaying && frames.length > 1;

  useEffect(() => {
    if (!effectivePlaying) return;
    const intervalId = window.setInterval(() => {
      setPlaybackFrameIndex((prev) => (prev + 1) % frames.length);
    }, Math.max(40, frameDelayMs));
    return () => window.clearInterval(intervalId);
  }, [effectivePlaying, frames.length, frameDelayMs]);

  useEffect(() => {
    renderCompositeToCanvas(canvasRef.current, displayDocument);
    const previewSource = effectivePlaying
      ? frames[playbackFrameIndex % frames.length] ?? displayDocument
      : displayDocument;
    renderCompositeToCanvas(previewCanvasRef.current, previewSource);

    if (showOnionSkin && activeFrameIndex > 0 && frames[activeFrameIndex - 1]) {
      renderCompositeToCanvas(onionCanvasRef.current, frames[activeFrameIndex - 1]);
    } else if (onionCanvasRef.current) {
      const ctx = onionCanvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, doc.width, doc.height);
    }
  }, [
    displayDocument,
    effectivePlaying,
    frames,
    playbackFrameIndex,
    showOnionSkin,
    activeFrameIndex,
    doc.width,
    doc.height,
    renderCompositeToCanvas,
  ]);

  // Frame management handlers
  const handleSelectFrame = useCallback(
    (index: number) => {
      if (index < 0 || index >= framesRef.current.length) return;
      setIsPlaying(false);
      updatePreview(null);
      setSelection(null);
      applyTimelineState(framesRef.current, index);
    },
    [applyTimelineState, updatePreview],
  );

  const handleAddFrame = useCallback(() => {
    setIsPlaying(false);
    updatePreview(null);
    setSelection(null);
    const current = framesRef.current;
    const insertAt = activeFrameIndexRef.current + 1;
    const blank = createEmptyDocument(docRef.current.width, docRef.current.height);
    const nextFrames = [
      ...current.slice(0, insertAt),
      blank,
      ...current.slice(insertAt),
    ];
    commitTimelineChange(nextFrames, insertAt);
  }, [commitTimelineChange, updatePreview]);

  const handleDuplicateFrame = useCallback(() => {
    setIsPlaying(false);
    updatePreview(null);
    setSelection(null);
    const current = framesRef.current;
    const idx = activeFrameIndexRef.current;
    const source = ensureLayeredFrame(current[idx] ?? activeFrame, layersRef.current);
    const clonedContents: NonNullable<PixelDocumentState["layerContents"]> = {};
    for (const [k, cel] of Object.entries(source.layerContents ?? {})) {
      clonedContents[k] = {
        pixels: [...cel.pixels],
        texts: cel.texts.map((t) => ({ ...t })),
      };
    }
    const clone: PixelDocumentState = {
      width: source.width,
      height: source.height,
      pixels: [...source.pixels],
      texts: [],
      layerContents: clonedContents,
    };
    const nextFrames = [
      ...current.slice(0, idx + 1),
      clone,
      ...current.slice(idx + 1),
    ];
    commitTimelineChange(nextFrames, idx + 1);
  }, [activeFrame, commitTimelineChange, updatePreview]);

  const handleDeleteFrame = useCallback(() => {
    const current = framesRef.current;
    if (current.length <= 1) return;
    setIsPlaying(false);
    updatePreview(null);
    setSelection(null);
    const idx = activeFrameIndexRef.current;
    const nextFrames = current.filter((_, i) => i !== idx);
    commitTimelineChange(nextFrames, Math.min(idx, nextFrames.length - 1));
  }, [commitTimelineChange, updatePreview]);

  const handleMoveFrame = useCallback(
    (direction: -1 | 1) => {
      const current = framesRef.current;
      const idx = activeFrameIndexRef.current;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= current.length) return;
      setIsPlaying(false);
      const nextFrames = [...current];
      const [moved] = nextFrames.splice(idx, 1);
      nextFrames.splice(targetIdx, 0, moved);
      commitTimelineChange(nextFrames, targetIdx);
    },
    [commitTimelineChange],
  );

  // Fit canvas cleanly inside available pasteboard height & width at 100% zoom (no scrollbars even on 64x64)
  useEffect(() => {
    const el = pasteboardRef.current;
    if (!el) return;

    const recomputeFit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const availableW = Math.max(180, rect.width - 36);
      const availableH = Math.max(180, rect.height - 36);
      const ratio = doc.width / doc.height;
      const fitted = Math.floor(
        Math.max(180, Math.min(sizeOption.displayWidth, availableW, availableH * ratio)),
      );
      setFittedCanvasWidth(fitted);
    };

    recomputeFit();
    const observer = new ResizeObserver(recomputeFit);
    observer.observe(el);
    window.addEventListener("resize", recomputeFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputeFit);
    };
  }, [doc.width, doc.height, sizeOption.displayWidth]);

  // Layer management handlers (shared across all GIF frames)
  const canEditActiveLayer = useCallback((): boolean => {
    const layer = layersRef.current.find((l) => l.id === activeLayerIdRef.current);
    if (!layer) return true;
    if (layer.locked) {
      setStatusNotice({
        type: "info",
        message: `Layer "${layer.name}" đang bị khóa. Mở khóa ở bảng Layers để chỉnh sửa.`,
      });
      return false;
    }
    if (!layer.visible) {
      setStatusNotice({
        type: "info",
        message: `Layer "${layer.name}" đang bị ẩn. Bật mắt 👁 ở bảng Layers để vẽ.`,
      });
      return false;
    }
    return true;
  }, []);

  const handleSelectLayer = useCallback(
    (id: string) => {
      updatePreview(null);
      setSelection(null);
      applyTimelineState(framesRef.current, activeFrameIndexRef.current, layersRef.current, id);
    },
    [applyTimelineState, updatePreview],
  );

  const handleAddLayer = useCallback(() => {
    const nextNum = layersRef.current.length + 1;
    const newId = `layer-${Date.now().toString(36)}`;
    const newLayer = createDefaultLayer(newId, `Layer ${nextNum}`);
    const nextLayers = [newLayer, ...layersRef.current];
    commitTimelineChange(
      framesRef.current,
      activeFrameIndexRef.current,
      nextLayers,
      newId,
    );
  }, [commitTimelineChange]);

  const handleDuplicateLayer = useCallback(() => {
    const currentLayers = layersRef.current;
    const idx = Math.max(
      0,
      currentLayers.findIndex((l) => l.id === activeLayerIdRef.current),
    );
    const src = currentLayers[idx];
    if (!src) return;
    const dupId = `layer-${Date.now().toString(36)}`;
    const dupLayer: PixelLayer = {
      ...src,
      id: dupId,
      name: `${src.name} (Copy)`,
      locked: false,
    };
    const nextLayers = [
      ...currentLayers.slice(0, idx),
      dupLayer,
      ...currentLayers.slice(idx),
    ];
    const nextFrames = framesRef.current.map((frame) => {
      const ensured = ensureLayeredFrame(frame, currentLayers);
      const srcCel = ensured.layerContents?.[src.id];
      const nextContents = {
        ...(ensured.layerContents ?? {}),
        [dupId]: srcCel
          ? { pixels: [...srcCel.pixels], texts: srcCel.texts.map((t) => ({ ...t })) }
          : { pixels: Array<string>(ensured.width * ensured.height).fill(""), texts: [] },
      };
      return { ...ensured, layerContents: nextContents };
    });
    commitTimelineChange(nextFrames, activeFrameIndexRef.current, nextLayers, dupId);
  }, [commitTimelineChange]);

  const handleDeleteLayer = useCallback(
    (id: string) => {
      const currentLayers = layersRef.current;
      if (currentLayers.length <= 1) return;
      const nextLayers = currentLayers.filter((l) => l.id !== id);
      const nextFrames = framesRef.current.map((frame) => {
        const ensured = ensureLayeredFrame(frame, currentLayers);
        const rest = { ...(ensured.layerContents ?? {}) };
        delete rest[id];
        return { ...ensured, layerContents: rest };
      });
      const nextActiveId =
        activeLayerIdRef.current === id ? nextLayers[0].id : activeLayerIdRef.current;
      commitTimelineChange(nextFrames, activeFrameIndexRef.current, nextLayers, nextActiveId);
    },
    [commitTimelineChange],
  );

  const handleMergeDownLayer = useCallback(
    (id: string) => {
      const currentLayers = layersRef.current;
      const idx = currentLayers.findIndex((l) => l.id === id);
      if (idx < 0 || idx >= currentLayers.length - 1) return;
      const topLayer = currentLayers[idx];
      const belowLayer = currentLayers[idx + 1];
      const nextLayers = currentLayers.filter((l) => l.id !== topLayer.id);

      const nextFrames = framesRef.current.map((frame) => {
        const ensured = ensureLayeredFrame(frame, currentLayers);
        const contents = { ...(ensured.layerContents ?? {}) };
        const mergedPixels = flattenLayersForFrame(
          ensured.width,
          ensured.height,
          [{ ...topLayer, visible: true }, { ...belowLayer, visible: true }],
          contents,
        );
        contents[belowLayer.id] = { pixels: mergedPixels, texts: [] };
        delete contents[topLayer.id];
        return { ...ensured, layerContents: contents };
      });

      commitTimelineChange(
        nextFrames,
        activeFrameIndexRef.current,
        nextLayers,
        belowLayer.id,
      );
    },
    [commitTimelineChange],
  );

  const handleMoveLayer = useCallback(
    (id: string, direction: -1 | 1) => {
      const currentLayers = layersRef.current;
      const idx = currentLayers.findIndex((l) => l.id === id);
      const targetIdx = idx + direction;
      if (idx < 0 || targetIdx < 0 || targetIdx >= currentLayers.length) return;
      const nextLayers = [...currentLayers];
      const [moved] = nextLayers.splice(idx, 1);
      nextLayers.splice(targetIdx, 0, moved);
      commitTimelineChange(
        framesRef.current,
        activeFrameIndexRef.current,
        nextLayers,
        activeLayerIdRef.current,
      );
    },
    [commitTimelineChange],
  );

  const handleToggleLayerVisible = useCallback(
    (id: string) => {
      const nextLayers = layersRef.current.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      );
      commitTimelineChange(
        framesRef.current,
        activeFrameIndexRef.current,
        nextLayers,
        activeLayerIdRef.current,
      );
    },
    [commitTimelineChange],
  );

  const handleToggleLayerLocked = useCallback((id: string) => {
    const nextLayers = layersRef.current.map((l) =>
      l.id === id ? { ...l, locked: !l.locked } : l,
    );
    applyTimelineState(
      framesRef.current,
      activeFrameIndexRef.current,
      nextLayers,
      activeLayerIdRef.current,
    );
  }, [applyTimelineState]);

  const handleRenameLayer = useCallback(
    (id: string, nextName: string) => {
      const nextLayers = layersRef.current.map((l) =>
        l.id === id ? { ...l, name: nextName } : l,
      );
      commitTimelineChange(
        framesRef.current,
        activeFrameIndexRef.current,
        nextLayers,
        activeLayerIdRef.current,
      );
    },
    [commitTimelineChange],
  );

  const handleChangeLayerOpacity = useCallback(
    (id: string, nextOpacity: number) => {
      const nextLayers = layersRef.current.map((l) =>
        l.id === id ? { ...l, opacity: nextOpacity } : l,
      );
      applyTimelineState(
        framesRef.current,
        activeFrameIndexRef.current,
        nextLayers,
        activeLayerIdRef.current,
      );
      userDirtyRef.current = true;
    },
    [applyTimelineState],
  );

  const hasContent = useMemo(
    () =>
      frames.some(
        (f) =>
          f.pixels.some(Boolean) ||
          f.texts.length > 0 ||
          Boolean(
            f.layerContents &&
              Object.values(f.layerContents).some(
                (cel) => cel.pixels.some(Boolean) || cel.texts.length > 0,
              ),
          ),
      ),
    [frames],
  );

  const handleSizePresetChange = (nextKey: "32x32" | "64x32" | "64x64") => {
    if (nextKey === sizeKey) return;
    const opt = CANVAS_SIZE_OPTIONS.find((item) => item.key === nextKey);
    if (!opt) return;
    if (
      hasContent &&
      !window.confirm(
        `Chuyển kích thước sang ${opt.label} sẽ tạo bản vẽ mới. Bạn có muốn tiếp tục?`,
      )
    ) {
      return;
    }
    setSizeKey(nextKey);
    setIsPlaying(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryCounts();
    setSelection(null);
    setHoverPixel(null);
    updatePreview(null);
    applyTimelineState(
      [createEmptyDocument(opt.width, opt.height)],
      0,
      [createDefaultLayer()],
      "layer-1",
    );
    setStatusNotice(null);
  };

  /**
   * Maps screen mouse/touch coordinates to exact grid indices on the internal pixel matrix.
   */
  const getGridCoordinates = useCallback(
    (clientX: number, clientY: number): PixelPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) {
        return null;
      }

      const x = Math.min(
        docRef.current.width - 1,
        Math.max(0, Math.floor((relX / rect.width) * docRef.current.width)),
      );
      const y = Math.min(
        docRef.current.height - 1,
        Math.max(0, Math.floor((relY / rect.height) * docRef.current.height)),
      );
      return { x, y };
    },
    [],
  );

  const beginStrokeAt = (
    clientX: number,
    clientY: number,
    opts?: { button?: number; altKey?: boolean; shiftKey?: boolean },
  ) => {
    const point = getGridCoordinates(clientX, clientY);
    if (!point) return;

    const currentDoc = docRef.current;
    setHoverPixel(point);

    // Instant Alt+Click eyedropper anywhere (keeps current tool active)
    if (opts?.altKey || activeTool === "PICKER") {
      const mergedFrame = framesRef.current[activeFrameIndexRef.current] ?? currentDoc;
      const merged = compositeDocument(mergedFrame);
      const picked = merged[point.y * currentDoc.width + point.x];
      if (picked) {
        setSelectedColor(picked);
        if (activeTool === "PICKER") {
          setActiveTool("PEN");
        }
      }
      return;
    }

    if (activeTool === "TEXT") {
      const hit = currentDoc.texts.find((block) => {
        const blockWidth = block.text.length * (block.glyphWidth + 1) - 1;
        return (
          point.x >= block.x &&
          point.x < block.x + blockWidth &&
          point.y >= block.y &&
          point.y < block.y + block.glyphHeight
        );
      });
      if (hit) {
        setEditingTextId(hit.id);
        setTextInput(hit.text);
        setTextX(hit.x);
        setTextY(hit.y);
        setSelectedColor(hit.color);
        const presetIdx = GLYPH_SIZE_PRESETS.findIndex(
          (p) => p.width === hit.glyphWidth && p.height === hit.glyphHeight,
        );
        if (presetIdx >= 0) setTextPresetIdx(presetIdx);
      } else {
        setTextX(point.x);
        setTextY(point.y);
      }
      return;
    }

    if (activeTool !== "SELECT" && !canEditActiveLayer()) {
      return;
    }

    if (activeTool === "FILL") {
      const next = floodFill(
        currentDoc,
        point.x,
        point.y,
        selectedColor,
        mirrorMode,
        opacity,
      );
      if (next !== currentDoc) {
        commitDocumentChange(currentDoc, next);
      }
      return;
    }

    const gestureTool: PixelTool = opts?.button === 2 ? "ERASER" : activeTool;
    gestureToolRef.current = gestureTool;
    isPointerDownRef.current = true;
    dragStartPixelRef.current = point;
    lastPixelRef.current = point;

    if (gestureTool === "PEN" || gestureTool === "ERASER") {
      strokeStartDocRef.current = currentDoc;
      const touched = new Set<number>();
      strokeTouchedRef.current = touched;
      const color = gestureTool === "PEN" ? selectedColor : "";
      const next = brushStroke(
        currentDoc,
        point.x,
        point.y,
        point.x,
        point.y,
        color,
        brushSize,
        mirrorMode,
        gestureTool === "PEN" ? opacity : 100,
        currentDoc.pixels,
        touched,
      );
      updateDocument(next);
      return;
    }

    if (gestureTool === "SHAPE") {
      strokeStartDocRef.current = currentDoc;
      updatePreview(
        drawShape(
          currentDoc,
          point.x,
          point.y,
          point.x,
          point.y,
          selectedColor,
          shapeKind,
          shapeFilled,
          mirrorMode,
          brushSize,
          opacity,
        ),
      );
      return;
    }

    if (gestureTool === "SELECT") {
      setSelection({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
      return;
    }

    if (gestureTool === "MOVE") {
      const activeRect: SelectionRect = selection ?? {
        x0: 0,
        y0: 0,
        x1: currentDoc.width - 1,
        y1: currentDoc.height - 1,
      };
      const norm = normalizeSelectionRect(activeRect);
      const { regionWidth, regionHeight, data } = extractRegionPixels(
        currentDoc,
        activeRect,
      );
      const baseCleared = clearDocumentRegion(currentDoc, activeRect);
      const movingTexts = currentDoc.texts.filter((block) => {
        const blockWidth = Math.max(1, block.text.length * (block.glyphWidth + 1) - 1);
        const blockHeight = Math.max(1, block.glyphHeight);
        return !(
          block.x + blockWidth - 1 < norm.left ||
          block.x > norm.right ||
          block.y + blockHeight - 1 < norm.top ||
          block.y > norm.bottom
        );
      });
      const movingIds = new Set(movingTexts.map((b) => b.id));
      const staticTexts = currentDoc.texts.filter((b) => !movingIds.has(b.id));

      strokeStartDocRef.current = currentDoc;
      moveContextRef.current = {
        baseCleared,
        originLeft: norm.left,
        originTop: norm.top,
        regionWidth,
        regionHeight,
        data,
        movingTexts,
        staticTexts,
      };
      updatePreview(
        stampDocumentRegion(
          baseCleared,
          norm.left,
          norm.top,
          regionWidth,
          data,
        ),
      );
    }
  };

  const continueStrokeAt = (
    clientX: number,
    clientY: number,
    opts?: { shiftKey?: boolean },
  ) => {
    const point = getGridCoordinates(clientX, clientY);
    setHoverPixel(point);
    if (!isPointerDownRef.current || !point) return;

    const prevPoint = lastPixelRef.current ?? point;
    lastPixelRef.current = point;
    const gestureTool = gestureToolRef.current;

    if (gestureTool === "PEN" || gestureTool === "ERASER") {
      const color = gestureTool === "PEN" ? selectedColor : "";
      const next = brushStroke(
        docRef.current,
        prevPoint.x,
        prevPoint.y,
        point.x,
        point.y,
        color,
        brushSize,
        mirrorMode,
        gestureTool === "PEN" ? opacity : 100,
        strokeStartDocRef.current?.pixels,
        strokeTouchedRef.current,
      );
      updateDocument(next);
      return;
    }

    if (gestureTool === "SHAPE" && strokeStartDocRef.current && dragStartPixelRef.current) {
      const start = dragStartPixelRef.current;
      const target = opts?.shiftKey
        ? constrainPointByShift(start, point, "SHAPE", shapeKind)
        : point;
      updatePreview(
        drawShape(
          strokeStartDocRef.current,
          start.x,
          start.y,
          target.x,
          target.y,
          selectedColor,
          shapeKind,
          shapeFilled,
          mirrorMode,
          brushSize,
          opacity,
        ),
      );
      return;
    }

    if (gestureTool === "SELECT" && dragStartPixelRef.current) {
      const start = dragStartPixelRef.current;
      setSelection({ x0: start.x, y0: start.y, x1: point.x, y1: point.y });
      return;
    }

    if (gestureTool === "MOVE" && moveContextRef.current && dragStartPixelRef.current) {
      const ctx = moveContextRef.current;
      const start = dragStartPixelRef.current;
      const target = opts?.shiftKey
        ? constrainPointByShift(start, point, "MOVE", shapeKind)
        : point;
      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const nextLeft = ctx.originLeft + dx;
      const nextTop = ctx.originTop + dy;

      const stamped = stampDocumentRegion(
        ctx.baseCleared,
        nextLeft,
        nextTop,
        ctx.regionWidth,
        ctx.data,
      );
      const shiftedTexts = ctx.movingTexts.map((block) => ({
        ...block,
        x: block.x + dx,
        y: block.y + dy,
      }));
      updatePreview({
        ...stamped,
        texts: [...ctx.staticTexts, ...shiftedTexts],
      });
      setSelection({
        x0: nextLeft,
        y0: nextTop,
        x1: nextLeft + ctx.regionWidth - 1,
        y1: nextTop + ctx.regionHeight - 1,
      });
    }
  };

  const endStroke = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    const gestureTool = gestureToolRef.current;
    const startSnap = strokeStartDocRef.current;
    const latestPreview = previewDocRef.current;

    if ((gestureTool === "PEN" || gestureTool === "ERASER") && startSnap) {
      const hasDelta = startSnap.pixels.some(
        (px, idx) => px !== docRef.current.pixels[idx],
      );
      if (hasDelta) {
        userDirtyRef.current = true;
        const idx = activeFrameIndexRef.current;
        const layerList = layersRef.current;
        const layerId =
          layerList.find((l) => l.id === activeLayerIdRef.current)?.id ??
          layerList[0]?.id ??
          "layer-1";
        const currentFrame = ensureLayeredFrame(framesRef.current[idx], layerList);
        const prevContents = {
          ...(currentFrame.layerContents ?? {}),
          [layerId]: { pixels: startSnap.pixels, texts: startSnap.texts },
        };
        const prevFrame: PixelDocumentState = {
          width: currentFrame.width,
          height: currentFrame.height,
          pixels: flattenLayersForFrame(
            currentFrame.width,
            currentFrame.height,
            layerList,
            prevContents,
          ),
          texts: [],
          layerContents: prevContents,
        };
        const prevFrames = framesRef.current.map((f, i) => (i === idx ? prevFrame : f));
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY_STEPS - 1)),
          {
            frames: prevFrames,
            activeFrameIndex: idx,
            layers: layerList,
            activeLayerId: layerId,
          },
        ];
        redoStackRef.current = [];
        syncHistoryCounts();
      }
    }

    if ((gestureTool === "SHAPE" || gestureTool === "MOVE") && startSnap && latestPreview) {
      commitDocumentChange(startSnap, latestPreview);
      updatePreview(null);
    }

    strokeTouchedRef.current = new Set();
    strokeStartDocRef.current = null;
    dragStartPixelRef.current = null;
    lastPixelRef.current = null;
    moveContextRef.current = null;
  };

  const handleClearCanvas = () => {
    if (!hasContent || !canEditActiveLayer()) return;
    commitDocumentChange(
      docRef.current,
      createEmptyDocument(docRef.current.width, docRef.current.height),
    );
    setSelection(null);
    setStatusNotice(null);
  };

  // Selection Clipboard & Transform handlers
  const handleCopySelection = useCallback(() => {
    if (!selection) return;
    setClipboard(extractRegionPixels(docRef.current, selection));
    setStatusNotice({
      type: "success",
      message: "Đã sao chép vùng pixel đang chọn.",
    });
  }, [selection]);

  const handleCutSelection = useCallback(() => {
    if (!selection || !canEditActiveLayer()) return;
    setClipboard(extractRegionPixels(docRef.current, selection));
    commitDocumentChange(
      docRef.current,
      clearDocumentRegion(docRef.current, selection),
    );
  }, [selection, commitDocumentChange, canEditActiveLayer]);

  const handleDeleteSelection = useCallback(() => {
    if (!selection || !canEditActiveLayer()) return;
    commitDocumentChange(
      docRef.current,
      clearDocumentRegion(docRef.current, selection),
    );
  }, [selection, commitDocumentChange, canEditActiveLayer]);

  const handleFlipSelection = useCallback(
    (axis: "HORIZONTAL" | "VERTICAL") => {
      if (!canEditActiveLayer()) return;
      const next = flipRegionInDocument(docRef.current, selection, axis);
      commitDocumentChange(docRef.current, next);
    },
    [selection, commitDocumentChange, canEditActiveLayer],
  );

  const handleNudgeSelection = useCallback(
    (dx: number, dy: number) => {
      if (!canEditActiveLayer()) return;
      const currentDoc = docRef.current;
      const activeRect: SelectionRect = selection ?? {
        x0: 0,
        y0: 0,
        x1: currentDoc.width - 1,
        y1: currentDoc.height - 1,
      };
      const norm = normalizeSelectionRect(activeRect);
      const { regionWidth, regionHeight, data } = extractRegionPixels(
        currentDoc,
        activeRect,
      );
      const baseCleared = clearDocumentRegion(currentDoc, activeRect);
      const stamped = stampDocumentRegion(
        baseCleared,
        norm.left + dx,
        norm.top + dy,
        regionWidth,
        data,
      );
      const nextTexts = currentDoc.texts.map((block) => {
        const blockW = Math.max(1, block.text.length * (block.glyphWidth + 1) - 1);
        const blockH = Math.max(1, block.glyphHeight);
        const overlaps = !(
          block.x + blockW - 1 < norm.left ||
          block.x > norm.right ||
          block.y + blockH - 1 < norm.top ||
          block.y > norm.bottom
        );
        return overlaps ? { ...block, x: block.x + dx, y: block.y + dy } : block;
      });
      commitDocumentChange(currentDoc, { ...stamped, texts: nextTexts });
      if (selection) {
        setSelection({
          x0: norm.left + dx,
          y0: norm.top + dy,
          x1: norm.left + dx + regionWidth - 1,
          y1: norm.top + dy + regionHeight - 1,
        });
      }
    },
    [selection, commitDocumentChange, canEditActiveLayer],
  );

  const handlePasteClipboard = useCallback(() => {
    if (!clipboard || !canEditActiveLayer()) return;
    const origin = selection ? normalizeSelectionRect(selection) : { left: 0, top: 0 };
    const next = stampDocumentRegion(
      docRef.current,
      origin.left,
      origin.top,
      clipboard.regionWidth,
      clipboard.data,
    );
    commitDocumentChange(docRef.current, next);
    setSelection({
      x0: origin.left,
      y0: origin.top,
      x1: origin.left + clipboard.regionWidth - 1,
      y1: origin.top + clipboard.regionHeight - 1,
    });
  }, [clipboard, selection, commitDocumentChange, canEditActiveLayer]);

  // Text block management
  const activeTextPreset = GLYPH_SIZE_PRESETS[textPresetIdx] ?? GLYPH_SIZE_PRESETS[0];
  const candidateTextBlock: Omit<PixelText, "id"> = {
    text: textInput,
    x: textX,
    y: textY,
    glyphWidth: activeTextPreset.width,
    glyphHeight: activeTextPreset.height,
    color: selectedColor,
  };
  const isTextAsciiValid = supportsPixelText(textInput);
  const doesTextFit = fitsPixelText(
    candidateTextBlock,
    doc.width,
    doc.height,
  );

  const handleSaveTextBlock = () => {
    if (!canEditActiveLayer()) return;
    if (!textInput.trim()) {
      setStatusNotice({ type: "error", message: "Vui lòng nhập nội dung chữ." });
      return;
    }
    if (!isTextAsciiValid) {
      setStatusNotice({
        type: "error",
        message: "Chữ pixel chỉ hỗ trợ ký tự tiếng Anh / ASCII (A-Z, 0-9, ký hiệu).",
      });
      return;
    }
    if (!doesTextFit) {
      setStatusNotice({
        type: "error",
        message: `Khối chữ vượt quá khung ${doc.width}×${doc.height} ở vị trí (${textX}, ${textY}). Hãy giảm cỡ chữ hoặc chỉnh tọa độ X/Y.`,
      });
      return;
    }

    const currentDoc = docRef.current;
    if (editingTextId) {
      const nextTexts = currentDoc.texts.map((block) =>
        block.id === editingTextId
          ? { ...candidateTextBlock, id: editingTextId }
          : block,
      );
      commitDocumentChange(currentDoc, { ...currentDoc, texts: nextTexts });
    } else {
      const newBlock: PixelText = {
        ...candidateTextBlock,
        id: `txt-${Date.now().toString(36)}`,
      };
      commitDocumentChange(currentDoc, {
        ...currentDoc,
        texts: [...currentDoc.texts, newBlock],
      });
      setEditingTextId(newBlock.id);
    }
    setStatusNotice(null);
  };

  const handleDeleteTextBlock = (id: string) => {
    if (!canEditActiveLayer()) return;
    const currentDoc = docRef.current;
    commitDocumentChange(currentDoc, {
      ...currentDoc,
      texts: currentDoc.texts.filter((block) => block.id !== id),
    });
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  };

  const handleRasterizeTextBlock = (id: string) => {
    if (!canEditActiveLayer()) return;
    const currentDoc = docRef.current;
    const next = rasterizeTextBlockIntoPixels(currentDoc, id);
    if (next === currentDoc) return;
    commitDocumentChange(currentDoc, next);
    if (editingTextId === id) {
      setEditingTextId(null);
    }
    setStatusNotice({
      type: "success",
      message: "Đã đóng khối chữ thành điểm ảnh trên layer hiện tại.",
    });
  };

  // RGB & HSV values derived from selectedColor
  const currentRgb = useMemo(() => hexToRgb(selectedColor), [selectedColor]);
  const currentHsv = useMemo(
    () => rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b),
    [currentRgb],
  );

  const handleHexInputChange = (raw: string) => {
    setHexInput(raw);
    const trimmed = raw.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      const norm = normalizeHex(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
      setSelectedColor(norm);
      if (activeTool === "ERASER") setActiveTool("PEN");
    }
  };

  const handleHexInputCommit = () => {
    const trimmed = hexInput.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      const norm = normalizeHex(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
      setSelectedColor(norm);
      setHexInput(norm);
    } else {
      setHexInput(normalizeHex(selectedColor));
    }
  };

  const handleAddCustomSwatch = () => {
    const norm = normalizeHex(selectedColor);
    const existingIdx = paletteSwatches.findIndex(
      (s) => normalizeHex(s.hex) === norm,
    );
    if (existingIdx >= 0) {
      setSelectedSwatchIdx(existingIdx);
      return;
    }
    setPaletteSwatches((prev) => {
      const next = [...prev, { name: `Màu ${norm}`, hex: norm, custom: true }];
      setSelectedSwatchIdx(next.length - 1);
      return next;
    });
  };

  const handleUpdateSelectedSwatch = () => {
    const norm = normalizeHex(selectedColor);
    if (selectedSwatchIdx < 0 || selectedSwatchIdx >= paletteSwatches.length) {
      handleAddCustomSwatch();
      return;
    }
    setPaletteSwatches((prev) =>
      prev.map((s, idx) =>
        idx === selectedSwatchIdx
          ? { ...s, hex: norm, name: s.name || `Màu ${norm}` }
          : s,
      ),
    );
  };

  const handleDeleteSwatch = (idxToRemove: number) => {
    setPaletteSwatches((prev) => {
      const next = prev.filter((_, idx) => idx !== idxToRemove);
      if (next.length === 0) {
        setSelectedSwatchIdx(-1);
      } else if (selectedSwatchIdx >= next.length) {
        setSelectedSwatchIdx(next.length - 1);
      } else if (idxToRemove < selectedSwatchIdx) {
        setSelectedSwatchIdx(Math.max(0, selectedSwatchIdx - 1));
      }
      return next;
    });
  };

  const handleApplyPalettePreset = (presetId: string) => {
    const preset =
      customPresets.find((p) => p.id === presetId) ??
      PALETTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const nextSwatches = preset.swatches.map((s) => ({ ...s }));
    setPaletteSwatches(nextSwatches);
    setActivePresetId(preset.id);
    setSelectedSwatchIdx(0);
    if (nextSwatches[0]) {
      setSelectedColor(nextSwatches[0].hex);
    }
    setStatusNotice({
      type: "success",
      message: `Đã nạp bộ màu "${preset.label}" cho nhân vật.`,
    });
  };

  const handleOpenSavePreset = () => {
    if (paletteSwatches.length === 0) {
      setStatusNotice({
        type: "info",
        message: "Khay màu đang trống. Hãy thêm ít nhất 1 ô màu trước khi lưu preset.",
      });
      return;
    }
    const baseName = characterName.trim()
      ? `Màu ${characterName.trim()}`
      : `Preset ${customPresets.length + 1}`;
    setPresetNameInput(baseName);
    setSavingPresetOpen(true);
  };

  const handleSaveCustomPreset = () => {
    const trimmed = presetNameInput.trim();
    if (!trimmed) {
      setStatusNotice({
        type: "error",
        message: "Vui lòng nhập tên preset bảng màu.",
      });
      return;
    }
    if (paletteSwatches.length === 0) {
      setStatusNotice({
        type: "info",
        message: "Khay màu đang trống, không thể lưu preset.",
      });
      return;
    }
    const nextPreset: PalettePreset = {
      id: `custom-${Date.now().toString(36)}`,
      label: trimmed,
      swatches: paletteSwatches.map((s) => ({ name: s.name, hex: normalizeHex(s.hex) })),
      custom: true,
    };
    const nextList = [...customPresets, nextPreset];
    setCustomPresets(nextList);
    saveCustomPalettePresets(nextList);
    setActivePresetId(nextPreset.id);
    setSavingPresetOpen(false);
    setPresetNameInput("");
    setStatusNotice({
      type: "success",
      message: `Đã lưu preset cá nhân "${trimmed}" (${nextPreset.swatches.length} màu) trên máy này.`,
    });
  };

  const handleUpdateSelectedCustomPreset = () => {
    const target = customPresets.find((p) => p.id === activePresetId);
    if (!target || paletteSwatches.length === 0) return;
    const nextList = customPresets.map((p) =>
      p.id === target.id
        ? {
            ...p,
            swatches: paletteSwatches.map((s) => ({
              name: s.name,
              hex: normalizeHex(s.hex),
            })),
          }
        : p,
    );
    setCustomPresets(nextList);
    saveCustomPalettePresets(nextList);
    setStatusNotice({
      type: "success",
      message: `Đã cập nhật preset "${target.label}" (${paletteSwatches.length} màu).`,
    });
  };

  const handleDeleteSelectedCustomPreset = () => {
    const target = customPresets.find((p) => p.id === activePresetId);
    if (!target) return;
    const nextList = customPresets.filter((p) => p.id !== target.id);
    setCustomPresets(nextList);
    saveCustomPalettePresets(nextList);
    setActivePresetId("");
    setStatusNotice({
      type: "success",
      message: `Đã xóa preset cá nhân "${target.label}".`,
    });
  };

  const handleExtractPalette = () => {
    const extracted = extractPaletteFromFrames(framesRef.current, 24);
    if (extracted.length === 0) {
      setStatusNotice({
        type: "info",
        message: "Bảng vẽ chưa có màu nào để trích xuất.",
      });
      return;
    }
    setPaletteSwatches(extracted);
    setActivePresetId("");
    setSelectedSwatchIdx(0);
    setSelectedColor(extracted[0].hex);
    setStatusNotice({
      type: "success",
      message: `Đã trích ${extracted.length} màu từ bản vẽ hiện tại.`,
    });
  };

  // Image Import preview rasterization
  const previewImportedPixels = useMemo(() => {
    if (!importedImageEl) return [];
    return rasterizeImageToPixels(
      importedImageEl,
      doc.width,
      doc.height,
      importFit,
      importBrightness,
      importContrast,
    );
  }, [
    doc.height,
    doc.width,
    importBrightness,
    importContrast,
    importFit,
    importedImageEl,
  ]);

  useEffect(() => {
    if (!importModalOpen || !importPreviewCanvasRef.current) return;
    const canvas = importPreviewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, doc.width, doc.height);
    for (let y = 0; y < doc.height; y++) {
      for (let x = 0; x < doc.width; x++) {
        const hex = previewImportedPixels[y * doc.width + x];
        if (!hex) continue;
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [doc.height, doc.width, importModalOpen, previewImportedPixels]);

  const handleImportFileChosen = async (file: File | undefined) => {
    if (!file) return;

    // If an animated GIF is uploaded, extract all frames onto the timeline directly
    if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
      try {
        const buffer = await file.arrayBuffer();
        const decoded = decodeGifBytesToFrames(
          new Uint8Array(buffer),
          docRef.current.width,
          docRef.current.height,
        );
        if (decoded && decoded.frames.length > 1) {
          setIsPlaying(false);
          setFrameDelayMs(decoded.frameDelayMs);
          commitTimelineChange(decoded.frames, 0);
          setStatusNotice({
            type: "success",
            message: `Đã nhập ảnh GIF động (${decoded.frames.length} frame · ${decoded.frameDelayMs}ms) vào Timeline!`,
          });
          return;
        }
      } catch {
        // Fallback to single-frame image import dialog
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        setImportedImageEl(img);
        setImportModalOpen(true);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImport = () => {
    if (!previewImportedPixels.length || !canEditActiveLayer()) return;
    commitDocumentChange(docRef.current, {
      ...docRef.current,
      pixels: previewImportedPixels,
    });
    setImportModalOpen(false);
    setImportedImageEl(null);
    setStatusNotice({
      type: "success",
      message: "Đã nhập ảnh vào lớp pixel của layer hiện tại (giữ nguyên các khối chữ).",
    });
  };

  // Download Export Handler (Animated GIF / PNG / JPEG with nearest-neighbor scaling)
  const handleConfirmDownloadExport = () => {
    const slug =
      characterName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-|-$/g, "") || `pixel-art-${doc.width}x${doc.height}`;

    let dataUrl = "";
    let ext = "png";

    if (exportFormat === "GIF") {
      dataUrl = encodeFramesToGifDataUrl(
        framesRef.current,
        frameDelayMs,
        exportScale,
      );
      ext = "gif";
    } else {
      const exportTarget = framesRef.current[activeFrameIndexRef.current] ?? docRef.current;
      dataUrl = renderDocumentToDataUrl(
        exportTarget,
        exportFormat,
        exportScale,
        "#090D14",
      );
      ext = exportFormat === "PNG" ? "png" : "jpg";
    }

    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${slug}.${ext}`;
    link.click();

    setExportModalOpen(false);
    setStatusNotice({
      type: "success",
      message:
        exportFormat === "GIF"
          ? `Đã xuất ảnh động ${slug}.gif (${framesRef.current.length} frame · ${doc.width * exportScale}×${doc.height * exportScale} px).`
          : `Đã xuất file ${slug}.${ext} (${doc.width * exportScale}×${doc.height * exportScale} px).`,
    });
  };

  /**
   * Placeholder async upload handler for saving exported Pixel Art PNGs.
   *
   * Future Microsoft Azure Storage integration guide:
   * 1. Convert `dataUrl` -> `Blob` (`const blob = await (await fetch(dataUrl)).blob()`).
   * 2. Request a short-lived Azure Blob SAS URL from your backend API
   *    (e.g. `POST /api/media/azure-sas` returning `{ sasUploadUrl, blobPublicUrl }`).
   * 3. Upload binary directly to Azure Blob Storage via HTTP PUT:
   *    ```ts
   *    await fetch(sasUploadUrl, {
   *      method: "PUT",
   *      headers: {
   *        "x-ms-blob-type": "BlockBlob",
   *        "Content-Type": "image/png",
   *      },
   *      body: blob,
   *    });
   *    ```
   * 4. Persist the resulting `blobPublicUrl` and character metadata to your backend DB.
   */
  // Word-style continuous local auto-save (includes all frames & GIF delay) + synchronous flush on close/unmount
  const latestDraftSnapshotRef = useRef<{
    characterId: number | null;
    characterName: string;
    description: string;
    doc: PixelDocumentState;
    frames: PixelDocumentState[];
    activeFrameIndex: number;
    layers: PixelLayer[];
    activeLayerId: string;
    frameDelayMs: number;
    baseVersionId: number | null;
    baseVersionNumber: number | null;
  } | null>(null);

  useEffect(() => {
    latestDraftSnapshotRef.current = {
      characterId: activeCharacterId ?? propCharacterId ?? null,
      characterName,
      description,
      doc,
      frames,
      activeFrameIndex,
      layers,
      activeLayerId,
      frameDelayMs,
      baseVersionId: currentVersionId ?? null,
      baseVersionNumber: currentVersionNumber ?? null,
    };
  }, [
    activeCharacterId,
    propCharacterId,
    characterName,
    description,
    doc,
    frames,
    activeFrameIndex,
    layers,
    activeLayerId,
    frameDelayMs,
    currentVersionId,
    currentVersionNumber,
  ]);

  useEffect(() => {
    if (!draftHydratedRef.current || isInheriting || !userDirtyRef.current) return;
    const hasPixelsOrText = frames.some(
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
    if (!hasPixelsOrText && !hasLocalDraft) return;

    setIsAutoSaving(true);
    const timer = window.setTimeout(() => {
      const saved = saveStudioDraft(activeCharacterId ?? propCharacterId ?? null, {
        characterName,
        description,
        doc,
        frames,
        activeFrameIndex,
        layers,
        activeLayerId,
        frameDelayMs,
        baseVersionId: currentVersionId ?? null,
        baseVersionNumber: currentVersionNumber ?? null,
      });
      setIsAutoSaving(false);
      if (saved) {
        setHasLocalDraft(true);
        const parsed = new Date(saved.updatedAt);
        setDraftSavedLabel(
          parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        );
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    doc,
    frames,
    activeFrameIndex,
    layers,
    activeLayerId,
    frameDelayMs,
    characterName,
    description,
    activeCharacterId,
    propCharacterId,
    currentVersionId,
    currentVersionNumber,
    hasLocalDraft,
    isInheriting,
  ]);

  useEffect(() => {
    const flushPendingDraft = () => {
      const snap = latestDraftSnapshotRef.current;
      if (!snap || !draftHydratedRef.current || !userDirtyRef.current) return;
      const hasPixelsOrText = snap.frames.some(
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
      if (!hasPixelsOrText) return;
      saveStudioDraft(snap.characterId, {
        characterName: snap.characterName,
        description: snap.description,
        doc: snap.doc,
        frames: snap.frames,
        activeFrameIndex: snap.activeFrameIndex,
        layers: snap.layers,
        activeLayerId: snap.activeLayerId,
        frameDelayMs: snap.frameDelayMs,
        baseVersionId: snap.baseVersionId,
        baseVersionNumber: snap.baseVersionNumber,
      });
    };

    window.addEventListener("beforeunload", flushPendingDraft);
    window.addEventListener("pagehide", flushPendingDraft);
    return () => {
      flushPendingDraft();
      window.removeEventListener("beforeunload", flushPendingDraft);
      window.removeEventListener("pagehide", flushPendingDraft);
    };
  }, []);

  const handleSaveDraft = useCallback(() => {
    const saved = saveStudioDraft(activeCharacterId ?? propCharacterId ?? null, {
      characterName,
      description,
      doc: docRef.current,
      frames: framesRef.current,
      activeFrameIndex: activeFrameIndexRef.current,
      layers: layersRef.current,
      activeLayerId: activeLayerIdRef.current,
      frameDelayMs,
      baseVersionId: currentVersionId ?? null,
      baseVersionNumber: currentVersionNumber ?? null,
    });
    setIsAutoSaving(false);
    if (saved) {
      userDirtyRef.current = true;
      setHasLocalDraft(true);
      const parsed = new Date(saved.updatedAt);
      const hhmm = parsed.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setDraftSavedLabel(hhmm);
      setStatusNotice({
        type: "success",
        message: `Đã tự động đồng bộ bản nháp (${framesRef.current.length} frame) lúc ${hhmm}.`,
      });
    }
  }, [
    activeCharacterId,
    propCharacterId,
    characterName,
    description,
    frameDelayMs,
    currentVersionId,
    currentVersionNumber,
  ]);

  const handleDiscardDraftToCommitted = useCallback(() => {
    clearStudioDraft(activeCharacterId ?? propCharacterId ?? null);
    setIsPlaying(false);
    userDirtyRef.current = false;
    skipDraftOnLoadRef.current = true;
    setIsAutoSaving(false);
    setHasLocalDraft(false);
    setDraftSavedLabel(null);
    setCharacterName(initialCharacterName);
    setDescription(initialDescription);
    setReloadVersionNonce((n) => n + 1);
  }, [activeCharacterId, propCharacterId, initialCharacterName, initialDescription]);

  async function performSaveFlow(
    mode: "UPDATE_CURRENT" | "NEW_VERSION" | "PUBLISH",
  ): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas || isSaving || isInheriting) return;

    const publishToStore = mode === "PUBLISH";
    const canOverwriteCurrent = Boolean(
      mode === "UPDATE_CURRENT" &&
        activeCharacterId &&
        currentVersionId &&
        !currentVersionListedOnStore,
    );

    const trimmedName = characterName.trim();
    if (!trimmedName) {
      setStatusNotice({
        type: "error",
        message: "Vui lòng nhập tên nhân vật trước khi lưu phiên bản.",
      });
      return;
    }
    if (!hasContent) {
      setStatusNotice({
        type: "error",
        message: "Bảng vẽ đang trống. Hãy vẽ hoặc nhập nội dung trước khi lưu.",
      });
      return;
    }

    setIsSaving(true);
    setStatusNotice(null);

    try {
      const currentFrames = framesRef.current;
      const isAnimatedGif = currentFrames.length > 1;
      const safeSlug =
        trimmedName.toLowerCase().replace(/[^a-z0-9-_]+/gi, "-") ||
        "pixel-character";

      let dataUrl = "";
      let blob: Blob;
      let uploadFile: File;

      if (isAnimatedGif) {
        blob = encodeFramesToGifBlob(currentFrames, frameDelayMs, 1);
        dataUrl = encodeFramesToGifDataUrl(currentFrames, frameDelayMs, 1);
        uploadFile = new File([blob], `${safeSlug}.gif`, { type: "image/gif" });
      } else {
        dataUrl = canvas.toDataURL("image/png");
        const response = await fetch(dataUrl);
        blob = await response.blob();
        uploadFile = new File([blob], `${safeSlug}.png`, { type: "image/png" });
      }

      // 1. Upload asset to backend
      let publicUrl = "";
      try {
        const uploadedAsset = await uploadDesignerAssetFile(
          uploadFile,
          "CHARACTER_ASSET",
        );
        publicUrl = uploadedAsset.publicUrl;
      } catch (uploadErr) {
        console.warn("Asset upload fallback notice:", uploadErr);
        const fallbackExt = isAnimatedGif ? "gif" : "png";
        publicUrl = `https://cdn.lumintra.com/characters/${safeSlug}-${Date.now()}.${fallbackExt}`;
      }

      // 2. Ensure Character exists (or sync updated name/description if modifying an existing character)
      let resolvedCharacterId = activeCharacterId;
      let isNewCharacter = false;

      if (!resolvedCharacterId) {
        const createdChar = await createDesignerCharacter({
          characterName: trimmedName,
          description:
            description.trim() ||
            `Pixel art ${doc.width}x${doc.height} thiết kế trên Pixel Art Studio`,
          characterType,
          commissionId: characterType === "COMMISSION" ? commissionId : undefined,
        });
        resolvedCharacterId = createdChar.characterId;
        setActiveCharacterId(createdChar.characterId);
        isNewCharacter = true;
      } else if (
        trimmedName !== initialCharacterName.trim() ||
        description.trim() !== initialDescription.trim()
      ) {
        await updateDesignerCharacter(resolvedCharacterId, {
          characterName: trimmedName,
          description: description.trim() || undefined,
        });
      }

      const fallbackExt = isAnimatedGif ? "gif" : "png";
      const safePreviewGifUrl =
        publicUrl && publicUrl.startsWith("http")
          ? publicUrl
          : `https://cdn.lumintra.com/characters/${safeSlug}-${Date.now()}.${fallbackExt}`;

      // Cache artwork locally for fast designer preview
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`character_artwork_${resolvedCharacterId}`, dataUrl);
          window.localStorage.setItem("last_studio_artwork", dataUrl);
          window.localStorage.setItem("last_studio_name", trimmedName);
          window.localStorage.setItem("last_studio_character_id", String(resolvedCharacterId));
        } catch (storageErr) {
          console.warn("Storage warning:", storageErr);
        }
      }

      // 3. When updating current unlisted version (e.g. refining v1), replace it cleanly before recreating
      if (canOverwriteCurrent && currentVersionId) {
        await deleteCharacterVersion(resolvedCharacterId, currentVersionId);
      }

      // 4. Create Version in backend database (saving accurate frameCount & frameDelayMs)
      let createdVersionId: number | undefined;
      let createdVersionNumber: number | undefined;
      try {
        const versionRes = await createCharacterVersion(resolvedCharacterId, {
          previewGifUrl: safePreviewGifUrl,
          frameCount: currentFrames.length,
          frameDelayMs,
          byteSize: Math.max(1, uploadFile.size),
          isCurrent: true,
        });
        createdVersionId = versionRes.versionId;
        createdVersionNumber = versionRes.versionNumber;
        if (createdVersionId && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              `character_version_artwork_${createdVersionId}`,
              dataUrl,
            );
            saveVersionFramesCache(
              createdVersionId,
              currentFrames,
              frameDelayMs,
              layersRef.current,
            );
          } catch {
            // Ignore quota warning
          }
        }
      } catch (verErr) {
        console.warn("Create character version warning:", verErr);
        throw verErr;
      }

      // Clear local draft now that this work is committed in Version Control
      clearStudioDraft(resolvedCharacterId);
      if (propCharacterId !== resolvedCharacterId) {
        clearStudioDraft(propCharacterId ?? null);
      }
      userDirtyRef.current = false;
      setHasLocalDraft(false);
      setDraftSavedLabel(null);

      // 5. Handle "Publish to Store" vs "Save Version / Update Current"
      if (publishToStore) {
        try {
          const productPayload: CreateStoreProductRequest = {
            productName: trimmedName,
            productType: CreateStoreProductRequest.productType.CHARACTER,
            basePrice: 199000,
            description: description.trim() || `Sản phẩm Pixel Art Character ${trimmedName}`,
            thumbnailUrl: publicUrl.startsWith("http") ? publicUrl : dataUrl,
            characterVersionId: createdVersionId,
          };
          const createdProduct = await apiCreateStoreProduct(productPayload);
          saveCreatedStoreProduct({
            ...createdProduct,
            status: "UNPUBLISHED" as any,
          });
        } catch {
          saveCreatedStoreProduct({
            productId: resolvedCharacterId,
            productName: trimmedName,
            productType: "CHARACTER",
            basePrice: 199000,
            description: description.trim() || `Sản phẩm Pixel Art Character ${trimmedName}`,
            thumbnailUrl: publicUrl.startsWith("http") ? publicUrl : dataUrl,
            characterVersionId: createdVersionId,
            status: "UNPUBLISHED" as any,
            createdAt: new Date().toISOString(),
          } as any);
        }

        const successMsg = `Đã chốt v${createdVersionNumber ?? targetVersionNumber ?? 1} và đăng lên Cửa hàng ở trạng thái CHƯA CÔNG KHAI (Chờ Manager phê duyệt)!`;
        setStatusNotice({ type: "success", message: successMsg });

        onPublishToStore?.({
          dataUrl,
          blob,
          characterName: trimmedName,
          description: description.trim(),
          width: doc.width,
          height: doc.height,
          characterId: resolvedCharacterId,
          versionId: createdVersionId,
          isNewCharacter,
        });
      } else {
        const versionLabel = canOverwriteCurrent
          ? `v${createdVersionNumber ?? currentVersionNumber ?? 1}`
          : `v${createdVersionNumber ?? targetVersionNumber ?? 1}`;
        const successMsg = isNewCharacter
          ? `Đã tạo nhân vật "${trimmedName}" (#${resolvedCharacterId}) và chốt phiên bản ${versionLabel}.`
          : canOverwriteCurrent
            ? `Đã cập nhật phiên bản ${versionLabel} cho "${trimmedName}" (#${resolvedCharacterId}).`
            : `Đã chốt phiên bản hoàn thiện mới ${versionLabel} cho "${trimmedName}" (#${resolvedCharacterId}).`;
        setStatusNotice({ type: "success", message: successMsg });

        onSaveVersion?.({
          dataUrl,
          blob,
          characterName: trimmedName,
          description: description.trim(),
          width: doc.width,
          height: doc.height,
          characterId: resolvedCharacterId,
          versionId: createdVersionId,
          isNewCharacter,
        });
      }

      onCharacterSaved?.({
        dataUrl,
        blob,
        characterName: trimmedName,
        description: description.trim(),
        width: doc.width,
        height: doc.height,
        characterId: resolvedCharacterId,
      });
    } catch (error) {
      setStatusNotice({
        type: "error",
        message: formatDesignerApiError(
          error,
          "Không thể lưu phiên bản. Vui lòng thử lại.",
        ),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const normalizedSelection = selection
    ? normalizeSelectionRect(selection)
    : null;

  const toolsMeta: Array<{
    key: PixelTool;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }> = [
    { key: "PEN", label: "Bút vẽ", shortcut: "B", icon: <Pen size={14} /> },
    { key: "ERASER", label: "Tẩy", shortcut: "E", icon: <Eraser size={14} /> },
    { key: "FILL", label: "Đổ màu", shortcut: "G", icon: <PaintBucket size={14} /> },
    { key: "PICKER", label: "Hút màu", shortcut: "I", icon: <Pipette size={14} /> },
    { key: "SHAPE", label: "Hình học", shortcut: "U", icon: <Square size={14} /> },
    { key: "TEXT", label: "Chữ pixel", shortcut: "T", icon: <Type size={14} /> },
    { key: "SELECT", label: "Chọn vùng", shortcut: "M", icon: <Scan size={14} /> },
    { key: "MOVE", label: "Di chuyển", shortcut: "V", icon: <Move size={14} /> },
  ];

  // Aseprite-style keyboard shortcuts (paused when typing in inputs or inside modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable),
      );

      if (importModalOpen || exportModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setImportModalOpen(false);
          setExportModalOpen(false);
        }
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        handleSaveDraft();
        return;
      }

      if (isTypingField) return;

      if (e.ctrlKey || e.metaKey) {
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (key === "y" || (key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        } else if (key === "c" && selection) {
          e.preventDefault();
          handleCopySelection();
        } else if (key === "x" && selection) {
          e.preventDefault();
          handleCutSelection();
        } else if (key === "v" && clipboard) {
          e.preventDefault();
          handlePasteClipboard();
        }
        return;
      }

      if (e.altKey) return;

      const toolShortcuts: Record<string, PixelTool> = {
        b: "PEN",
        e: "ERASER",
        g: "FILL",
        i: "PICKER",
        u: "SHAPE",
        t: "TEXT",
        m: "SELECT",
        v: "MOVE",
      };

      const matchedTool = toolShortcuts[key];
      if (matchedTool) {
        e.preventDefault();
        setActiveTool(matchedTool);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        handleDeleteSelection();
      } else if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
      } else if (e.key === "Escape" && selection) {
        e.preventDefault();
        setSelection(null);
      } else if (
        activeTool === "MOVE" &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        handleNudgeSelection(dx, dy);
      } else if (e.key === " " && framesRef.current.length > 1) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === ",") {
        e.preventDefault();
        handleSelectFrame(Math.max(0, activeFrameIndexRef.current - 1));
      } else if (e.key === ".") {
        e.preventDefault();
        handleSelectFrame(
          Math.min(framesRef.current.length - 1, activeFrameIndexRef.current + 1),
        );
      } else if (e.key === "[") {
        setBrushSize((s) => Math.max(1, s - 1));
      } else if (e.key === "]") {
        setBrushSize((s) => Math.min(4, s + 1));
      } else if (e.key === "=" || e.key === "+") {
        setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
      } else if (e.key === "-") {
        setZoomIdx((i) => Math.max(0, i - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    importModalOpen,
    exportModalOpen,
    shortcutsOpen,
    activeTool,
    selection,
    clipboard,
    handleSaveDraft,
    handleUndo,
    handleRedo,
    handleCopySelection,
    handleCutSelection,
    handleDeleteSelection,
    handleNudgeSelection,
    handlePasteClipboard,
    handleSelectFrame,
  ]);

  const shouldUpdateCurrent =
    !createNewVersionMode &&
    Boolean(activeCharacterId && currentVersionId && !currentVersionListedOnStore);
  const primarySaveVersionNumber = shouldUpdateCurrent
    ? (currentVersionNumber ?? 1)
    : (targetVersionNumber ?? 1);

  return (
    <section
      aria-label="Pixel Art Studio"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ps-chrome)] text-[var(--ps-text)]"
    >
      {/* 1. Top Document & Action Bar */}
      <div className="ase-bar flex flex-col gap-2 px-3 py-1.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-[#163d2c] bg-[#2d6a4f] text-white">
            <Sparkles size={14} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1f2a24]">
              Aseprite Studio
            </h2>
            <span className="rounded-[2px] border border-[#8a948e] bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-[#1f2a24]">
              {doc.width}×{doc.height} px
            </span>
            {activeCharacterId ? (
              <span className="rounded-[2px] border border-[#2d6a4f] bg-[#dcebe2] px-2 py-0.5 text-[11px] font-bold text-[#163d2c]">
                {createNewVersionMode && currentVersionNumber
                  ? `Bản mới v${targetVersionNumber ?? currentVersionNumber + 1}`
                  : currentVersionNumber
                    ? `Đang mở v${currentVersionNumber}`
                    : "Chưa lưu v1"}
              </span>
            ) : (
              <span className="rounded-[2px] border border-[#8a948e] bg-white px-2 py-0.5 text-[11px] font-bold text-[#4b554f]">
                Nhân vật mới
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#9aa49e] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4b554f]">
              {isAutoSaving
                ? "Đang tự động lưu..."
                : hasLocalDraft
                  ? `Tự động lưu · ${draftSavedLabel ?? "Đã lưu"}`
                  : "Tự động lưu bật"}
            </span>
            {hasLocalDraft && currentVersionId && (
              <button
                type="button"
                onClick={handleDiscardDraftToCommitted}
                title={`Bỏ thay đổi nháp hiện tại và nạp lại v${currentVersionNumber}`}
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#1f2a24]"
              >
                <RotateCcw size={12} />
                Khôi phục v{currentVersionNumber}
              </button>
            )}
          </div>
        </div>

        {/* Metadata Inputs & File Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <input
            type="text"
            value={characterName}
            onChange={(e) => {
              userDirtyRef.current = true;
              setCharacterName(e.target.value);
            }}
            maxLength={255}
            placeholder="Tên nhân vật (VD: Cyber Cat)..."
            aria-label="Tên nhân vật"
            className="ase-input w-full px-2.5 py-1.5 text-xs font-semibold sm:w-44"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => {
              userDirtyRef.current = true;
              setDescription(e.target.value);
            }}
            maxLength={255}
            placeholder="Mô tả ngắn..."
            aria-label="Mô tả nhân vật"
            className="ase-input w-full px-2.5 py-1.5 text-xs sm:w-40"
          />

          <select
            value={sizeKey}
            disabled={Boolean(lockedMatrixSize)}
            title={
              lockedMatrixSize
                ? `Kích thước bản vẽ đã khóa cố định ở mức ${lockedMatrixSize}`
                : "Chọn kích thước bản vẽ"
            }
            onChange={(e) =>
              handleSizePresetChange(e.target.value as "32x32" | "64x32" | "64x64")
            }
            aria-label="Kích thước bảng vẽ"
            className="ase-input cursor-pointer px-2 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:bg-[#e1e6e3] disabled:text-[#6b756f]"
          >
            {CANVAS_SIZE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={importInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                handleImportFileChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="ase-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold"
            >
              <ImagePlus size={14} />
              Nhập ảnh
            </button>

            <button
              type="button"
              onClick={() => {
                setExportFormat(frames.length > 1 ? "GIF" : "PNG");
                setExportModalOpen(true);
              }}
              className="ase-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold"
            >
              <Download size={14} />
              Xuất file
            </button>

            <button
              type="button"
              onClick={() =>
                void performSaveFlow(shouldUpdateCurrent ? "UPDATE_CURRENT" : "NEW_VERSION")
              }
              disabled={isSaving || isInheriting}
              title={
                shouldUpdateCurrent
                  ? `Lưu bản vẽ hiện tại vào v${primarySaveVersionNumber}`
                  : `Lưu bản vẽ thành phiên bản hoàn thiện v${primarySaveVersionNumber}`
              }
              className="ase-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:cursor-wait"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Lưu v{primarySaveVersionNumber}
            </button>

            {!effectiveHideStoreActions && Boolean(onPublishToStore) && (
              <button
                type="button"
                onClick={() => void performSaveFlow("PUBLISH")}
                disabled={isSaving || isInheriting}
                title="Chốt phiên bản và tự động tạo niêm yết Cửa hàng ở trạng thái CHƯA CÔNG KHAI (Chờ Manager phê duyệt)"
                className="ase-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:cursor-wait"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Store size={14} />
                )}
                Đăng bày bán
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="ase-btn inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
              >
                <X size={14} />
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Aseprite Context Bar (Active Tool Options + Symmetry + Grid + Undo/Redo) */}
      <div
        aria-label="Thanh tùy chỉnh nhanh công cụ"
        className="ase-bar flex flex-wrap items-center justify-between gap-2 bg-[#f5f7f6] px-3 py-1.5 text-[11px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[2px] border border-[#8a948e] bg-[#e1e6e3] px-2 py-0.5 font-mono text-[11px] font-black uppercase text-[#1f2a24]">
            {toolsMeta.find((tool) => tool.key === activeTool)?.label ?? activeTool}
          </span>

          {(activeTool === "PEN" || activeTool === "ERASER") && (
            <>
              <span className="font-bold text-[#4b554f]">Cỡ nét:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    aria-pressed={brushSize === sz}
                    onClick={() => setBrushSize(sz)}
                    className="ase-btn px-2 py-0.5 font-mono text-[11px] font-bold"
                  >
                    {sz}px
                  </button>
                ))}
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  aria-label="Thanh trượt cỡ nét"
                  className="ml-1 w-20 accent-[#2d6a4f]"
                />
                <span className="w-8 font-mono font-bold text-[#2d6a4f]">{brushSize}px</span>
              </div>
              {activeTool === "PEN" && (
                <label className="ml-2 flex items-center gap-1.5 border-l border-[#9aa49e] pl-2 font-bold text-[#4b554f]">
                  <span>Độ đậm</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-20 accent-[#2d6a4f]"
                  />
                  <span className="w-8 font-mono text-[#1f2a24]">{opacity}%</span>
                </label>
              )}
            </>
          )}

          {activeTool === "SHAPE" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: "LINE", label: "Đường", icon: <Minus size={12} /> },
                  { key: "RECTANGLE", label: "Chữ nhật", icon: <Square size={12} /> },
                  { key: "ELLIPSE", label: "Elip", icon: <Circle size={12} /> },
                  { key: "STAR", label: "Ngôi sao", icon: <Star size={12} /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={shapeKind === item.key}
                  onClick={() => setShapeKind(item.key)}
                  className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              {shapeKind !== "LINE" && (
                <div className="ml-1 flex items-center gap-1 border-l border-[#9aa49e] pl-2">
                  <button
                    type="button"
                    aria-pressed={!shapeFilled}
                    onClick={() => setShapeFilled(false)}
                    className="ase-btn px-2 py-0.5 text-[11px] font-bold"
                  >
                    Viền rỗng
                  </button>
                  <button
                    type="button"
                    aria-pressed={shapeFilled}
                    onClick={() => setShapeFilled(true)}
                    className="ase-btn px-2 py-0.5 text-[11px] font-bold"
                  >
                    Tô đặc
                  </button>
                </div>
              )}
            </div>
          )}

          {(activeTool === "SELECT" || activeTool === "MOVE") && (
            <div className="flex flex-wrap items-center gap-1">
              {normalizedSelection && (
                <span className="mr-1 font-mono font-bold text-[#2d6a4f]">
                  {normalizedSelection.right - normalizedSelection.left + 1}×
                  {normalizedSelection.bottom - normalizedSelection.top + 1}
                </span>
              )}
              <button
                type="button"
                disabled={!selection}
                onClick={handleCopySelection}
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
              >
                <Copy size={12} /> Chép
              </button>
              <button
                type="button"
                disabled={!selection}
                onClick={handleCutSelection}
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
              >
                <Scissors size={12} /> Cắt
              </button>
              <button
                type="button"
                disabled={!clipboard}
                onClick={handlePasteClipboard}
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
              >
                <ClipboardPaste size={12} /> Dán
              </button>
              <button
                type="button"
                onClick={() => handleFlipSelection("HORIZONTAL")}
                title="Lật ngang vùng chọn (hoặc toàn layer nếu chưa chọn vùng)"
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
              >
                <FlipHorizontal2 size={12} /> Lật ngang
              </button>
              <button
                type="button"
                onClick={() => handleFlipSelection("VERTICAL")}
                title="Lật dọc vùng chọn (hoặc toàn layer nếu chưa chọn vùng)"
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
              >
                <FlipVertical2 size={12} /> Lật dọc
              </button>
              <button
                type="button"
                disabled={!selection}
                onClick={handleDeleteSelection}
                className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-red-700"
              >
                <Trash size={12} /> Xóa
              </button>
              {selection && (
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="ase-btn px-2 py-0.5 text-[11px] font-semibold"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          )}

          {activeTool === "FILL" && (
            <span className="text-[#4b554f]">Bấm vào vùng kín để đổ màu (hỗ trợ Đối xứng & Độ mờ · Alt+Click để hút màu).</span>
          )}
          {activeTool === "PICKER" && (
            <span className="text-[#4b554f]">Chấm lên điểm ảnh bất kỳ để lấy màu và quay lại bút vẽ.</span>
          )}
          {activeTool === "TEXT" && (
            <span className="text-[#4b554f]">Bấm lên canvas để chọn tọa độ đặt chữ hoặc sửa khối chữ bên phải.</span>
          )}
        </div>

        {/* Right side of Context Bar: Mirror Symmetry, Grid, Undo/Redo & Collapsible Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-[#4b554f]">Đối xứng:</span>
          {(
            [
              { key: "NONE", label: "Tắt", icon: null },
              { key: "HORIZONTAL", label: "Ngang", icon: <FlipHorizontal2 size={12} /> },
              { key: "VERTICAL", label: "Dọc", icon: <FlipVertical2 size={12} /> },
              { key: "BOTH", label: "2 Trục", icon: null },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={mirrorMode === m.key}
              onClick={() => setMirrorMode(m.key)}
              className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
            >
              {m.icon}
              {m.label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-[#9aa49e]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            aria-pressed={showGrid}
            title={showGrid ? "Ẩn lưới điểm ảnh" : "Hiện lưới điểm ảnh"}
            className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
          >
            <LayoutGrid size={12} />
            Lưới
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={historyMeta.undo === 0}
            title="Hoàn tác"
            aria-label="Hoàn tác"
            className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
          >
            <Undo2 size={12} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyMeta.redo === 0}
            title="Làm lại"
            aria-label="Làm lại"
            className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
          >
            <Redo2 size={12} />
          </button>

          <div ref={shortcutsMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={shortcutsOpen}
              aria-pressed={shortcutsOpen}
              onClick={() => setShortcutsOpen((prev) => !prev)}
              title="Xem bảng phím tắt nhanh"
              className="ase-btn inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold"
            >
              <Keyboard size={12} />
              Phím tắt
            </button>

            {shortcutsOpen && (
              <div
                role="dialog"
                aria-label="Bảng phím tắt Studio"
                className="ase-panel absolute right-0 top-full z-40 mt-1.5 w-72 shadow-xl"
              >
                <div className="ase-panel-head flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
                  <span>Phím tắt Studio</span>
                  <button
                    type="button"
                    onClick={() => setShortcutsOpen(false)}
                    aria-label="Đóng bảng phím tắt"
                    className="ase-btn p-0.5"
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-white p-2.5 font-mono text-[10px] text-[#4b554f]">
                  <span><strong className="text-[#1f2a24]">B / E</strong> Bút / Tẩy</span>
                  <span><strong className="text-[#1f2a24]">G / I</strong> Đổ / Hút màu</span>
                  <span><strong className="text-[#1f2a24]">U / T</strong> Hình / Chữ</span>
                  <span><strong className="text-[#1f2a24]">M / V</strong> Chọn / Kéo</span>
                  <span><strong className="text-[#1f2a24]">Chuột phải</strong> Tẩy nhanh</span>
                  <span><strong className="text-[#1f2a24]">Alt+Click</strong> Hút màu</span>
                  <span><strong className="text-[#1f2a24]">Shift+Kéo</strong> Vuông / Thẳng</span>
                  <span><strong className="text-[#1f2a24]">Mũi tên</strong> Dịch 1px (V)</span>
                  <span><strong className="text-[#1f2a24]">[ ]</strong> Cỡ nét</span>
                  <span><strong className="text-[#1f2a24]">, / .</strong> Đổi frame</span>
                  <span><strong className="text-[#1f2a24]">Space</strong> Phát / Dừng GIF</span>
                  <span><strong className="text-[#1f2a24]">+ / -</strong> Zoom canvas</span>
                  <span><strong className="text-[#1f2a24]">Ctrl+Z/Y</strong> Undo / Redo</span>
                  <span><strong className="text-[#1f2a24]">Ctrl+C/X/V</strong> Chép / Cắt / Dán</span>
                  <span><strong className="text-[#1f2a24]">Ctrl+S</strong> Lưu nháp</span>
                  <span><strong className="text-[#1f2a24]">Del / Esc</strong> Xóa / Bỏ chọn</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {statusNotice && (
        <div
          role={statusNotice.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-2 border-b-2 px-4 py-2 text-xs font-bold ${
            statusNotice.type === "error"
              ? "border-red-600 bg-red-50 text-red-700"
              : "border-[#2d6a4f] bg-[#dcebe2] text-[#163d2c]"
          }`}
        >
          <span className="flex items-center gap-2">
            {statusNotice.type === "error" ? (
              <AlertCircle size={15} className="shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="shrink-0 text-[#2d6a4f]" />
            )}
            {statusNotice.message}
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Đóng thông báo"
            className="ase-btn p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 3. Main Aseprite 3-Pane Workspace: Left Palette | Center Canvas + Status | Right Tool Rail + Inspector */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ps-chrome)] lg:flex-row">
        {/* Left Pane: Fixed Aseprite Color Palette Dock */}
        <aside
          aria-label="Bảng màu Aseprite"
          className="ase-dock order-2 flex w-full shrink-0 flex-col gap-2.5 border-t-2 p-2 lg:order-1 lg:w-[236px] lg:overflow-y-auto lg:border-r-2 lg:border-t-0"
        >
          <div className="ase-panel">
            <div className="ase-panel-head flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
              <span>Bảng màu</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-pressed={colorPanelTab === "SWATCH"}
                  onClick={() => setColorPanelTab("SWATCH")}
                  className="ase-btn px-1.5 py-0.5 text-[10px] font-bold"
                >
                  Mẫu
                </button>
                <button
                  type="button"
                  aria-pressed={colorPanelTab === "SLIDERS"}
                  onClick={() => setColorPanelTab("SLIDERS")}
                  className="ase-btn px-1.5 py-0.5 text-[10px] font-bold"
                >
                  RGB/HSV
                </button>
              </div>
            </div>

            <div className="space-y-2 p-2.5">
              {/* Active Color Chip + Editable Hex + Add / Update Swatch */}
              <div className="space-y-1.5 border-2 border-[#8a948e] bg-[#f5f7f6] p-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={normalizeHex(selectedColor)}
                    onChange={(e) => {
                      setSelectedColor(normalizeHex(e.target.value));
                      if (activeTool === "ERASER") setActiveTool("PEN");
                    }}
                    aria-label="Chọn màu hex"
                    className="h-7 w-7 shrink-0 cursor-pointer border-2 border-[#1f2a24] bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    maxLength={7}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    onBlur={handleHexInputCommit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleHexInputCommit();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    aria-label="Nhập mã màu Hex"
                    className="ase-input min-w-0 flex-1 px-1.5 py-0.5 font-mono text-xs font-black uppercase text-[#1f2a24]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={handleAddCustomSwatch}
                    title="Thêm màu hiện tại thành ô màu mới"
                    className="ase-btn inline-flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-bold"
                  >
                    <Plus size={10} /> Thêm ô
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateSelectedSwatch}
                    disabled={
                      selectedSwatchIdx < 0 || selectedSwatchIdx >= paletteSwatches.length
                    }
                    title="Cập nhật ô màu đang chọn bằng màu hiện tại"
                    className="ase-btn inline-flex items-center justify-center gap-1 px-1.5 py-1 text-[10px] font-bold"
                  >
                    <Pencil size={10} /> Sửa ô
                  </button>
                </div>
              </div>

              {colorPanelTab === "SWATCH" ? (
                <div className="space-y-2">
                  {/* Palette Preset & Extract from Canvas */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <select
                        aria-label="Bộ màu mẫu"
                        value={activePresetId}
                        onChange={(e) => {
                          if (e.target.value) handleApplyPalettePreset(e.target.value);
                        }}
                        className="ase-input min-w-0 flex-1 px-1.5 py-1 text-[10px] font-bold text-[#1f2a24]"
                      >
                        <option value="" disabled>
                          Nạp bộ màu...
                        </option>
                        {customPresets.length > 0 && (
                          <optgroup label="Preset cá nhân (trên máy)">
                            {customPresets.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.label} ({preset.swatches.length})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Preset hệ thống">
                          {PALETTE_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <button
                        type="button"
                        onClick={handleExtractPalette}
                        title="Trích bảng màu từ tất cả frame của nhân vật hiện tại"
                        className="ase-btn inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold"
                      >
                        <Wand2 size={10} /> Trích
                      </button>
                    </div>

                    {savingPresetOpen ? (
                      <div className="flex items-center gap-1 border border-[#8a948e] bg-[#f5f7f6] p-1">
                        <input
                          type="text"
                          value={presetNameInput}
                          onChange={(e) => setPresetNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCustomPreset();
                            if (e.key === "Escape") setSavingPresetOpen(false);
                          }}
                          placeholder="Tên preset..."
                          aria-label="Tên preset bảng màu cá nhân"
                          className="ase-input min-w-0 flex-1 px-1.5 py-0.5 text-[10px] font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomPreset}
                          className="ase-btn-primary shrink-0 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setSavingPresetOpen(false)}
                          aria-label="Hủy lưu preset"
                          className="ase-btn shrink-0 p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleOpenSavePreset}
                          title="Lưu khay màu hiện tại thành preset cá nhân trên máy này"
                          className="ase-btn inline-flex flex-1 items-center justify-center gap-1 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          <Save size={10} /> Lưu thành preset
                        </button>
                        {customPresets.some((p) => p.id === activePresetId) && (
                          <>
                            <button
                              type="button"
                              onClick={handleUpdateSelectedCustomPreset}
                              disabled={paletteSwatches.length === 0}
                              title="Ghi đè preset cá nhân đang chọn bằng khay màu hiện tại"
                              className="ase-btn shrink-0 px-1.5 py-0.5 text-[10px] font-bold"
                            >
                              Cập nhật
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteSelectedCustomPreset}
                              title="Xóa preset cá nhân đang chọn"
                              aria-label="Xóa preset cá nhân"
                              className="ase-btn shrink-0 p-1 text-red-700"
                            >
                              <Trash size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {paletteSwatches.length === 0 ? (
                    <div className="border border-dashed border-[#9aa49e] bg-[#f7f9f8] p-2.5 text-center text-[10px] text-[#4b554f]">
                      <p>Khay màu đang trống.</p>
                      <button
                        type="button"
                        onClick={() =>
                          setPaletteSwatches(DEFAULT_SWATCHES.map((s) => ({ ...s })))
                        }
                        className="mt-1 font-bold text-[#2d6a4f] hover:underline"
                      >
                        Khôi phục màu mặc định
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1">
                      {paletteSwatches.map((swatch, idx) => {
                        const isSelectedIdx = selectedSwatchIdx === idx;
                        const active =
                          (isSelectedIdx ||
                            normalizeHex(selectedColor) === normalizeHex(swatch.hex)) &&
                          activeTool !== "ERASER";
                        return (
                          <div key={`${swatch.hex}-${idx}`} className="group relative">
                            <button
                              type="button"
                              title={`${swatch.name} (${swatch.hex})`}
                              aria-label={`${swatch.name} ${swatch.hex}`}
                              onClick={() => {
                                setSelectedSwatchIdx(idx);
                                setSelectedColor(swatch.hex);
                                if (activeTool === "ERASER") setActiveTool("PEN");
                              }}
                              className={`block h-7 w-full cursor-pointer border-2 transition-transform hover:scale-105 ${
                                active
                                  ? "border-[#111111] ring-2 ring-white ring-inset"
                                  : "border-[#7d8781]"
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSwatch(idx);
                              }}
                              title={`Xóa ô màu ${swatch.hex}`}
                              aria-label={`Xóa màu ${swatch.hex}`}
                              className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 cursor-pointer items-center justify-center border border-black bg-white text-black hover:bg-red-50 hover:text-red-700 group-hover:flex"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 text-[10px] font-bold text-[#4b554f]">
                  {(
                    [
                      { label: "R", val: currentRgb.r, max: 255, set: (v: number) => setSelectedColor(rgbToHex(v, currentRgb.g, currentRgb.b)) },
                      { label: "G", val: currentRgb.g, max: 255, set: (v: number) => setSelectedColor(rgbToHex(currentRgb.r, v, currentRgb.b)) },
                      { label: "B", val: currentRgb.b, max: 255, set: (v: number) => setSelectedColor(rgbToHex(currentRgb.r, currentRgb.g, v)) },
                    ] as const
                  ).map((ch) => (
                    <label key={ch.label} className="flex items-center gap-2">
                      <span className="w-3 font-mono">{ch.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={ch.max}
                        value={ch.val}
                        onChange={(e) => ch.set(Number(e.target.value))}
                        className="flex-1 accent-[#2d6a4f]"
                      />
                      <span className="w-7 text-right font-mono text-[#1f2a24]">{ch.val}</span>
                    </label>
                  ))}
                  <div className="h-px bg-[#dfe3e0]" />
                  {(
                    [
                      {
                        label: "H",
                        val: currentHsv.h,
                        max: 360,
                        unit: "°",
                        set: (v: number) => {
                          const rgb = hsvToRgb(v, currentHsv.s, currentHsv.v);
                          setSelectedColor(rgbToHex(rgb.r, rgb.g, rgb.b));
                        },
                      },
                      {
                        label: "S",
                        val: currentHsv.s,
                        max: 100,
                        unit: "%",
                        set: (v: number) => {
                          const rgb = hsvToRgb(currentHsv.h, v, currentHsv.v);
                          setSelectedColor(rgbToHex(rgb.r, rgb.g, rgb.b));
                        },
                      },
                      {
                        label: "V",
                        val: currentHsv.v,
                        max: 100,
                        unit: "%",
                        set: (v: number) => {
                          const rgb = hsvToRgb(currentHsv.h, currentHsv.s, v);
                          setSelectedColor(rgbToHex(rgb.r, rgb.g, rgb.b));
                        },
                      },
                    ] as const
                  ).map((ch) => (
                    <label key={ch.label} className="flex items-center gap-2">
                      <span className="w-3 font-mono">{ch.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={ch.max}
                        value={ch.val}
                        onChange={(e) => ch.set(Number(e.target.value))}
                        className="flex-1 accent-[#2d6a4f]"
                      />
                      <span className="w-8 text-right font-mono text-[#1f2a24]">
                        {ch.val}
                        {ch.unit}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearCanvas}
            disabled={!hasContent}
            className="ase-btn flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-red-700"
          >
            <Trash size={13} /> Xóa toàn bộ bảng vẽ
          </button>
        </aside>

        {/* Center Pane: Top Frame Timeline Strip + Canvas Pasteboard + Bottom Status Bar */}
        <div className="order-1 flex min-h-0 w-full min-w-0 flex-1 flex-col lg:order-2">
          {/* Compact Aseprite GIF Animation Timeline Strip (Top Row above Canvas) */}
          <div
            aria-label="Timeline khung hình GIF"
            className="flex flex-wrap items-center gap-2 border-b-2 border-[#8a948e] bg-[#dfe4e1] px-2.5 py-1.5"
          >
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={frames.length <= 1}
                onClick={() => setIsPlaying((p) => !p)}
                title={
                  frames.length <= 1
                    ? "Thêm ít nhất 2 frame để chạy thử GIF (Space)"
                    : effectivePlaying
                      ? "Dừng phát thử (Space)"
                      : "Phát thử GIF trên Live LED Preview (Space)"
                }
                aria-pressed={effectivePlaying}
                className="ase-btn inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold"
              >
                {effectivePlaying ? <Pause size={12} /> : <Play size={12} />}
                {effectivePlaying ? "Dừng" : "Phát GIF"}
              </button>

              <select
                value={frameDelayMs}
                onChange={(e) => {
                  userDirtyRef.current = true;
                  setFrameDelayMs(Number(e.target.value));
                }}
                aria-label="Tốc độ khung hình GIF"
                title="Thời gian trễ mỗi frame (GIF frame delay)"
                className="ase-input cursor-pointer px-1.5 py-1 font-mono text-[10px] font-bold"
              >
                <option value={60}>60ms (16fps)</option>
                <option value={100}>100ms (10fps)</option>
                <option value={150}>150ms (6.7fps)</option>
                <option value={200}>200ms (5fps)</option>
                <option value={300}>300ms (3.3fps)</option>
                <option value={500}>500ms (2fps)</option>
              </select>

              <button
                type="button"
                onClick={() => setShowOnionSkin((v) => !v)}
                aria-pressed={showOnionSkin}
                title="Hiển thị mờ frame trước đó phía sau bảng vẽ"
                className="ase-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
              >
                <Layers size={11} />
                Onion
              </button>

              <span className="mx-0.5 h-4 w-px bg-[#9aa49e]" aria-hidden="true" />

              <button
                type="button"
                onClick={handleAddFrame}
                title="Thêm frame trống mới"
                className="ase-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
              >
                <Plus size={11} /> Frame
              </button>
              <button
                type="button"
                onClick={handleDuplicateFrame}
                title="Nhân bản frame hiện tại để sửa tiếp chuyển động"
                className="ase-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
              >
                <CopyPlus size={11} /> Nhân bản
              </button>
              <button
                type="button"
                onClick={() => handleMoveFrame(-1)}
                disabled={activeFrameIndex === 0}
                title="Đưa frame sang trái"
                aria-label="Đưa frame sang trái"
                className="ase-btn p-1"
              >
                <ChevronLeft size={11} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveFrame(1)}
                disabled={activeFrameIndex >= frames.length - 1}
                title="Đưa frame sang phải"
                aria-label="Đưa frame sang phải"
                className="ase-btn p-1"
              >
                <ChevronRight size={11} />
              </button>
              <button
                type="button"
                onClick={handleDeleteFrame}
                disabled={frames.length <= 1}
                title="Xóa frame hiện tại"
                aria-label="Xóa frame hiện tại"
                className="ase-btn p-1 text-red-700"
              >
                <Trash size={11} />
              </button>
            </div>

            {/* Frame Thumbnails Strip */}
            <div className="flex min-w-[160px] flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
              {frames.map((frameDoc, idx) => {
                const isSelected = idx === activeFrameIndex;
                const isPlaybackHighlight =
                  effectivePlaying && idx === playbackFrameIndex % frames.length;
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectFrame(idx)}
                    title={`Frame ${idx + 1}`}
                    className={`ase-btn relative flex shrink-0 items-center gap-1.5 px-1.5 py-1 ${
                      isPlaybackHighlight ? "ring-2 ring-[#2d6a4f]" : ""
                    }`}
                  >
                    <FrameMiniCanvas frameDoc={frameDoc} />
                    <span className="font-mono text-[10px] font-black text-[#1f2a24]">
                      F{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={pasteboardRef}
            className={`ps-pasteboard flex min-h-0 flex-1 items-center justify-center p-2.5 sm:p-3 ${
              zoom > 1 ? "overflow-auto" : "overflow-hidden"
            }`}
          >
            <div className="ase-panel max-w-full p-2">
              <div
                className="relative mx-auto overflow-hidden border-2 border-[#1f2a24] bg-[#090d14]"
                style={{
                  width: fittedCanvasWidth
                    ? `${Math.round(fittedCanvasWidth * zoom)}px`
                    : `min(${sizeOption.displayWidth}px, 100%, calc((100dvh - 22rem) * ${doc.width} / ${doc.height}))`,
                  maxWidth: "100%",
                  aspectRatio: `${doc.width} / ${doc.height}`,
                }}
              >
                {isInheriting && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 text-white backdrop-blur-xs">
                    <Loader2 size={24} className="mb-2 animate-spin text-[#89c89b]" />
                    <p className="text-xs font-bold text-[#a3d7b2]">Kế thừa thiết kế phiên bản trước...</p>
                    <p className="mt-0.5 text-[10px] text-slate-300">Đang nạp và ánh xạ điểm ảnh lên canvas</p>
                  </div>
                )}
                {/* Onion Skin overlay showing previous frame faintly behind active frame */}
                {showOnionSkin && activeFrameIndex > 0 && (
                  <canvas
                    ref={onionCanvasRef}
                    width={doc.width}
                    height={doc.height}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 block h-full w-full opacity-25"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  width={doc.width}
                  height={doc.height}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => {
                    if (e.button === 0 || e.button === 2) {
                      if (e.button === 2) e.preventDefault();
                      beginStrokeAt(e.clientX, e.clientY, {
                        button: e.button,
                        altKey: e.altKey,
                        shiftKey: e.shiftKey,
                      });
                    }
                  }}
                  onMouseMove={(e) =>
                    continueStrokeAt(e.clientX, e.clientY, { shiftKey: e.shiftKey })
                  }
                  onMouseUp={endStroke}
                  onMouseLeave={() => {
                    setHoverPixel(null);
                    endStroke();
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (t) beginStrokeAt(t.clientX, t.clientY);
                  }}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    if (t) continueStrokeAt(t.clientX, t.clientY);
                  }}
                  onTouchEnd={endStroke}
                  className={`block h-full w-full touch-none select-none ${
                    activeTool === "MOVE"
                      ? "cursor-move"
                      : activeTool === "TEXT"
                        ? "cursor-text"
                        : activeTool === "PICKER"
                          ? "cursor-cell"
                          : "cursor-crosshair"
                  }`}
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Subtle 1px Overlay Grid */}
                {showGrid && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255, 255, 255, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.14) 1px, transparent 1px)",
                      backgroundSize: `${100 / doc.width}% ${100 / doc.height}%`,
                    }}
                  />
                )}

                {/* Mirror Symmetry Guide Lines */}
                {(mirrorMode === "HORIZONTAL" || mirrorMode === "BOTH") && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-1/2 w-px border-l border-dashed border-cyan-400/70"
                  />
                )}
                {(mirrorMode === "VERTICAL" || mirrorMode === "BOTH") && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-1/2 h-px border-t border-dashed border-cyan-400/70"
                  />
                )}

                {/* Selection Marquee Overlay */}
                {normalizedSelection && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute border-2 border-dashed border-amber-300 bg-amber-300/10"
                    style={{
                      left: `${(Math.max(0, normalizedSelection.left) / doc.width) * 100}%`,
                      top: `${(Math.max(0, normalizedSelection.top) / doc.height) * 100}%`,
                      width: `${
                        ((Math.min(doc.width - 1, normalizedSelection.right) -
                          Math.max(0, normalizedSelection.left) +
                          1) /
                          doc.width) *
                        100
                      }%`,
                      height: `${
                        ((Math.min(doc.height - 1, normalizedSelection.bottom) -
                          Math.max(0, normalizedSelection.top) +
                          1) /
                          doc.height) *
                        100
                      }%`,
                    }}
                  />
                )}

                {/* Hover Pixel / Brush Cursor Preview */}
                {hoverPixel && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute border border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                    style={{
                      left: `${
                        ((hoverPixel.x -
                          (activeTool === "PEN" || activeTool === "ERASER"
                            ? Math.floor((brushSize - 1) / 2)
                            : 0)) /
                          doc.width) *
                        100
                      }%`,
                      top: `${
                        ((hoverPixel.y -
                          (activeTool === "PEN" || activeTool === "ERASER"
                            ? Math.floor((brushSize - 1) / 2)
                            : 0)) /
                          doc.height) *
                        100
                      }%`,
                      width: `${
                        ((activeTool === "PEN" || activeTool === "ERASER"
                          ? brushSize
                          : 1) /
                          doc.width) *
                        100
                      }%`,
                      height: `${
                        ((activeTool === "PEN" || activeTool === "ERASER"
                          ? brushSize
                          : 1) /
                          doc.height) *
                        100
                      }%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Aseprite Bottom Status Bar */}
          <footer
            aria-label="Thanh trạng thái bảng vẽ"
            className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#8a948e] bg-[#e9ecea] px-3 py-1 font-mono text-[11px] font-bold text-[#1f2a24]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-[84px]">
                {hoverPixel ? `X:${hoverPixel.x} Y:${hoverPixel.y}` : "X:— Y:—"}
              </span>
              <span className="border-l border-[#9aa49e] pl-3">
                {activeTool}
                {(activeTool === "PEN" || activeTool === "ERASER") ? ` (${brushSize}px)` : ""}
              </span>
              {mirrorMode !== "NONE" && (
                <span className="border-l border-[#9aa49e] pl-3 text-[#2d6a4f]">
                  MIRROR:{mirrorMode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[#4b554f]">
                {doc.width}×{doc.height}
              </span>
              <button
                type="button"
                onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                aria-label="Thu nhỏ"
                className="ase-btn p-1"
              >
                <ZoomOut size={12} />
              </button>
              <span className="min-w-11 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() =>
                  setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
                }
                disabled={zoomIdx === ZOOM_STEPS.length - 1}
                aria-label="Phóng to"
                className="ase-btn p-1"
              >
                <ZoomIn size={12} />
              </button>
            </div>
          </footer>
        </div>

        {/* Right Pane: Vertical Tool Rail + Inspector */}
        <div className="order-3 flex shrink-0 flex-col lg:flex-row">
          {/* Aseprite Tool Rail (adjacent to canvas right edge on desktop) */}
          <aside
            aria-label="Thanh công cụ vẽ"
            className="ase-dock flex shrink-0 flex-row flex-wrap items-center gap-1 border-t-2 p-1.5 lg:w-12 lg:flex-col lg:flex-nowrap lg:border-l-2 lg:border-t-0"
          >
            {toolsMeta.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setActiveTool(tool.key)}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={`${tool.label} (${tool.shortcut})`}
                aria-pressed={activeTool === tool.key}
                className="ase-btn group relative flex h-8 w-8 items-center justify-center [&_svg]:h-[16px] [&_svg]:w-[16px]"
              >
                {tool.icon}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-full z-50 mr-2 hidden whitespace-nowrap border-2 border-[#1f2a24] bg-[#1b1b1b] px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 lg:block"
                >
                  {tool.label} <span className="font-mono text-[#89c89b]">({tool.shortcut})</span>
                </span>
              </button>
            ))}

            {/* Active foreground swatch indicator */}
            <div
              className="ml-auto flex items-center lg:ml-0 lg:mt-auto lg:pb-1"
              title={`Màu đang chọn ${selectedColor}`}
            >
              <span
                className="block h-7 w-7 border-2 border-[#1f2a24] shadow-[inset_0_0_0_2px_#ffffff]"
                style={{ backgroundColor: selectedColor }}
                aria-label={`Màu đang chọn ${selectedColor}`}
              />
            </div>
          </aside>

          {/* Right Inspector Dock (Live 1:1 LED Preview + Text Pixel + History + Shortcuts) */}
          <aside
            aria-label="Bảng thông số phụ trợ"
            className="ase-dock flex w-full shrink-0 flex-col gap-2.5 border-t-2 p-2 lg:w-[236px] lg:overflow-y-auto lg:border-l-2 lg:border-t-0"
          >
            {/* Live 1:1 LED Preview Window */}
            <div className="ase-panel">
              <div className="ase-panel-head flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
                <span>Live LED Preview</span>
                <div className="flex items-center gap-1">
                  {frames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-pressed={effectivePlaying}
                      title={effectivePlaying ? "Dừng phát GIF" : "Phát thử GIF"}
                      aria-label={effectivePlaying ? "Dừng phát GIF" : "Phát thử GIF"}
                      className="ase-btn px-1.5 py-0.5 text-[10px] font-bold"
                    >
                      {effectivePlaying ? <Pause size={10} /> : <Play size={10} />}
                    </button>
                  )}
                  {([1, 2, 4] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      aria-pressed={previewScale === scale}
                      onClick={() => setPreviewScale(scale)}
                      title={`Xem trước LED ở tỉ lệ ${scale}×`}
                      className="ase-btn px-1.5 py-0.5 font-mono text-[10px] font-bold"
                    >
                      {scale}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 p-2">
                <div className="flex min-h-[104px] w-full items-center justify-center overflow-hidden border-2 border-[#1f2a24] bg-[#090d14] p-2">
                  <canvas
                    ref={previewCanvasRef}
                    width={doc.width}
                    height={doc.height}
                    aria-label="Xem trước màn LED tỉ lệ thực"
                    className="block shrink-0 border border-white/10"
                    style={{
                      width: `${Math.min(184, doc.width * previewScale)}px`,
                      maxWidth: "100%",
                      aspectRatio: `${doc.width} / ${doc.height}`,
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
                <div className="flex w-full items-center justify-between font-mono text-[10px] font-bold text-[#4b554f]">
                  <span>
                    {frames.length > 1
                      ? `F${(effectivePlaying ? playbackFrameIndex % frames.length : activeFrameIndex) + 1}/${frames.length} · ${frameDelayMs}ms`
                      : `${doc.width}×${doc.height} LED`}
                  </span>
                  <span>
                    {previewScale === 1 ? "1:1 Thực" : `Zoom ${previewScale}× · Không lưới`}
                  </span>
                </div>
              </div>
            </div>

            <StudioLayersPanel
              layers={layers}
              activeLayerId={activeLayer.id}
              onSelectLayer={handleSelectLayer}
              onAddLayer={handleAddLayer}
              onDuplicateLayer={handleDuplicateLayer}
              onDeleteLayer={handleDeleteLayer}
              onMergeDownLayer={handleMergeDownLayer}
              onMoveLayer={handleMoveLayer}
              onToggleVisible={handleToggleLayerVisible}
              onToggleLocked={handleToggleLayerLocked}
              onRenameLayer={handleRenameLayer}
              onChangeOpacity={handleChangeLayerOpacity}
            />

            {activeTool === "TEXT" && (
              <div className="ase-panel">
                <div className="ase-panel-head flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
                  <span>Chữ Pixel (ASCII)</span>
                  {editingTextId && (
                    <button
                      type="button"
                      onClick={() => setEditingTextId(null)}
                      className="text-[10px] font-bold text-[#2d6a4f] hover:underline"
                    >
                      + Khối mới
                    </button>
                  )}
                </div>

                <div className="space-y-2 p-2.5">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="VD: HI, VIP, GO..."
                    className="ase-input w-full px-2 py-1.5 text-xs"
                  />

                  <select
                    value={textPresetIdx}
                    onChange={(e) => setTextPresetIdx(Number(e.target.value))}
                    className="ase-input w-full px-2 py-1.5 text-xs font-bold"
                  >
                    {GLYPH_SIZE_PRESETS.map((preset, idx) => (
                      <option key={preset.label} value={idx}>
                        Cỡ chữ {preset.label}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="block text-[10px] font-bold text-[#4b554f]">
                      X (bảng vẽ)
                      <input
                        type="number"
                        min={0}
                        max={doc.width - 1}
                        value={textX}
                        onChange={(e) => setTextX(Number(e.target.value))}
                        className="ase-input mt-0.5 w-full px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block text-[10px] font-bold text-[#4b554f]">
                      Y
                      <input
                        type="number"
                        min={0}
                        max={doc.height - 1}
                        value={textY}
                        onChange={(e) => setTextY(Number(e.target.value))}
                        className="ase-input mt-0.5 w-full px-2 py-1 text-xs"
                      />
                    </label>
                  </div>

                  {!isTextAsciiValid && (
                    <p className="text-[10px] font-bold text-red-700">
                      Chỉ hỗ trợ ký tự ASCII không dấu.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveTextBlock}
                    className="ase-btn-primary w-full py-1.5 text-xs font-bold"
                  >
                    {editingTextId ? "Cập nhật khối chữ" : "Thêm khối chữ lên canvas"}
                  </button>

                  {doc.texts.length > 0 && (
                    <div className="space-y-1 border-t border-[#dfe3e0] pt-2">
                      <p className="text-[10px] font-bold text-[#4b554f]">
                        Các khối chữ ({doc.texts.length})
                      </p>
                      {doc.texts.map((block) => (
                        <div
                          key={block.id}
                          className={`flex items-center justify-between gap-1 border px-2 py-1 text-[11px] ${
                            editingTextId === block.id
                              ? "border-[#2d6a4f] bg-[#dcebe2] font-bold text-[#163d2c]"
                              : "border-[#dfe3e0] bg-white text-[#1f2a24]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTextId(block.id);
                              setTextInput(block.text);
                              setTextX(block.x);
                              setTextY(block.y);
                              setSelectedColor(block.color);
                            }}
                            className="min-w-0 flex-1 cursor-pointer truncate text-left"
                          >
                            "{block.text}" ({block.x},{block.y})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRasterizeTextBlock(block.id)}
                            title="Đóng khối chữ thành điểm ảnh trên layer hiện tại"
                            className="ase-btn shrink-0 px-1 py-0.5 text-[9px] font-bold text-[#163d2c]"
                          >
                            Đóng pixel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTextBlock(block.id)}
                            aria-label="Xóa khối chữ"
                            className="shrink-0 cursor-pointer text-red-600 hover:text-red-800"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="ase-panel">
              <div className="ase-panel-head px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
                Lịch sử thao tác
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyMeta.undo === 0}
                  title="Hoàn tác (Ctrl+Z)"
                  className="ase-btn flex items-center justify-center gap-1 py-1.5"
                >
                  <Undo2 size={13} /> Hoàn tác ({historyMeta.undo})
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyMeta.redo === 0}
                  title="Làm lại (Ctrl+Y)"
                  className="ase-btn flex items-center justify-center gap-1 py-1.5"
                >
                  <Redo2 size={13} /> Làm lại ({historyMeta.redo})
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Import Image Modal (Aseprite Pixel-Bevel Dialog) */}
      {importModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-image-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="ase-panel w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="ase-panel-head flex items-center justify-between px-3 py-2">
              <h3
                id="import-image-title"
                className="text-xs font-black uppercase tracking-wide text-[#1f2a24]"
              >
                Nhập ảnh thành Pixel Art ({doc.width}×{doc.height})
              </h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                aria-label="Đóng hộp thoại nhập ảnh"
                className="ase-btn p-1 text-[#1f2a24]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 p-4">
              <div
                className="overflow-hidden border-2 border-[#1f2a24] bg-[#090d14] p-2"
                style={{
                  width: "288px",
                  maxWidth: "100%",
                  aspectRatio: `${doc.width} / ${doc.height}`,
                }}
              >
                <canvas
                  ref={importPreviewCanvasRef}
                  width={doc.width}
                  height={doc.height}
                  className="h-full w-full"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>

              <div className="grid w-full grid-cols-3 gap-2">
                {(
                  [
                    { key: "CONTAIN", label: "Thu vừa (Contain)" },
                    { key: "COVER", label: "Cắt đầy (Cover)" },
                    { key: "STRETCH", label: "Kéo giãn (Stretch)" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    aria-pressed={importFit === mode.key}
                    onClick={() => setImportFit(mode.key)}
                    className="ase-btn py-2 text-xs font-bold"
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="grid w-full grid-cols-2 gap-4 text-xs font-bold text-[#1f2a24]">
                <label className="block">
                  Độ sáng ({importBrightness}%)
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={importBrightness}
                    onChange={(e) => setImportBrightness(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#2d6a4f]"
                  />
                </label>
                <label className="block">
                  Tương phản ({importContrast}%)
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={importContrast}
                    onChange={(e) => setImportContrast(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#2d6a4f]"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-[#8a948e] bg-[#e9ecea] px-4 py-2.5">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="ase-btn px-4 py-1.5 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="ase-btn-primary px-4 py-1.5 text-xs font-bold"
              >
                Áp dụng vào Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export File Dialog (Aseprite Pixel-Bevel Dialog) */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-image-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="ase-panel w-full max-w-md overflow-hidden shadow-2xl">
            <div className="ase-panel-head flex items-center justify-between px-3 py-2">
              <h3
                id="export-image-title"
                className="text-xs font-black uppercase tracking-wide text-[#1f2a24]"
              >
                Xuất file thiết kế ({doc.width}×{doc.height})
              </h3>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                aria-label="Đóng hộp thoại xuất file"
                className="ase-btn p-1 text-[#1f2a24]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="text-xs font-bold text-[#1f2a24]">Định dạng ảnh</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    aria-pressed={exportFormat === "GIF"}
                    onClick={() => setExportFormat("GIF")}
                    className="ase-btn p-2.5 text-left"
                  >
                    <p className="text-xs font-black">GIF (.gif)</p>
                    <p className="mt-0.5 text-[10px] opacity-85">
                      {frames.length} frame · {frameDelayMs}ms
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-pressed={exportFormat === "PNG"}
                    onClick={() => setExportFormat("PNG")}
                    className="ase-btn p-2.5 text-left"
                  >
                    <p className="text-xs font-black">PNG (.png)</p>
                    <p className="mt-0.5 text-[10px] opacity-85">
                      Frame hiện tại, nền trong suốt
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-pressed={exportFormat === "JPEG"}
                    onClick={() => setExportFormat("JPEG")}
                    className="ase-btn p-2.5 text-left"
                  >
                    <p className="text-xs font-black">JPEG (.jpg)</p>
                    <p className="mt-0.5 text-[10px] opacity-85">
                      Nền tối LED cố định
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#1f2a24]">Độ phóng đại xuất file</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { scale: 1, label: `1× Gốc (${doc.width}×${doc.height})` },
                    {
                      scale: 16,
                      label: `16× Sắc nét (${doc.width * 16}×${doc.height * 16})`,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.scale}
                      type="button"
                      aria-pressed={exportScale === opt.scale}
                      onClick={() => setExportScale(opt.scale)}
                      className="ase-btn py-2 text-xs font-bold"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-[#8a948e] bg-[#e9ecea] px-4 py-2.5">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="ase-btn px-4 py-1.5 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDownloadExport}
                className="ase-btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold"
              >
                <Download size={14} />
                Tải file về máy
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function paintPixelDocumentToCanvas(
  canvas: HTMLCanvasElement | null,
  targetDoc: PixelDocumentState,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const merged = compositeDocument(targetDoc);
  ctx.clearRect(0, 0, targetDoc.width, targetDoc.height);
  for (let y = 0; y < targetDoc.height; y++) {
    for (let x = 0; x < targetDoc.width; x++) {
      const hex = merged[y * targetDoc.width + x];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function FrameMiniCanvas({ frameDoc }: { frameDoc: PixelDocumentState }) {
  const miniRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    paintPixelDocumentToCanvas(miniRef.current, frameDoc);
  }, [frameDoc]);

  return (
    <canvas
      ref={miniRef}
      width={frameDoc.width}
      height={frameDoc.height}
      aria-hidden="true"
      className="block h-6 w-6 shrink-0 border border-[#1f2a24] bg-[#090d14]"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
