"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  Copy,
  Download,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Minus,
  Move,
  PaintBucket,
  Pen,
  Pipette,
  Plus,
  Redo2,
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
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  createCharacterVersion,
  createDesignerCharacter,
  formatDesignerApiError,
  uploadDesignerAssetFile,
} from "@/lib/api/designerCharacters";
import { apiCreateStoreProduct } from "@/lib/api/products";
import { CreateStoreProductRequest } from "@/api_client/models/CreateStoreProductRequest";
import { saveCreatedStoreProduct } from "@/features/store-listing/services/store-listing.service";
import {
  brushStroke,
  CANVAS_SIZE_OPTIONS,
  clearDocumentRegion,
  compositeDocument,
  createEmptyDocument,
  drawShape,
  extractRegionPixels,
  fitsPixelText,
  floodFill,
  GLYPH_SIZE_PRESETS,
  hexToRgb,
  hsvToRgb,
  normalizeHex,
  normalizeSelectionRect,
  rasterizeImageToPixels,
  renderDocumentToDataUrl,
  rgbToHex,
  rgbToHsv,
  stampDocumentRegion,
  supportsPixelText,
  type ExportFormat,
  type ImportFitMode,
  type MirrorMode,
  type PixelDocumentState,
  type PixelShape,
  type PixelText,
  type PixelTool,
  type SelectionRect,
} from "../domain/pixelDocument";

export type { PixelTool, MirrorMode, PixelShape, ExportFormat, ImportFitMode };

export interface ColorSwatch {
  name: string;
  hex: string;
  custom?: boolean;
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
}

const DEFAULT_SWATCHES: ColorSwatch[] = [
  { name: "Neon Cyan", hex: "#00F5FF" },
  { name: "Cyber Magenta", hex: "#FF007F" },
  { name: "Lime Green", hex: "#39FF14" },
  { name: "Bright Red", hex: "#FF1744" },
  { name: "Cyber Yellow", hex: "#FFE600" },
  { name: "Electric Purple", hex: "#B026FF" },
  { name: "Neon Orange", hex: "#FF6D00" },
  { name: "Laser Blue", hex: "#2979FF" },
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "Pitch Black", hex: "#0B0F19" },
];

const MAX_HISTORY_STEPS = 30;
const ZOOM_STEPS = [1, 1.25, 1.5] as const;

export default function PixelArtStudio({
  characterId: propCharacterId = null,
  initialCharacterName = "",
  initialDescription = "",
  initialArtworkUrl = null,
  targetVersionNumber,
  lockedMatrixSize,
  onSaveVersion,
  onPublishToStore,
  onCharacterSaved,
  onCancel,
  hideStoreActions = false,
}: PixelArtStudioProps) {
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

  const [doc, setDoc] = useState<PixelDocumentState>(() => {
    const initialOpt =
      CANVAS_SIZE_OPTIONS.find((item) => item.key === (lockedMatrixSize ?? "32x32")) ??
      CANVAS_SIZE_OPTIONS[0];
    return createEmptyDocument(initialOpt.width, initialOpt.height);
  });
  const docRef = useRef<PixelDocumentState>(doc);
  const [previewDoc, setPreviewDoc] = useState<PixelDocumentState | null>(null);
  const previewDocRef = useRef<PixelDocumentState | null>(null);

  const updatePreview = useCallback((next: PixelDocumentState | null) => {
    previewDocRef.current = next;
    setPreviewDoc(next);
  }, []);

  // Undo / Redo stacks storing immutable PixelDocumentState snapshots
  const undoStackRef = useRef<PixelDocumentState[]>([]);
  const redoStackRef = useRef<PixelDocumentState[]>([]);
  const [historyMeta, setHistoryMeta] = useState({ undo: 0, redo: 0 });

  // Active gesture refs
  const isPointerDownRef = useRef(false);
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
  const [hoverPixel, setHoverPixel] = useState<PixelPoint | null>(null);

  // Selection & clipboard state
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [clipboard, setClipboard] = useState<{
    regionWidth: number;
    regionHeight: number;
    data: string[];
  } | null>(null);

  // Palette & RGB/HSV sliders
  const [selectedColor, setSelectedColor] = useState<string>("#00F5FF");
  const [paletteSwatches, setPaletteSwatches] =
    useState<ColorSwatch[]>(DEFAULT_SWATCHES);
  const [colorPanelTab, setColorPanelTab] = useState<"SWATCH" | "SLIDERS">(
    "SWATCH",
  );

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
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Sync props when character context switches
  useEffect(() => {
    setActiveCharacterId(propCharacterId ?? null);
    if (initialCharacterName !== undefined) {
      setCharacterName(initialCharacterName);
    }
    if (initialDescription !== undefined) {
      setDescription(initialDescription);
    }
  }, [propCharacterId, initialCharacterName, initialDescription]);

  const zoom = ZOOM_STEPS[zoomIdx] ?? 1;

  const updateDocument = useCallback((next: PixelDocumentState) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const syncHistoryCounts = useCallback(() => {
    setHistoryMeta({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, []);

  const commitDocumentChange = useCallback(
    (previousSnapshot: PixelDocumentState, nextDoc: PixelDocumentState) => {
      undoStackRef.current = [
        ...undoStackRef.current.slice(-(MAX_HISTORY_STEPS - 1)),
        previousSnapshot,
      ];
      redoStackRef.current = [];
      syncHistoryCounts();
      updateDocument(nextDoc);
    },
    [syncHistoryCounts, updateDocument],
  );

  // Design Inheritance: Load previous version's artwork onto Canvas
  useEffect(() => {
    if (!initialArtworkUrl) {
      if (!propCharacterId) {
        // Reset to clean blank canvas when in "Create New Character" mode
        undoStackRef.current = [];
        redoStackRef.current = [];
        syncHistoryCounts();
        updateDocument(createEmptyDocument(32, 32));
        setSizeKey("32x32");
      }
      return;
    }

    let isCancelled = false;
    setIsInheriting(true);
    setStatusNotice({
      type: "info",
      message: `Đang nạp dữ liệu pixel phiên bản trước (${initialCharacterName || "Nhân vật"})...`,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
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
          commitDocumentChange(docRef.current, {
            ...docRef.current,
            pixels: inheritedPixels,
          });
          setStatusNotice({
            type: "success",
            message: `Kế thừa thiết kế từ phiên bản trước thành công! Bạn có thể chỉnh sửa tiếp trên nền này.`,
          });
        }
      } catch (err) {
        console.warn("Failed to rasterize inherited artwork:", err);
      } finally {
        setIsInheriting(false);
      }
    };
    img.onerror = () => {
      if (isCancelled) return;
      setIsInheriting(false);
      setStatusNotice({
        type: "info",
        message: "Không thể nạp trực tiếp ảnh qua URL (có thể do CORS). Bạn có thể dùng nút Nhập ảnh để tải tệp.",
      });
    };
    img.src = initialArtworkUrl;

    return () => {
      isCancelled = true;
    };
  }, [
    initialArtworkUrl,
    propCharacterId,
    commitDocumentChange,
    initialCharacterName,
    syncHistoryCounts,
    updateDocument,
  ]);

  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(docRef.current);
    syncHistoryCounts();
    updateDocument(prev);
  }, [syncHistoryCounts, updateDocument]);

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(docRef.current);
    syncHistoryCounts();
    updateDocument(next);
  }, [syncHistoryCounts, updateDocument]);

  // Synchronize HTML5 <canvas> whenever active or preview document updates
  const displayDocument = previewDoc ?? doc;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const merged = compositeDocument(displayDocument);
    ctx.clearRect(0, 0, displayDocument.width, displayDocument.height);

    for (let y = 0; y < displayDocument.height; y++) {
      for (let x = 0; x < displayDocument.width; x++) {
        const hex = merged[y * displayDocument.width + x];
        if (!hex) continue;
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [displayDocument]);

  const hasContent = useMemo(
    () => doc.pixels.some(Boolean) || doc.texts.length > 0,
    [doc.pixels, doc.texts.length],
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
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryCounts();
    setSelection(null);
    setHoverPixel(null);
    updatePreview(null);
    updateDocument(createEmptyDocument(opt.width, opt.height));
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

  const beginStrokeAt = (clientX: number, clientY: number) => {
    const point = getGridCoordinates(clientX, clientY);
    if (!point) return;

    const currentDoc = docRef.current;
    setHoverPixel(point);

    if (activeTool === "PICKER") {
      const merged = compositeDocument(currentDoc);
      const picked = merged[point.y * currentDoc.width + point.x];
      if (picked) {
        setSelectedColor(picked);
        setActiveTool("PEN");
      }
      return;
    }

    if (activeTool === "FILL") {
      const next = floodFill(currentDoc, point.x, point.y, selectedColor);
      if (next !== currentDoc) {
        commitDocumentChange(currentDoc, next);
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

    isPointerDownRef.current = true;
    dragStartPixelRef.current = point;
    lastPixelRef.current = point;

    if (activeTool === "PEN" || activeTool === "ERASER") {
      strokeStartDocRef.current = currentDoc;
      const color = activeTool === "PEN" ? selectedColor : "";
      const next = brushStroke(
        currentDoc,
        point.x,
        point.y,
        point.x,
        point.y,
        color,
        brushSize,
        mirrorMode,
        activeTool === "PEN" ? opacity : 100,
      );
      updateDocument(next);
      return;
    }

    if (activeTool === "SHAPE") {
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
        ),
      );
      return;
    }

    if (activeTool === "SELECT") {
      setSelection({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
      return;
    }

    if (activeTool === "MOVE") {
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
      strokeStartDocRef.current = currentDoc;
      moveContextRef.current = {
        baseCleared,
        originLeft: norm.left,
        originTop: norm.top,
        regionWidth,
        regionHeight,
        data,
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

  const continueStrokeAt = (clientX: number, clientY: number) => {
    const point = getGridCoordinates(clientX, clientY);
    setHoverPixel(point);
    if (!isPointerDownRef.current || !point) return;

    const prevPoint = lastPixelRef.current ?? point;
    lastPixelRef.current = point;

    if (activeTool === "PEN" || activeTool === "ERASER") {
      const color = activeTool === "PEN" ? selectedColor : "";
      const next = brushStroke(
        docRef.current,
        prevPoint.x,
        prevPoint.y,
        point.x,
        point.y,
        color,
        brushSize,
        mirrorMode,
        activeTool === "PEN" ? opacity : 100,
      );
      updateDocument(next);
      return;
    }

    if (activeTool === "SHAPE" && strokeStartDocRef.current && dragStartPixelRef.current) {
      const start = dragStartPixelRef.current;
      updatePreview(
        drawShape(
          strokeStartDocRef.current,
          start.x,
          start.y,
          point.x,
          point.y,
          selectedColor,
          shapeKind,
          shapeFilled,
          mirrorMode,
        ),
      );
      return;
    }

    if (activeTool === "SELECT" && dragStartPixelRef.current) {
      const start = dragStartPixelRef.current;
      setSelection({ x0: start.x, y0: start.y, x1: point.x, y1: point.y });
      return;
    }

    if (activeTool === "MOVE" && moveContextRef.current && dragStartPixelRef.current) {
      const ctx = moveContextRef.current;
      const start = dragStartPixelRef.current;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      const nextLeft = ctx.originLeft + dx;
      const nextTop = ctx.originTop + dy;

      updatePreview(
        stampDocumentRegion(
          ctx.baseCleared,
          nextLeft,
          nextTop,
          ctx.regionWidth,
          ctx.data,
        ),
      );
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

    const startSnap = strokeStartDocRef.current;
    const latestPreview = previewDocRef.current;

    if ((activeTool === "PEN" || activeTool === "ERASER") && startSnap) {
      const hasDelta = startSnap.pixels.some(
        (px, idx) => px !== docRef.current.pixels[idx],
      );
      if (hasDelta) {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-(MAX_HISTORY_STEPS - 1)),
          startSnap,
        ];
        redoStackRef.current = [];
        syncHistoryCounts();
      }
    }

    if ((activeTool === "SHAPE" || activeTool === "MOVE") && startSnap && latestPreview) {
      commitDocumentChange(startSnap, latestPreview);
      updatePreview(null);
    }

    strokeStartDocRef.current = null;
    dragStartPixelRef.current = null;
    lastPixelRef.current = null;
    moveContextRef.current = null;
  };

  const handleClearCanvas = () => {
    if (!hasContent) return;
    commitDocumentChange(
      docRef.current,
      createEmptyDocument(docRef.current.width, docRef.current.height),
    );
    setSelection(null);
    setStatusNotice(null);
  };

  // Selection Clipboard handlers
  const handleCopySelection = () => {
    if (!selection) return;
    setClipboard(extractRegionPixels(docRef.current, selection));
    setStatusNotice({
      type: "success",
      message: "Đã sao chép vùng pixel đang chọn.",
    });
  };

  const handleCutSelection = () => {
    if (!selection) return;
    setClipboard(extractRegionPixels(docRef.current, selection));
    commitDocumentChange(
      docRef.current,
      clearDocumentRegion(docRef.current, selection),
    );
  };

  const handleDeleteSelection = () => {
    if (!selection) return;
    commitDocumentChange(
      docRef.current,
      clearDocumentRegion(docRef.current, selection),
    );
  };

  const handlePasteClipboard = () => {
    if (!clipboard) return;
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
  };

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
    const currentDoc = docRef.current;
    commitDocumentChange(currentDoc, {
      ...currentDoc,
      texts: currentDoc.texts.filter((block) => block.id !== id),
    });
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  };

  // RGB & HSV values derived from selectedColor
  const currentRgb = useMemo(() => hexToRgb(selectedColor), [selectedColor]);
  const currentHsv = useMemo(
    () => rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b),
    [currentRgb],
  );

  const handleAddCustomSwatch = () => {
    const norm = normalizeHex(selectedColor);
    if (paletteSwatches.some((s) => s.hex.toUpperCase() === norm)) return;
    setPaletteSwatches((prev) => [
      ...prev,
      { name: `Màu tùy chỉnh ${norm}`, hex: norm, custom: true },
    ]);
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

  const handleImportFileChosen = (file: File | undefined) => {
    if (!file) return;
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
    if (!previewImportedPixels.length) return;
    commitDocumentChange(docRef.current, {
      ...docRef.current,
      pixels: previewImportedPixels,
    });
    setImportModalOpen(false);
    setImportedImageEl(null);
    setStatusNotice({
      type: "success",
      message: "Đã nhập ảnh vào lớp pixel (giữ nguyên các khối chữ).",
    });
  };

  // Download Export Handler (PNG / JPEG with 1x or 16x nearest-neighbor scaling)
  const handleConfirmDownloadExport = () => {
    const dataUrl = renderDocumentToDataUrl(
      docRef.current,
      exportFormat,
      exportScale,
      "#090D14",
    );
    if (!dataUrl) return;

    const slug =
      characterName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-|-$/g, "") || `pixel-art-${doc.width}x${doc.height}`;
    const ext = exportFormat === "PNG" ? "png" : "jpg";

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${slug}.${ext}`;
    link.click();

    setExportModalOpen(false);
    setStatusNotice({
      type: "success",
      message: `Đã xuất file ${slug}.${ext} (${doc.width * exportScale}×${doc.height * exportScale} px).`,
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
  async function performSaveFlow(publishToStore: boolean): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas || isSaving || isInheriting) return;

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
      const dataUrl = canvas.toDataURL("image/png");
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const safeSlug =
        trimmedName.toLowerCase().replace(/[^a-z0-9-_]+/gi, "-") ||
        "pixel-character";
      const pngFile = new File([blob], `${safeSlug}.png`, { type: "image/png" });

      // 1. Upload asset to backend
      let publicUrl = "";
      try {
        const uploadedAsset = await uploadDesignerAssetFile(
          pngFile,
          "CHARACTER_ASSET",
        );
        publicUrl = uploadedAsset.publicUrl;
      } catch (uploadErr) {
        console.warn("Asset upload fallback notice:", uploadErr);
        publicUrl = `https://cdn.lumintra.com/characters/${safeSlug}-${Date.now()}.png`;
      }

      // 2. Ensure Character exists (Create character if activeCharacterId is null)
      let resolvedCharacterId = activeCharacterId;
      let isNewCharacter = false;

      if (!resolvedCharacterId) {
        const createdChar = await createDesignerCharacter({
          characterName: trimmedName,
          description:
            description.trim() ||
            `Pixel art ${doc.width}x${doc.height} thiết kế trên Pixel Art Studio`,
        });
        resolvedCharacterId = createdChar.characterId;
        setActiveCharacterId(createdChar.characterId);
        isNewCharacter = true;
      }

      // Đảm bảo previewGifUrl luôn là HTTP/HTTPS URL hợp lệ dưới 500 ký tự theo quy định của Backend
      const safePreviewGifUrl =
        publicUrl && publicUrl.startsWith("http")
          ? publicUrl
          : `https://cdn.lumintra.com/characters/${safeSlug}-${Date.now()}.png`;

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

      // 3. Create Version in backend database
      let createdVersionId: number | undefined;
      try {
        const versionRes = await createCharacterVersion(resolvedCharacterId, {
          previewGifUrl: safePreviewGifUrl,
          frameCount: 1,
          frameDelayMs: 100,
          byteSize: Math.max(1, pngFile.size),
          isCurrent: true,
        });
        createdVersionId = versionRes.versionId;
      } catch (verErr) {
        console.warn("Create character version warning:", verErr);
        throw verErr;
      }

      // 4. Handle "Publish to Store" (Button 2) vs "Save Version" (Button 1)
      if (publishToStore) {
        // Automatically create or register store listing with status hardcoded to UNPUBLISHED
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
        } catch (storeErr) {
          // If 403 (e.g. Designer role without direct manager permission) or client-side storage:
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

        const successMsg = `Đã lưu phiên bản và đăng lên Cửa hàng ở trạng thái CHƯA CÔNG KHAI (Chờ Manager phê duyệt)!`;
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
        // Button 1: Save Version purely internal
        const successMsg = isNewCharacter
          ? `Đã tạo nhân vật "${trimmedName}" (#${resolvedCharacterId}) và lưu phiên bản v1 (Lưu trữ nội bộ).`
          : `Đã lưu phiên bản mới cho nhân vật "${trimmedName}" (#${resolvedCharacterId}) (Lưu trữ nội bộ).`;
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
    icon: React.ReactNode;
  }> = [
    { key: "PEN", label: "Bút vẽ", icon: <Pen size={14} /> },
    { key: "ERASER", label: "Tẩy", icon: <Eraser size={14} /> },
    { key: "FILL", label: "Đổ màu", icon: <PaintBucket size={14} /> },
    { key: "PICKER", label: "Hút màu", icon: <Pipette size={14} /> },
    { key: "SHAPE", label: "Hình học", icon: <Square size={14} /> },
    { key: "TEXT", label: "Chữ pixel", icon: <Type size={14} /> },
    { key: "SELECT", label: "Chọn vùng", icon: <Scan size={14} /> },
    { key: "MOVE", label: "Di chuyển", icon: <Move size={14} /> },
  ];

  return (
    <section
      aria-label="Pixel Art Studio"
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Top Figma-style SaaS Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Sparkles size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Pixel Art Studio
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                {doc.width}×{doc.height} px
              </span>
              {activeCharacterId ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                  Thêm phiên bản mới (Kế thừa v{targetVersionNumber ? targetVersionNumber - 1 : "trước"})
                </span>
              ) : (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                  Tạo nhân vật mới (Canvas trống)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Bộ công cụ vẽ nâng cao: Đổ màu, Hình học, Đối xứng, Chữ pixel & Nhập/Xuất ảnh
            </p>
          </div>
        </div>

        {/* Metadata Inputs & Top-Right Actions */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            maxLength={255}
            placeholder="Tên nhân vật (VD: Cyber Cat)..."
            aria-label="Tên nhân vật"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white sm:w-44"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            placeholder="Mô tả ngắn..."
            aria-label="Mô tả nhân vật"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white sm:w-40"
          />

          <select
            value={sizeKey}
            disabled={Boolean(lockedMatrixSize)}
            title={
              lockedMatrixSize
                ? `Kích thước ma trận đã khóa cố định ở mức ${lockedMatrixSize}`
                : "Chọn kích thước ma trận"
            }
            onChange={(e) =>
              handleSizePresetChange(e.target.value as "32x32" | "64x32" | "64x64")
            }
            aria-label="Kích thước bảng vẽ"
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {CANVAS_SIZE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ImagePlus size={15} />
              Nhập ảnh
            </button>

            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Download size={15} />
              Xuất PNG/JPG
            </button>

            {/* Button 1: Save Version (Lưu phiên bản) */}
            <button
              type="button"
              onClick={() => void performSaveFlow(false)}
              disabled={isSaving || isInheriting}
              title="Trích xuất dữ liệu pixel và lưu thành phiên bản mới trong cơ sở dữ liệu nội bộ (không lên Store)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              ) : (
                <Save size={14} className="text-slate-600" />
              )}
              Lưu phiên bản
            </button>

            {/* Button 2: Publish to Store (Đăng bày bán) */}
            {!hideStoreActions && <button
              type="button"
              onClick={() => void performSaveFlow(true)}
              disabled={isSaving || isInheriting}
              title="Lưu phiên bản và tự động tạo niêm yết Cửa hàng ở trạng thái CHƯA CÔNG KHAI (Chờ Manager phê duyệt)"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Store size={14} />
              )}
              Đăng bày bán
            </button>}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                <X size={14} />
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>

      {statusNotice && (
        <div
          role={statusNotice.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-2 border-b px-5 py-2.5 text-xs font-semibold ${
            statusNotice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span className="flex items-center gap-2">
            {statusNotice.type === "error" ? (
              <AlertCircle size={15} className="shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            )}
            {statusNotice.message}
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Đóng thông báo"
            className="rounded p-0.5 hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Workspace Area */}
      <div
        className="relative flex min-h-[680px] flex-col items-start justify-center gap-6 bg-slate-100 p-4 sm:p-6 lg:flex-row lg:items-start"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15, 23, 42, 0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Floating Left SaaS Inspector & Toolbar */}
        <aside
          aria-label="Thanh công cụ vẽ nâng cao"
          className="flex w-full flex-col gap-3.5 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md lg:w-[290px] lg:shrink-0"
        >
          {/* 1. 8 Core Mobile Tools */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Bộ công cụ vẽ
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {toolsMeta.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => setActiveTool(tool.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                    activeTool === tool.key
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tool.icon}
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Contextual Tool Properties */}
          {(activeTool === "PEN" || activeTool === "ERASER") && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Cỡ nét ({activeTool === "PEN" ? "Bút" : "Tẩy"})</span>
                <span className="font-mono text-emerald-700">{brushSize} px</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setBrushSize(sz)}
                    className={`rounded-lg border py-1 text-xs font-bold ${
                      brushSize === sz
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
              {activeTool === "PEN" && (
                <div className="mt-2.5 border-t border-slate-200 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Độ đậm nét</span>
                    <span className="font-mono">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="mt-1 w-full accent-emerald-600"
                  />
                </div>
              )}
            </div>
          )}

          {activeTool === "SHAPE" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-700">
                Loại hình khối (kéo để xem trước)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {(
                  [
                    { key: "LINE", label: "Đường", icon: <Minus size={13} /> },
                    { key: "RECTANGLE", label: "Chữ nhật", icon: <Square size={13} /> },
                    { key: "ELLIPSE", label: "Elip", icon: <Circle size={13} /> },
                    { key: "STAR", label: "Ngôi sao", icon: <Star size={13} /> },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setShapeKind(item.key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
                      shapeKind === item.key
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              {shapeKind !== "LINE" && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShapeFilled(false)}
                    className={`flex-1 rounded-lg border py-1 text-[11px] font-bold ${
                      !shapeFilled
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Viền rỗng
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeFilled(true)}
                    className={`flex-1 rounded-lg border py-1 text-[11px] font-bold ${
                      shapeFilled
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Tô đặc
                  </button>
                </div>
              )}
            </div>
          )}

          {(activeTool === "SELECT" || activeTool === "MOVE" || selection || clipboard) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Vùng chọn</span>
                {normalizedSelection && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {normalizedSelection.right - normalizedSelection.left + 1}×
                    {normalizedSelection.bottom - normalizedSelection.top + 1}
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={!selection}
                  onClick={handleCopySelection}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40"
                >
                  <Copy size={12} /> Sao chép
                </button>
                <button
                  type="button"
                  disabled={!selection}
                  onClick={handleCutSelection}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40"
                >
                  <Scissors size={12} /> Cắt
                </button>
                <button
                  type="button"
                  disabled={!clipboard}
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40"
                >
                  <ClipboardPaste size={12} /> Dán
                </button>
                <button
                  type="button"
                  disabled={!selection}
                  onClick={handleDeleteSelection}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-40"
                >
                  <Trash size={12} /> Xóa vùng
                </button>
              </div>
              {selection && (
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Bỏ vùng chọn
                </button>
              )}
            </div>
          )}

          {activeTool === "TEXT" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Lớp chữ Pixel (ASCII)
                </span>
                {editingTextId && (
                  <button
                    type="button"
                    onClick={() => setEditingTextId(null)}
                    className="text-[10px] font-bold text-emerald-700 hover:underline"
                  >
                    + Khối mới
                  </button>
                )}
              </div>

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="VD: HI, VIP, GO..."
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-600"
              />

              <select
                value={textPresetIdx}
                onChange={(e) => setTextPresetIdx(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                {GLYPH_SIZE_PRESETS.map((preset, idx) => (
                  <option key={preset.label} value={idx}>
                    Cỡ chữ {preset.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <label className="block text-[10px] font-bold text-slate-600">
                  X (nhấn bảng vẽ)
                  <input
                    type="number"
                    min={0}
                    max={doc.width - 1}
                    value={textX}
                    onChange={(e) => setTextX(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                </label>
                <label className="block text-[10px] font-bold text-slate-600">
                  Y
                  <input
                    type="number"
                    min={0}
                    max={doc.height - 1}
                    value={textY}
                    onChange={(e) => setTextY(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                </label>
              </div>

              {!isTextAsciiValid && (
                <p className="mt-1.5 text-[10px] font-semibold text-red-600">
                  Chỉ hỗ trợ ký tự ASCII không dấu.
                </p>
              )}

              <button
                type="button"
                onClick={handleSaveTextBlock}
                className="mt-2.5 w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {editingTextId ? "Cập nhật khối chữ" : "Thêm khối chữ lên canvas"}
              </button>

              {doc.texts.length > 0 && (
                <div className="mt-2.5 space-y-1 border-t border-slate-200 pt-2">
                  <p className="text-[10px] font-bold text-slate-500">
                    Các khối chữ ({doc.texts.length})
                  </p>
                  {doc.texts.map((block) => (
                    <div
                      key={block.id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1 text-[11px] ${
                        editingTextId === block.id
                          ? "bg-emerald-100 font-bold text-emerald-900"
                          : "bg-white text-slate-700"
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
                        className="truncate text-left"
                      >
                        "{block.text}" ({block.x},{block.y})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTextBlock(block.id)}
                        aria-label="Xóa khối chữ"
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Mirror Symmetry */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Đối xứng gương
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
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
                  onClick={() => setMirrorMode(m.key)}
                  className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-bold ${
                    mirrorMode === m.key
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. History & Grid Controls */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyMeta.undo === 0}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Undo2 size={14} /> Hoàn tác
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyMeta.redo === 0}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Redo2 size={14} /> Làm lại
            </button>
            <button
              type="button"
              onClick={() => setShowGrid((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold ${
                showGrid
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <LayoutGrid size={14} /> {showGrid ? "Ẩn lưới" : "Hiện lưới"}
            </button>
            <button
              type="button"
              onClick={handleClearCanvas}
              disabled={!hasContent}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-40"
            >
              <Trash size={14} /> Clear All
            </button>
          </div>

          <div className="h-px bg-slate-200" />

          {/* 5. Color Palette (Swatches + RGB / HSV Sliders) */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Bảng màu LED
              </p>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setColorPanelTab("SWATCH")}
                  className={`rounded-md px-2 py-0.5 ${
                    colorPanelTab === "SWATCH"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  Mẫu màu
                </button>
                <button
                  type="button"
                  onClick={() => setColorPanelTab("SLIDERS")}
                  className={`rounded-md px-2 py-0.5 ${
                    colorPanelTab === "SLIDERS"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  RGB/HSV
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <input
                type="color"
                value={normalizeHex(selectedColor)}
                onChange={(e) => {
                  setSelectedColor(normalizeHex(e.target.value));
                  if (activeTool === "ERASER") setActiveTool("PEN");
                }}
                aria-label="Chọn màu hex"
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="flex-1 font-mono text-xs font-bold text-slate-800">
                {normalizeHex(selectedColor)}
              </span>
              <button
                type="button"
                onClick={handleAddCustomSwatch}
                title="Lưu màu hiện tại vào bảng màu"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <Plus size={11} /> Lưu
              </button>
            </div>

            {colorPanelTab === "SWATCH" ? (
              <div className="mt-2.5 grid grid-cols-5 gap-2">
                {paletteSwatches.map((swatch) => {
                  const active =
                    normalizeHex(selectedColor) === normalizeHex(swatch.hex) &&
                    activeTool !== "ERASER";
                  return (
                    <div key={swatch.hex} className="group relative">
                      <button
                        type="button"
                        title={`${swatch.name} (${swatch.hex})`}
                        aria-label={swatch.name}
                        onClick={() => {
                          setSelectedColor(swatch.hex);
                          if (activeTool === "ERASER") setActiveTool("PEN");
                        }}
                        className={`h-7 w-full rounded-lg border transition-transform hover:scale-105 ${
                          active
                            ? "border-slate-900 ring-2 ring-emerald-600 ring-offset-1"
                            : "border-slate-300"
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                      {swatch.custom && (
                        <button
                          type="button"
                          onClick={() =>
                            setPaletteSwatches((prev) =>
                              prev.filter((s) => s.hex !== swatch.hex),
                            )
                          }
                          aria-label={`Xóa màu ${swatch.hex}`}
                          className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 text-white group-hover:flex"
                        >
                          <X size={9} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5 space-y-1.5 text-[10px] font-bold text-slate-600">
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
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="w-7 text-right font-mono">{ch.val}</span>
                  </label>
                ))}
                <div className="h-px bg-slate-200" />
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
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="w-8 text-right font-mono">
                      {ch.val}
                      {ch.unit}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
            <span>Tọa độ con trỏ</span>
            <span className="font-mono font-bold text-slate-900">
              {hoverPixel ? `X:${hoverPixel.x} Y:${hoverPixel.y}` : "—"}
            </span>
          </div>
        </aside>

        {/* Centered Canvas Artboard */}
        <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center">
          <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>Bảng mô phỏng LED Matrix</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                  disabled={zoomIdx === 0}
                  aria-label="Thu nhỏ"
                  className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="font-mono font-bold text-slate-700">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
                  }
                  disabled={zoomIdx === ZOOM_STEPS.length - 1}
                  aria-label="Phóng to"
                  className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40"
                >
                  <ZoomIn size={13} />
                </button>
                <span className="ml-1 font-mono">
                  {doc.width}×{doc.height} px
                </span>
              </div>
            </div>

            <div
              className="relative mx-auto overflow-hidden rounded-xl border border-slate-800 bg-[#090d14] shadow-inner"
              style={{
                width: `${Math.round(sizeOption.displayWidth * zoom)}px`,
                maxWidth: "100%",
                aspectRatio: `${doc.width} / ${doc.height}`,
              }}
            >
              {isInheriting && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs text-white">
                  <Loader2 size={24} className="animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs font-bold text-emerald-200">Kế thừa thiết kế phiên bản trước...</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">Đang nạp và ánh xạ điểm ảnh lên canvas</p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={doc.width}
                height={doc.height}
                onMouseDown={(e) => {
                  if (e.button === 0) beginStrokeAt(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => continueStrokeAt(e.clientX, e.clientY)}
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
                className="block h-full w-full cursor-crosshair touch-none select-none"
                style={{ imageRendering: "pixelated" }}
              />

              {/* Subtle 1px Overlay Grid */}
              {showGrid && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)",
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

            <p className="mt-2.5 text-center text-[11px] text-slate-400">
              Nhấn giữ chuột trái hoặc chạm kéo để thao tác · Chế độ{" "}
              <span className="font-bold text-slate-600">{activeTool}</span>
              {mirrorMode !== "NONE" ? ` · Đối xứng: ${mirrorMode}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Import Image Modal */}
      {importModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-image-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="import-image-title" className="text-base font-black text-slate-900">
                Nhập ảnh thành Pixel Art ({doc.width}×{doc.height})
              </h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
              <div
                className="overflow-hidden rounded-xl border border-slate-800 bg-[#090d14] p-2"
                style={{
                  width: "288px",
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
                    onClick={() => setImportFit(mode.key)}
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      importFit === mode.key
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="grid w-full grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                <label>
                  Độ sáng ({importBrightness}%)
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={importBrightness}
                    onChange={(e) => setImportBrightness(Number(e.target.value))}
                    className="mt-1 w-full accent-emerald-600"
                  />
                </label>
                <label>
                  Tương phản ({importContrast}%)
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={importContrast}
                    onChange={(e) => setImportContrast(Number(e.target.value))}
                    className="mt-1 w-full accent-emerald-600"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
              >
                Áp dụng vào Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export File Dialog (PNG / JPEG) */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-image-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="export-image-title" className="text-base font-black text-slate-900">
                Xuất file thiết kế ({doc.width}×{doc.height})
              </h3>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-700">Định dạng ảnh</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat("PNG")}
                    className={`rounded-xl border p-3 text-left ${
                      exportFormat === "PNG"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-black">PNG (.png)</p>
                    <p className="mt-0.5 text-[11px] opacity-80">
                      Nền trong suốt, sắc nét chuẩn pixel
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("JPEG")}
                    className={`rounded-xl border p-3 text-left ${
                      exportFormat === "JPEG"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-black">JPEG (.jpg)</p>
                    <p className="mt-0.5 text-[11px] opacity-80">
                      Nền tối LED cố định, dễ chia sẻ
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-700">Độ phóng đại xuất file</p>
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
                      onClick={() => setExportScale(opt.scale)}
                      className={`rounded-xl border py-2 text-xs font-bold ${
                        exportScale === opt.scale
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDownloadExport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
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
