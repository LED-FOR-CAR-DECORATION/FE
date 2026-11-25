import {
  compositeDocument,
  createEmptyDocument,
  hexToRgb,
  rgbToHex,
  type PixelDocumentState,
} from "./pixelDocument";

interface PaletteRgb {
  r: number;
  g: number;
  b: number;
}

function writeUint16LE(out: number[], value: number) {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

/** Quantizes >255 RGB values into a 6x7x6 (252-entry) palette fallback, preserving index 0 for transparency. */
function buildFramePaletteAndIndices(
  compositeHexes: string[],
  outWidth: number,
  outHeight: number,
  docWidth: number,
  docHeight: number,
  scale: number,
  backgroundHex?: string,
): { palette: PaletteRgb[]; indices: Uint8Array; transparentIndex: number } {
  const uniqueMap = new Map<string, number>();
  const palette: PaletteRgb[] = [];

  if (backgroundHex) {
    const bg = hexToRgb(backgroundHex);
    palette.push(bg);
    uniqueMap.set(backgroundHex.toUpperCase(), 0);
  } else {
    // Index 0 reserved for transparent off-LED pixels
    palette.push({ r: 0, g: 0, b: 0 });
  }

  let exceeded256 = false;
  for (let i = 0; i < compositeHexes.length; i++) {
    const hex = compositeHexes[i];
    if (!hex) continue;
    const norm = hex.toUpperCase();
    if (!uniqueMap.has(norm)) {
      if (palette.length >= 256) {
        exceeded256 = true;
        break;
      }
      uniqueMap.set(norm, palette.length);
      palette.push(hexToRgb(norm));
    }
  }

  if (exceeded256) {
    // Build compact 6x7x6 uniform RGB cube starting after slot 0
    palette.length = 1;
    uniqueMap.clear();
    if (backgroundHex) {
      palette[0] = hexToRgb(backgroundHex);
    }
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 7; g++) {
        for (let b = 0; b < 6; b++) {
          palette.push({
            r: Math.round((r / 5) * 255),
            g: Math.round((g / 6) * 255),
            b: Math.round((b / 5) * 255),
          });
        }
      }
    }
  }

  const mapHexToIndex = (hex: string): number => {
    if (!hex) return 0;
    const norm = hex.toUpperCase();
    if (!exceeded256) {
      return uniqueMap.get(norm) ?? 0;
    }
    const { r, g, b } = hexToRgb(norm);
    const ri = Math.round((r / 255) * 5);
    const gi = Math.round((g / 255) * 6);
    const bi = Math.round((b / 255) * 5);
    return 1 + ri * 42 + gi * 6 + bi;
  };

  const indices = new Uint8Array(outWidth * outHeight);
  for (let py = 0; py < docHeight; py++) {
    for (let px = 0; px < docWidth; px++) {
      const idx = mapHexToIndex(compositeHexes[py * docWidth + px]);
      for (let sy = 0; sy < scale; sy++) {
        const oy = py * scale + sy;
        const rowOffset = oy * outWidth + px * scale;
        for (let sx = 0; sx < scale; sx++) {
          indices[rowOffset + sx] = idx;
        }
      }
    }
  }

  return {
    palette,
    indices,
    transparentIndex: backgroundHex ? -1 : 0,
  };
}

function lzwEncodeGif(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const rawBytes: number[] = [];

  let bitBuf = 0;
  let bitCount = 0;
  const emitBits = (code: number, width: number) => {
    bitBuf |= code << bitCount;
    bitCount += width;
    while (bitCount >= 8) {
      rawBytes.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let maxCodeForWidth = 1 << codeSize;
  const dict = new Map<number, number>();

  const resetTable = () => {
    dict.clear();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
    maxCodeForWidth = 1 << codeSize;
  };

  emitBits(clearCode, codeSize);
  resetTable();

  if (indices.length === 0) {
    emitBits(eoiCode, codeSize);
    if (bitCount > 0) rawBytes.push(bitBuf & 0xff);
    return rawBytes;
  }

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const pixel = indices[i];
    const key = (prefix << 8) | pixel;
    const existing = dict.get(key);
    if (existing !== undefined) {
      prefix = existing;
    } else {
      emitBits(prefix, codeSize);
      if (nextCode < 4096) {
        dict.set(key, nextCode);
        nextCode++;
        if (nextCode > maxCodeForWidth && codeSize < 12) {
          codeSize++;
          maxCodeForWidth = 1 << codeSize;
        }
      } else {
        emitBits(clearCode, codeSize);
        resetTable();
      }
      prefix = pixel;
    }
  }

  emitBits(prefix, codeSize);
  emitBits(eoiCode, codeSize);
  if (bitCount > 0) {
    rawBytes.push(bitBuf & 0xff);
  }
  return rawBytes;
}

/**
 * Encodes one or more PixelDocumentState frames into a spec-compliant animated GIF89a binary.
 */
export function encodeFramesToGifBytes(
  frames: PixelDocumentState[],
  frameDelayMs = 100,
  scaleFactor = 1,
  backgroundHex?: string,
): Uint8Array {
  const safeFrames = frames.length > 0 ? frames : [createEmptyDocument(32, 32)];
  const baseDoc = safeFrames[0];
  const scale = Math.max(1, Math.min(16, Math.floor(scaleFactor)));
  const outWidth = baseDoc.width * scale;
  const outHeight = baseDoc.height * scale;
  const delayCs = Math.max(2, Math.round(frameDelayMs / 10));

  const bytes: number[] = [];

  // Header "GIF89a"
  bytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  // Logical Screen Descriptor (no global table; per-frame local tables keep exact pixel colors)
  writeUint16LE(bytes, outWidth);
  writeUint16LE(bytes, outHeight);
  bytes.push(0x70, 0x00, 0x00);

  // NETSCAPE2.0 infinite loop extension when animated (>1 frames)
  if (safeFrames.length > 1) {
    bytes.push(
      0x21,
      0xff,
      0x0b,
      0x4e,
      0x45,
      0x54,
      0x53,
      0x43,
      0x41,
      0x50,
      0x45,
      0x32,
      0x2e,
      0x30,
      0x03,
      0x01,
      0x00,
      0x00,
      0x00,
    );
  }

  for (const frame of safeFrames) {
    const composite = compositeDocument(frame);
    const { palette, indices, transparentIndex } = buildFramePaletteAndIndices(
      composite,
      outWidth,
      outHeight,
      frame.width,
      frame.height,
      scale,
      backgroundHex,
    );

    const tableExp = Math.max(1, Math.ceil(Math.log2(Math.max(4, palette.length))) - 1);
    const tableSize = 1 << (tableExp + 1);
    const minCodeSize = tableExp + 1;

    // Graphics Control Extension (disposal 2 = restore background, optional transparency)
    bytes.push(0x21, 0xf9, 0x04);
    bytes.push(transparentIndex >= 0 ? 0x09 : 0x08);
    writeUint16LE(bytes, delayCs);
    bytes.push(transparentIndex >= 0 ? transparentIndex : 0);
    bytes.push(0x00);

    // Image Descriptor
    bytes.push(0x2c);
    writeUint16LE(bytes, 0);
    writeUint16LE(bytes, 0);
    writeUint16LE(bytes, outWidth);
    writeUint16LE(bytes, outHeight);
    bytes.push(0x80 | (tableExp & 0x07));

    // Local Color Table
    for (let i = 0; i < tableSize; i++) {
      const c = palette[i];
      if (c) {
        bytes.push(c.r & 0xff, c.g & 0xff, c.b & 0xff);
      } else {
        bytes.push(0, 0, 0);
      }
    }

    // Image Data
    bytes.push(minCodeSize);
    const compressed = lzwEncodeGif(indices, minCodeSize);
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const chunkLen = Math.min(255, compressed.length - offset);
      bytes.push(chunkLen);
      for (let j = 0; j < chunkLen; j++) {
        bytes.push(compressed[offset + j]);
      }
    }
    bytes.push(0x00);
  }

  // GIF Trailer
  bytes.push(0x3b);
  return new Uint8Array(bytes);
}

export function encodeFramesToGifBlob(
  frames: PixelDocumentState[],
  frameDelayMs = 100,
  scaleFactor = 1,
  backgroundHex?: string,
): Blob {
  const bytes = encodeFramesToGifBytes(frames, frameDelayMs, scaleFactor, backgroundHex);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "image/gif" });
}

export function encodeFramesToGifDataUrl(
  frames: PixelDocumentState[],
  frameDelayMs = 100,
  scaleFactor = 1,
  backgroundHex?: string,
): string {
  const bytes = encodeFramesToGifBytes(frames, frameDelayMs, scaleFactor, backgroundHex);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:image/gif;base64,${btoa(binary)}`;
}

function lzwDecodeGif(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const output = new Uint8Array(pixelCount);
  let outPos = 0;

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let codeMask = (1 << codeSize) - 1;

  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const pixelStack = new Uint8Array(4097);

  for (let i = 0; i < clearCode; i++) {
    prefix[i] = -1;
    suffix[i] = i;
  }

  let bytePos = 0;
  let bitBuf = 0;
  let bitCount = 0;

  const readCode = (): number => {
    while (bitCount < codeSize) {
      if (bytePos >= data.length) return eoiCode;
      bitBuf |= data[bytePos++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuf & codeMask;
    bitBuf >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  let prevCode = -1;
  let firstChar = 0;

  while (outPos < pixelCount) {
    const code = readCode();
    if (code === eoiCode) break;
    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
      codeMask = (1 << codeSize) - 1;
      prevCode = -1;
      continue;
    }

    let inCode = code;
    let top = 0;
    if (code >= nextCode) {
      if (prevCode === -1) break;
      pixelStack[top++] = firstChar;
      inCode = prevCode;
    }

    while (inCode >= clearCode && top < 4096) {
      pixelStack[top++] = suffix[inCode];
      inCode = prefix[inCode];
    }

    if (inCode < 0 || inCode >= 4096) break;
    firstChar = suffix[inCode];
    pixelStack[top++] = firstChar;

    while (top > 0 && outPos < pixelCount) {
      output[outPos++] = pixelStack[--top];
    }

    if (prevCode !== -1 && nextCode < 4096) {
      prefix[nextCode] = prevCode;
      suffix[nextCode] = firstChar;
      nextCode++;
      if ((nextCode & codeMask) === 0 && nextCode < 4096) {
        codeSize++;
        codeMask = (1 << codeSize) - 1;
      }
    }
    prevCode = code;
  }

  return output;
}

/**
 * Decodes GIF87a/GIF89a bytes into PixelDocumentState frames scaled (nearest-neighbor)
 * to the target LED matrix dimensions. Returns null if not a valid GIF.
 */
export function decodeGifBytesToFrames(
  bytes: Uint8Array,
  targetWidth: number,
  targetHeight: number,
): { frames: PixelDocumentState[]; frameDelayMs: number } | null {
  if (bytes.length < 14) return null;
  const sig = String.fromCharCode(...bytes.slice(0, 4));
  if (sig !== "GIF8") return null;

  let pos = 6;
  const screenWidth = bytes[pos] | (bytes[pos + 1] << 8);
  const screenHeight = bytes[pos + 2] | (bytes[pos + 3] << 8);
  const packed = bytes[pos + 4];
  pos += 7;
  if (screenWidth <= 0 || screenHeight <= 0) return null;

  let globalTable: PaletteRgb[] | null = null;
  if ((packed & 0x80) !== 0) {
    const tableSize = 1 << ((packed & 0x07) + 1);
    if (pos + tableSize * 3 > bytes.length) return null;
    globalTable = [];
    for (let i = 0; i < tableSize; i++) {
      globalTable.push({
        r: bytes[pos++],
        g: bytes[pos++],
        b: bytes[pos++],
      });
    }
  }

  const readSubBlocks = (): Uint8Array => {
    const chunks: number[] = [];
    while (pos < bytes.length) {
      const len = bytes[pos++];
      if (len === 0) break;
      const end = Math.min(bytes.length, pos + len);
      for (let i = pos; i < end; i++) chunks.push(bytes[i]);
      pos = end;
    }
    return new Uint8Array(chunks);
  };

  let gceDelayMs = 100;
  let gceTransparentIdx = -1;
  let gceDisposal = 0;
  let firstFrameDelayMs = 100;

  let canvas = Array<string>(screenWidth * screenHeight).fill("");
  const decodedFrames: PixelDocumentState[] = [];

  while (pos < bytes.length) {
    const block = bytes[pos++];
    if (block === 0x3b) break;
    if (block === 0x21) {
      if (pos >= bytes.length) break;
      const label = bytes[pos++];
      if (label === 0xf9 && pos + 5 < bytes.length) {
        const blockSize = bytes[pos++];
        if (blockSize === 4) {
          const gcePacked = bytes[pos++];
          gceDisposal = (gcePacked >> 2) & 0x07;
          const hasTransparent = (gcePacked & 0x01) !== 0;
          const delayCs = bytes[pos] | (bytes[pos + 1] << 8);
          pos += 2;
          const transIdx = bytes[pos++];
          gceTransparentIdx = hasTransparent ? transIdx : -1;
          gceDelayMs = delayCs > 0 ? delayCs * 10 : 100;
          pos++; // terminator
        } else {
          pos += blockSize;
          readSubBlocks();
        }
      } else {
        readSubBlocks();
      }
      continue;
    }

    if (block === 0x2c) {
      if (pos + 9 >= bytes.length) break;
      const left = bytes[pos] | (bytes[pos + 1] << 8);
      const top = bytes[pos + 2] | (bytes[pos + 3] << 8);
      const imgWidth = bytes[pos + 4] | (bytes[pos + 5] << 8);
      const imgHeight = bytes[pos + 6] | (bytes[pos + 7] << 8);
      const imgPacked = bytes[pos + 8];
      pos += 9;

      let localTable: PaletteRgb[] | null = null;
      if ((imgPacked & 0x80) !== 0) {
        const tableSize = 1 << ((imgPacked & 0x07) + 1);
        if (pos + tableSize * 3 > bytes.length) break;
        localTable = [];
        for (let i = 0; i < tableSize; i++) {
          localTable.push({
            r: bytes[pos++],
            g: bytes[pos++],
            b: bytes[pos++],
          });
        }
      }

      const activeTable = localTable ?? globalTable;
      if (!activeTable || pos >= bytes.length) break;
      const minCodeSize = bytes[pos++];
      const rawLzw = readSubBlocks();
      const pixelIndices = lzwDecodeGif(rawLzw, minCodeSize, imgWidth * imgHeight);
      const interlaced = (imgPacked & 0x40) !== 0;

      const prevSnapshot = canvas.slice();

      const mapInterlacedY = (row: number): number => {
        if (!interlaced) return row;
        const passes = [
          [0, 8],
          [4, 8],
          [2, 4],
          [1, 2],
        ];
        let count = 0;
        for (const [start, step] of passes) {
          const rowsInPass = Math.ceil(Math.max(0, imgHeight - start) / step);
          if (row < count + rowsInPass) {
            return start + (row - count) * step;
          }
          count += rowsInPass;
        }
        return row;
      };

      for (let iy = 0; iy < imgHeight; iy++) {
        const dy = top + mapInterlacedY(iy);
        if (dy < 0 || dy >= screenHeight) continue;
        for (let ix = 0; ix < imgWidth; ix++) {
          const dx = left + ix;
          if (dx < 0 || dx >= screenWidth) continue;
          const colorIdx = pixelIndices[iy * imgWidth + ix];
          if (colorIdx === gceTransparentIdx) continue;
          const c = activeTable[colorIdx];
          if (c) {
            canvas[dy * screenWidth + dx] = rgbToHex(c.r, c.g, c.b);
          }
        }
      }

      if (decodedFrames.length === 0) {
        firstFrameDelayMs = gceDelayMs;
      }

      // Scale nearest-neighbor from GIF logical screen into target LED dimensions
      const scaledPixels = Array<string>(targetWidth * targetHeight).fill("");
      for (let ty = 0; ty < targetHeight; ty++) {
        const sy = Math.floor(((ty + 0.5) * screenHeight) / targetHeight);
        for (let tx = 0; tx < targetWidth; tx++) {
          const sx = Math.floor(((tx + 0.5) * screenWidth) / targetWidth);
          scaledPixels[ty * targetWidth + tx] = canvas[sy * screenWidth + sx] ?? "";
        }
      }

      decodedFrames.push({
        width: targetWidth,
        height: targetHeight,
        pixels: scaledPixels,
        texts: [],
      });

      if (gceDisposal === 2) {
        for (let dy = top; dy < Math.min(screenHeight, top + imgHeight); dy++) {
          for (let dx = left; dx < Math.min(screenWidth, left + imgWidth); dx++) {
            canvas[dy * screenWidth + dx] = "";
          }
        }
      } else if (gceDisposal === 3) {
        canvas = prevSnapshot;
      }

      gceTransparentIdx = -1;
      gceDisposal = 0;
    }
  }

  if (decodedFrames.length === 0) return null;
  return {
    frames: decodedFrames,
    frameDelayMs: firstFrameDelayMs,
  };
}
