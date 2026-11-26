import { compositeDocument, normalizeHex, type PixelDocumentState } from "./domain/pixelDocument";

export interface ColorSwatch {
  name: string;
  hex: string;
  custom?: boolean;
}

export interface PalettePreset {
  id: string;
  label: string;
  swatches: ColorSwatch[];
  custom?: boolean;
}

const CUSTOM_PRESETS_STORAGE_KEY = "designer_custom_palette_presets";

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "led-neon",
    label: "LED Neon (Mặc định)",
    swatches: [
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
    ],
  },
  {
    id: "retro-pico",
    label: "Retro PICO-16",
    swatches: [
      { name: "Ink Black", hex: "#1D2B53" },
      { name: "Wine", hex: "#7E2553" },
      { name: "Forest", hex: "#008751" },
      { name: "Earth", hex: "#AB5236" },
      { name: "Slate", hex: "#5F574F" },
      { name: "Silver", hex: "#C2C3C7" },
      { name: "Cream", hex: "#FFF1E8" },
      { name: "Crimson", hex: "#FF004D" },
      { name: "Tangerine", hex: "#FFA300" },
      { name: "Sun", hex: "#FFEC27" },
      { name: "Mint", hex: "#00E436" },
      { name: "Sky", hex: "#29ADFF" },
      { name: "Lavender", hex: "#83769C" },
      { name: "Bubblegum", hex: "#FF77A8" },
      { name: "Peach", hex: "#FFCCAA" },
    ],
  },
  {
    id: "pastel-cute",
    label: "Pastel Dịu Mắt",
    swatches: [
      { name: "Rose", hex: "#FF9EB5" },
      { name: "Apricot", hex: "#FFC38B" },
      { name: "Butter", hex: "#FFF08A" },
      { name: "Matcha", hex: "#B6E2A1" },
      { name: "Aqua", hex: "#8BE8E5" },
      { name: "Periwinkle", hex: "#9CB4FF" },
      { name: "Lilac", hex: "#D4A5FF" },
      { name: "Cocoa", hex: "#6E5046" },
      { name: "Snow", hex: "#FFFDF9" },
      { name: "Charcoal", hex: "#262B35" },
    ],
  },
];

export const DEFAULT_SWATCHES: ColorSwatch[] = PALETTE_PRESETS[0].swatches;

function getPaletteStorageKey(characterId?: number | null): string {
  return characterId && characterId > 0
    ? `character_palette_${characterId}`
    : "character_palette_new";
}

export function loadCharacterPalette(characterId?: number | null): ColorSwatch[] {
  if (typeof window === "undefined") return [...DEFAULT_SWATCHES];
  try {
    const raw = window.localStorage.getItem(getPaletteStorageKey(characterId));
    if (!raw) return [...DEFAULT_SWATCHES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SWATCHES];
    const cleaned: ColorSwatch[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item.hex !== "string") continue;
      const hex = normalizeHex(item.hex);
      if (seen.has(hex)) continue;
      seen.add(hex);
      cleaned.push({
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : hex,
        hex,
      });
    }
    return cleaned;
  } catch {
    return [...DEFAULT_SWATCHES];
  }
}

export function saveCharacterPalette(
  characterId: number | null | undefined,
  swatches: ColorSwatch[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getPaletteStorageKey(characterId),
      JSON.stringify(swatches),
    );
  } catch {
    // Ignore quota errors
  }
}

export function extractPaletteFromFrames(
  frames: PixelDocumentState[],
  maxColors = 24,
): ColorSwatch[] {
  const counts = new Map<string, number>();
  for (const frame of frames) {
    const flat = compositeDocument(frame);
    for (const hex of flat) {
      if (!hex) continue;
      const norm = normalizeHex(hex);
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([hex]) => ({ name: hex, hex }));
}

function sanitizeSwatchList(raw: unknown): ColorSwatch[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: ColorSwatch[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof (item as ColorSwatch).hex !== "string") continue;
    const hex = normalizeHex((item as ColorSwatch).hex);
    if (seen.has(hex)) continue;
    seen.add(hex);
    const rawName = (item as ColorSwatch).name;
    cleaned.push({
      name: typeof rawName === "string" && rawName.trim() ? rawName.trim() : hex,
      hex,
    });
  }
  return cleaned;
}

export function loadCustomPalettePresets(): PalettePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: PalettePreset[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry.id !== "string" || typeof entry.label !== "string") {
        continue;
      }
      const label = entry.label.trim();
      const swatches = sanitizeSwatchList(entry.swatches);
      if (!label || swatches.length === 0) continue;
      valid.push({
        id: entry.id,
        label,
        swatches,
        custom: true,
      });
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveCustomPalettePresets(presets: PalettePreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CUSTOM_PRESETS_STORAGE_KEY,
      JSON.stringify(
        presets.map((p) => ({
          id: p.id,
          label: p.label,
          swatches: sanitizeSwatchList(p.swatches),
          custom: true,
        })),
      ),
    );
  } catch {
    // Ignore quota errors
  }
}
