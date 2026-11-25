export type PixelTool =
  | "PEN"
  | "ERASER"
  | "PICKER"
  | "FILL"
  | "SHAPE"
  | "TEXT"
  | "SELECT"
  | "MOVE";

export type MirrorMode = "NONE" | "HORIZONTAL" | "VERTICAL" | "BOTH";
export type PixelShape = "LINE" | "RECTANGLE" | "ELLIPSE" | "STAR";
export type ExportFormat = "PNG" | "JPEG" | "GIF";
export type ImportFitMode = "CONTAIN" | "COVER" | "STRETCH";

export interface GlyphSizePreset {
  label: string;
  width: number;
  height: number;
}

export const GLYPH_SIZE_PRESETS: GlyphSizePreset[] = [
  { label: "3×5 (Nhỏ)", width: 3, height: 5 },
  { label: "5×7 (Vừa)", width: 5, height: 7 },
  { label: "7×9 (Lớn)", width: 7, height: 9 },
];

export const CANVAS_SIZE_OPTIONS: Array<{
  key: "32x32" | "64x32" | "64x64";
  label: string;
  width: number;
  height: number;
  displayWidth: number;
}> = [
  { key: "32x32", label: "32 × 32 (LED Vuông)", width: 32, height: 32, displayWidth: 544 },
  { key: "64x32", label: "64 × 32 (LED Kính Xe)", width: 64, height: 32, displayWidth: 640 },
  { key: "64x64", label: "64 × 64 (LED Lớn)", width: 64, height: 64, displayWidth: 576 },
];

export interface PixelText {
  id: string;
  text: string;
  x: number;
  y: number;
  glyphWidth: number;
  glyphHeight: number;
  color: string;
}

export interface SelectionRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PixelDocumentState {
  width: number;
  height: number;
  /** Empty string "" = transparent / off LED pixel, otherwise "#RRGGBB". */
  pixels: string[];
  texts: PixelText[];
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export function createEmptyDocument(
  width: number,
  height: number,
): PixelDocumentState {
  return {
    width,
    height,
    pixels: Array<string>(width * height).fill(""),
    texts: [],
  };
}

export function normalizeHex(hex: string): string {
  const cleaned = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#00F5FF";
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex);
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const maxVal = Math.max(rn, gn, bn);
  const minVal = Math.min(rn, gn, bn);
  const delta = maxVal - minVal;

  let h = 0;
  if (delta !== 0) {
    if (maxVal === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (maxVal === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = maxVal === 0 ? 0 : (delta / maxVal) * 100;
  const v = maxVal * 100;

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hh = ((h % 360) + 360) % 360;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const vn = Math.min(100, Math.max(0, v)) / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vn - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/**
 * Blends foreground color at `opacityPercent` (1..100) over `bgHex` (or dark LED base if empty).
 */
export function blendColorWithOpacity(
  fgHex: string,
  opacityPercent: number,
  bgHex: string,
): string {
  if (!fgHex) return "";
  if (opacityPercent >= 100) return normalizeHex(fgHex);
  const alpha = Math.min(1, Math.max(0.05, opacityPercent / 100));
  const fg = hexToRgb(fgHex);
  const bg = bgHex ? hexToRgb(bgHex) : { r: 0, g: 0, b: 0 };
  return rgbToHex(
    fg.r * alpha + bg.r * (1 - alpha),
    fg.g * alpha + bg.g * (1 - alpha),
    fg.b * alpha + bg.b * (1 - alpha),
  );
}

function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<[number, number]> {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  const points: Array<[number, number]> = [];

  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = error * 2;
    if (e2 >= dy) {
      error += dy;
      x += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y += sy;
    }
  }
  return points;
}

export function brushStroke(
  doc: PixelDocumentState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  size: number,
  mirror: MirrorMode,
  opacity = 100,
): PixelDocumentState {
  const safeSize = Math.min(8, Math.max(1, size));
  const out = [...doc.pixels];
  const halfSize = Math.floor((safeSize - 1) / 2);
  const touched = new Set<number>();

  const put = (x: number, y: number) => {
    if (x < 0 || x >= doc.width || y < 0 || y >= doc.height) return;
    const idx = y * doc.width + x;
    if (touched.has(idx)) return;
    touched.add(idx);
    out[idx] = color ? blendColorWithOpacity(color, opacity, doc.pixels[idx]) : "";
  };

  const mirrorH = mirror === "HORIZONTAL" || mirror === "BOTH";
  const mirrorV = mirror === "VERTICAL" || mirror === "BOTH";

  for (const [lx, ly] of bresenhamLine(x0, y0, x1, y1)) {
    for (let dy = 0; dy < safeSize; dy++) {
      for (let dx = 0; dx < safeSize; dx++) {
        const px = lx + dx - halfSize;
        const py = ly + dy - halfSize;
        put(px, py);
        if (mirrorH) put(doc.width - 1 - px, py);
        if (mirrorV) put(px, doc.height - 1 - py);
        if (mirror === "BOTH") put(doc.width - 1 - px, doc.height - 1 - py);
      }
    }
  }

  return { ...doc, pixels: out };
}

export function floodFill(
  doc: PixelDocumentState,
  x: number,
  y: number,
  color: string,
): PixelDocumentState {
  if (x < 0 || x >= doc.width || y < 0 || y >= doc.height) return doc;
  const normalizedColor = color ? normalizeHex(color) : "";
  const target = doc.pixels[y * doc.width + x];
  if (target === normalizedColor) return doc;

  const out = [...doc.pixels];
  const queue: number[] = [];

  const visit = (px: number, py: number) => {
    if (px < 0 || px >= doc.width || py < 0 || py >= doc.height) return;
    const idx = py * doc.width + px;
    if (out[idx] === target) {
      out[idx] = normalizedColor;
      queue.push(idx);
    }
  };

  visit(x, y);
  while (queue.length > 0) {
    const idx = queue.shift()!;
    const px = idx % doc.width;
    const py = Math.floor(idx / doc.width);
    visit(px - 1, py);
    visit(px + 1, py);
    visit(px, py - 1);
    visit(px, py + 1);
  }

  return { ...doc, pixels: out };
}

function insidePolygon(
  px: number,
  py: number,
  poly: Array<[number, number]>,
): boolean {
  let inside = false;
  let j = poly.length - 1;
  for (let i = 0; i < poly.length; i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

export function drawShape(
  doc: PixelDocumentState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  kind: PixelShape,
  filled: boolean,
  mirror: MirrorMode,
): PixelDocumentState {
  if (kind === "LINE") {
    return brushStroke(doc, x0, y0, x1, y1, color, 1, mirror);
  }

  const normalizedColor = color ? normalizeHex(color) : "";
  const out = [...doc.pixels];
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);

  const setPixel = (x: number, y: number) => {
    if (x >= 0 && x < doc.width && y >= 0 && y < doc.height) {
      out[y * doc.width + x] = normalizedColor;
    }
  };

  const mirrorH = mirror === "HORIZONTAL" || mirror === "BOTH";
  const mirrorV = mirror === "VERTICAL" || mirror === "BOTH";

  const put = (x: number, y: number) => {
    setPixel(x, y);
    if (mirrorH) setPixel(doc.width - 1 - x, y);
    if (mirrorV) setPixel(x, doc.height - 1 - y);
    if (mirror === "BOTH") setPixel(doc.width - 1 - x, doc.height - 1 - y);
  };

  if (kind === "RECTANGLE") {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (filled || x === left || x === right || y === top || y === bottom) {
          put(x, y);
        }
      }
    }
  } else if (kind === "ELLIPSE") {
    const rx = (right - left) / 2;
    const ry = (bottom - top) / 2;
    if (rx === 0 || ry === 0) {
      return brushStroke(doc, x0, y0, x1, y1, color, 1, mirror);
    }
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;

    if (filled) {
      const rxOffset = rx + 0.3;
      const ryOffset = ry + 0.3;
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (
            Math.pow((x - cx) / rxOffset, 2) + Math.pow((y - cy) / ryOffset, 2) <=
            1
          ) {
            put(x, y);
          }
        }
      }
    } else {
      const steps = Math.max(24, Math.floor(Math.max(rx, ry) * 16));
      for (let i = 0; i <= steps; i++) {
        const a = (i * 2 * Math.PI) / steps;
        put(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)));
      }
    }
  } else if (kind === "STAR") {
    if (right === left || bottom === top) {
      return brushStroke(doc, x0, y0, x1, y1, color, 1, mirror);
    }
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const outerR = Math.max(1, Math.min(right - left, bottom - top) / 2);
    const innerR = outerR * 0.42;

    const vertices: Array<[number, number]> = Array.from(
      { length: 10 },
      (_, i) => {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
      },
    );

    if (filled) {
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (insidePolygon(x + 0.5, y + 0.5, vertices)) {
            put(x, y);
          }
        }
      }
    } else {
      for (let i = 0; i < vertices.length; i++) {
        const [ax, ay] = vertices[i];
        const [bx, by] = vertices[(i + 1) % vertices.length];
        for (const [px, py] of bresenhamLine(
          Math.round(ax),
          Math.round(ay),
          Math.round(bx),
          Math.round(by),
        )) {
          put(px, py);
        }
      }
    }
  }

  return { ...doc, pixels: out };
}

export const PIXEL_FONT_ALPHABET: Record<string, string> = {
  A: "010/101/111/101/101",
  B: "110/101/110/101/110",
  C: "011/100/100/100/011",
  D: "110/101/101/101/110",
  E: "111/100/110/100/111",
  F: "111/100/110/100/100",
  G: "011/100/101/101/011",
  H: "101/101/111/101/101",
  I: "111/010/010/010/111",
  J: "001/001/001/101/010",
  K: "101/101/110/101/101",
  L: "100/100/100/100/111",
  M: "101/111/111/101/101",
  N: "101/111/111/111/101",
  O: "010/101/101/101/010",
  P: "110/101/110/100/100",
  Q: "010/101/101/111/011",
  R: "110/101/110/101/101",
  S: "011/100/010/001/110",
  T: "111/010/010/010/010",
  U: "101/101/101/101/111",
  V: "101/101/101/101/010",
  W: "101/101/111/111/101",
  X: "101/101/010/101/101",
  Y: "101/101/010/010/010",
  Z: "111/001/010/100/111",
  "0": "111/101/101/101/111",
  "1": "010/110/010/010/111",
  "2": "110/001/010/100/111",
  "3": "110/001/010/001/110",
  "4": "101/101/111/001/001",
  "5": "111/100/110/001/110",
  "6": "011/100/111/101/111",
  "7": "111/001/010/010/010",
  "8": "111/101/111/101/111",
  "9": "111/101/111/001/110",
  " ": "000/000/000/000/000",
  ".": "000/000/000/000/010",
  ",": "000/000/000/010/100",
  "!": "010/010/010/000/010",
  "?": "110/001/010/000/010",
  "-": "000/000/111/000/000",
  _: "000/000/000/000/111",
  ":": "000/010/000/010/000",
  ";": "000/010/000/010/100",
  "+": "000/010/111/010/000",
  "=": "000/111/000/111/000",
  "/": "001/001/010/100/100",
  "\\": "100/100/010/001/001",
  "(": "001/010/010/010/001",
  ")": "100/010/010/010/100",
  "[": "011/010/010/010/011",
  "]": "110/010/010/010/110",
  "'": "010/010/000/000/000",
  '"': "101/101/000/000/000",
  "#": "101/111/101/111/101",
  "*": "000/101/010/101/000",
  "%": "101/001/010/100/101",
  "&": "010/101/010/101/011",
  "@": "111/101/111/100/011",
  $: "011/110/010/011/110",
  "<": "001/010/100/010/001",
  ">": "100/010/001/010/100",
  "^": "010/101/000/000/000",
  "|": "010/010/010/010/010",
  "~": "000/011/110/000/000",
  "`": "100/010/000/000/000",
  "{": "011/010/110/010/011",
  "}": "110/010/011/010/110",
};

export function supportsPixelText(text: string): boolean {
  return Array.from(text).every((ch) => {
    const code = ch.charCodeAt(0);
    return code >= 32 && code <= 126 && ch.toUpperCase() in PIXEL_FONT_ALPHABET;
  });
}

export function getPixelTextWidth(block: Pick<PixelText, "text" | "glyphWidth">): number {
  if (!block.text.length) return 0;
  return block.text.length * (block.glyphWidth + 1) - 1;
}

export function fitsPixelText(
  block: Omit<PixelText, "id">,
  width: number,
  height: number,
): boolean {
  return (
    block.text.trim().length > 0 &&
    supportsPixelText(block.text) &&
    block.x >= 0 &&
    block.y >= 0 &&
    block.x + getPixelTextWidth(block) <= width &&
    block.y + block.glyphHeight <= height
  );
}

export function compositeDocument(doc: PixelDocumentState): string[] {
  const out = [...doc.pixels];
  for (const block of doc.texts) {
    const textColor = normalizeHex(block.color);
    Array.from(block.text).forEach((ch, index) => {
      const pattern =
        PIXEL_FONT_ALPHABET[ch.toUpperCase()] ?? PIXEL_FONT_ALPHABET["?"];
      const glyph = pattern.split("/");

      for (let y = 0; y < block.glyphHeight; y++) {
        for (let x = 0; x < block.glyphWidth; x++) {
          const gy = Math.floor((y * 5) / block.glyphHeight);
          const gx = Math.floor((x * 3) / block.glyphWidth);
          if (glyph[gy]?.[gx] === "1") {
            const px = block.x + index * (block.glyphWidth + 1) + x;
            const py = block.y + y;
            if (px >= 0 && px < doc.width && py >= 0 && py < doc.height) {
              out[py * doc.width + px] = textColor;
            }
          }
        }
      }
    });
  }
  return out;
}

export function normalizeSelectionRect(rect: SelectionRect) {
  return {
    left: Math.min(rect.x0, rect.x1),
    right: Math.max(rect.x0, rect.x1),
    top: Math.min(rect.y0, rect.y1),
    bottom: Math.max(rect.y0, rect.y1),
  };
}

export function extractRegionPixels(
  doc: PixelDocumentState,
  rect: SelectionRect,
): { regionWidth: number; regionHeight: number; data: string[] } {
  const { left: rawL, right: rawR, top: rawT, bottom: rawB } =
    normalizeSelectionRect(rect);
  const left = Math.min(doc.width - 1, Math.max(0, rawL));
  const right = Math.min(doc.width - 1, Math.max(0, rawR));
  const top = Math.min(doc.height - 1, Math.max(0, rawT));
  const bottom = Math.min(doc.height - 1, Math.max(0, rawB));

  const regionWidth = right - left + 1;
  const regionHeight = bottom - top + 1;
  const data: string[] = [];

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      data.push(doc.pixels[y * doc.width + x]);
    }
  }
  return { regionWidth, regionHeight, data };
}

export function clearDocumentRegion(
  doc: PixelDocumentState,
  rect: SelectionRect,
): PixelDocumentState {
  const { left, right, top, bottom } = normalizeSelectionRect(rect);
  const out = [...doc.pixels];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (x >= 0 && x < doc.width && y >= 0 && y < doc.height) {
        out[y * doc.width + x] = "";
      }
    }
  }
  return { ...doc, pixels: out };
}

export function stampDocumentRegion(
  doc: PixelDocumentState,
  originX: number,
  originY: number,
  regionWidth: number,
  data: string[],
  skipEmpty = true,
): PixelDocumentState {
  if (regionWidth <= 0) return doc;
  const out = [...doc.pixels];
  data.forEach((value, i) => {
    if (skipEmpty && !value) return;
    const x = originX + (i % regionWidth);
    const y = originY + Math.floor(i / regionWidth);
    if (x >= 0 && x < doc.width && y >= 0 && y < doc.height) {
      out[y * doc.width + x] = value;
    }
  });
  return { ...doc, pixels: out };
}

/**
 * Renders the composite PixelDocument into PNG (transparent background for empty pixels)
 * or JPEG (solid dark LED backdrop), with optional integer nearest-neighbor scaling.
 */
export function renderDocumentToDataUrl(
  doc: PixelDocumentState,
  format: ExportFormat = "PNG",
  scaleFactor = 1,
  jpegBackgroundHex = "#090D14",
): string {
  const safeScale = Math.max(1, Math.floor(scaleFactor));
  const composite = compositeDocument(doc);

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = doc.width;
  baseCanvas.height = doc.height;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) return "";

  if (format === "JPEG") {
    baseCtx.fillStyle = jpegBackgroundHex;
    baseCtx.fillRect(0, 0, doc.width, doc.height);
  }

  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const hex = composite[y * doc.width + x];
      if (!hex) continue;
      baseCtx.fillStyle = hex;
      baseCtx.fillRect(x, y, 1, 1);
    }
  }

  if (safeScale === 1) {
    return baseCanvas.toDataURL(
      format === "PNG" ? "image/png" : "image/jpeg",
      0.94,
    );
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = doc.width * safeScale;
  outCanvas.height = doc.height * safeScale;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return baseCanvas.toDataURL("image/png");

  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(baseCanvas, 0, 0, outCanvas.width, outCanvas.height);

  return outCanvas.toDataURL(
    format === "PNG" ? "image/png" : "image/jpeg",
    0.94,
  );
}

/**
 * Resamples an HTMLImageElement into an array of pixel hex values matching the
 * target LED canvas dimensions, supporting CONTAIN / COVER / STRETCH fit modes.
 */
export function rasterizeImageToPixels(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fit: ImportFitMode = "CONTAIN",
  brightness = 100,
  contrast = 100,
): string[] {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (sw <= 0 || sh <= 0) {
    return Array<string>(targetWidth * targetHeight).fill("");
  }

  const offscreen = document.createElement("canvas");
  offscreen.width = sw;
  offscreen.height = sh;
  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    return Array<string>(targetWidth * targetHeight).fill("");
  }
  ctx.drawImage(img, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  const scale =
    fit === "COVER"
      ? Math.max(targetWidth / sw, targetHeight / sh)
      : Math.min(targetWidth / sw, targetHeight / sh);
  const dw = fit === "STRETCH" ? targetWidth : sw * scale;
  const dh = fit === "STRETCH" ? targetHeight : sh * scale;
  const ox = (targetWidth - dw) / 2;
  const oy = (targetHeight - dh) / 2;

  const clampedBrightness = Math.min(220, Math.max(40, brightness)) / 100;
  const clampedContrast = Math.min(220, Math.max(40, contrast)) / 100;

  const pixels = Array<string>(targetWidth * targetHeight).fill("");

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.floor(((x + 0.5 - ox) * sw) / dw);
      const sy = Math.floor(((y + 0.5 - oy) * sh) / dh);
      if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;

      const idx = (sy * sw + sx) * 4;
      const alpha = data[idx + 3] / 255;
      if (alpha < 0.15) continue;

      const adjust = (raw: number) => {
        const premult = raw * alpha;
        const val = ((premult - 128) * clampedContrast + 128) * clampedBrightness;
        return Math.min(255, Math.max(0, Math.round(val)));
      };

      pixels[y * targetWidth + x] = rgbToHex(
        adjust(data[idx]),
        adjust(data[idx + 1]),
        adjust(data[idx + 2]),
      );
    }
  }

  return pixels;
}

