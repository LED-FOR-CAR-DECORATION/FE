/**
 * Client-side pre-checks for an ESP32 firmware image before upload (BR-GEN-08).
 * The backend repeats every check and computes the authoritative SHA-256.
 */

/** App slot size of the device's `min_spiffs.csv` partition table (0x1E0000). */
export const MAX_FIRMWARE_BYTES = 0x1e0000;
export const ESP_IMAGE_MAGIC = 0xe9;
export const SEMVER_PATTERN = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/;
export const CHANGELOG_MAX = 5000;
export const DEPRECATION_REASON_MAX = 1000;

export interface BinaryInspection {
  ok: boolean;
  sizeBytes: number;
  magicByte: number | null;
  sha256: string | null;
  problems: string[];
}

export async function inspectFirmwareBinary(file: File): Promise<BinaryInspection> {
  const problems: string[] = [];
  if (!file.name.toLowerCase().endsWith(".bin")) problems.push("Tệp phải có đuôi .bin.");
  if (file.size === 0) problems.push("Tệp rỗng.");
  if (file.size > MAX_FIRMWARE_BYTES) {
    problems.push(`Tệp lớn hơn phân vùng OTA của thiết bị (tối đa ${formatBytes(MAX_FIRMWARE_BYTES)}).`);
  }

  let magicByte: number | null = null;
  let sha256: string | null = null;
  if (file.size > 0) {
    const buffer = await file.arrayBuffer();
    magicByte = new Uint8Array(buffer, 0, 1)[0];
    if (magicByte !== ESP_IMAGE_MAGIC) {
      problems.push(`Byte đầu là 0x${magicByte.toString(16).toUpperCase().padStart(2, "0")}, firmware ESP32 phải bắt đầu bằng 0xE9.`);
    }
    if (file.size <= MAX_FIRMWARE_BYTES) {
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  }
  return { ok: problems.length === 0, sizeBytes: file.size, magicByte, sha256, problems };
}

/** Negative when a < b, 0 when equal, positive when a > b. Both must match SEMVER_PATTERN. */
export function compareSemver(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
