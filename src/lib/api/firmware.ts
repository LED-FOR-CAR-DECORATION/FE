/**
 * Admin firmware release API (WBS DEV-11 list, DEV-12 upload, DEV-13 deprecate).
 *
 * The backend endpoints are planned but may not be deployed yet. Set
 * NEXT_PUBLIC_FIRMWARE_MOCK=true to run the screens against an in-memory store
 * that follows the same contract.
 */
import axios, { type AxiosProgressEvent } from "axios";
import { getSessionToken } from "../auth/session";
import { getApiBaseUrl, OpenAPI } from "./client";

export type FirmwareStatus = "ACTIVE" | "SUPERSEDED" | "DEPRECATED";

export interface FirmwareRelease {
  firmwareId: number;
  modelId: number;
  modelName: string;
  version: string;
  status: FirmwareStatus;
  changelog: string;
  fileSizeBytes: number;
  sha256: string;
  uploadedBy: string | null;
  uploadedAt: string;
  deprecatedAt: string | null;
  deprecatedBy: string | null;
  deprecationReason: string | null;
  installedDeviceCount: number;
}

export interface FirmwarePage {
  items: FirmwareRelease[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FirmwareListParams {
  modelId?: number;
  status?: FirmwareStatus;
  page?: number;
  size?: number;
}

export interface UploadFirmwareInput {
  file: File;
  modelId: number;
  version: string;
  changelog: string;
}

export interface UploadFirmwareResult extends FirmwareRelease {
  supersededFirmwareId: number | null;
}

export interface DeprecateFirmwareResult {
  deprecated: FirmwareRelease;
  newActiveFirmware: FirmwareRelease | null;
  affectedDeviceCount: number;
}

const BASE_PATH = "/api/management/admin/firmware";
const USE_MOCK = process.env.NEXT_PUBLIC_FIRMWARE_MOCK === "true";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FIRMWARE_BINARY: "Tệp không phải firmware ESP32 hợp lệ (sai byte 0xE9, rỗng hoặc vượt dung lượng cho phép).",
  FIRMWARE_VERSION_CONFLICT: "Phiên bản đã tồn tại hoặc không lớn hơn mọi phiên bản trước đó của mẫu LED này.",
  LED_MODEL_NOT_FOUND: "Không tìm thấy mẫu LED đã chọn.",
  FIRMWARE_NOT_FOUND: "Không tìm thấy bản firmware này.",
  FIRMWARE_ALREADY_DEPRECATED: "Bản firmware này đã bị thu hồi trước đó.",
};

/** Turns an axios/backend error into a Vietnamese message for the screen. */
export function firmwareErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data as { code?: string; message?: string } | undefined;
    if (body?.code && ERROR_MESSAGES[body.code]) return ERROR_MESSAGES[body.code];
    if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Chỉ Quản trị viên mới được quản lý firmware.";
    // Spring answers an unmapped route with RESOURCE_NOT_FOUND: the firmware API is not deployed yet.
    if (status === 404 && (!body?.code || body.code === "RESOURCE_NOT_FOUND")) {
      return "Máy chủ chưa hỗ trợ chức năng firmware (endpoint chưa được triển khai).";
    }
    if (status === 413) return "Tệp firmware vượt quá giới hạn tải lên của máy chủ.";
    if (body?.message) return body.message;
    if (!error.response) return "Không kết nối được máy chủ.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function authConfig() {
  const token = await getSessionToken();
  return {
    baseURL: getApiBaseUrl(),
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

type PageMeta = Partial<Pick<FirmwarePage, "page" | "size" | "totalElements" | "totalPages">>;

export interface FirmwareModel {
  modelId: number;
  modelName: string;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DEPRECATED";
}

/**
 * LED models for the firmware screen (DEV-01). Unlike fetchManagedLedModels this
 * throws on failure, so the screen can tell "no models" from "could not load".
 */
export async function fetchFirmwareModels(): Promise<FirmwareModel[]> {
  const config = await authConfig();
  const { data } = await axios.get<{ data?: FirmwareModel[] }>("/api/management/admin/led-models", {
    ...config,
    // DEV-01 caps size at 100; enough for now (see backend todo on model summaries).
    params: { page: 0, size: 100 },
  });
  return (data.data ?? []).map(({ modelId, modelName, status }) => ({ modelId, modelName, status }));
}

export async function fetchFirmwareReleases(params: FirmwareListParams = {}): Promise<FirmwarePage> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  if (USE_MOCK) return mock.list({ ...params, page, size });

  const config = await authConfig();
  const { data } = await axios.get<{ data?: FirmwareRelease[]; meta?: PageMeta }>(BASE_PATH, {
    ...config,
    params: { page, size, modelId: params.modelId, status: params.status },
  });
  const items = data.data ?? [];
  const meta = data.meta ?? {};
  const totalElements = meta.totalElements ?? items.length;
  return {
    items,
    page: meta.page ?? page,
    size: meta.size ?? size,
    totalElements,
    totalPages: meta.totalPages ?? Math.max(1, Math.ceil(totalElements / size)),
  };
}

export async function uploadFirmware(
  input: UploadFirmwareInput,
  onProgress?: (percent: number) => void,
): Promise<UploadFirmwareResult> {
  if (USE_MOCK) return mock.upload(input, onProgress);

  const form = new FormData();
  form.append("file", input.file);
  form.append("modelId", String(input.modelId));
  form.append("version", input.version);
  form.append("changelog", input.changelog);
  const config = await authConfig();
  const { data } = await axios.post<{ data: UploadFirmwareResult }>(BASE_PATH, form, {
    ...config,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data.data;
}

export async function deprecateFirmware(firmwareId: number, reason: string): Promise<DeprecateFirmwareResult> {
  if (USE_MOCK) return mock.deprecate(firmwareId, reason);

  const config = await authConfig();
  const { data } = await axios.patch<{ data: DeprecateFirmwareResult }>(
    `${BASE_PATH}/${firmwareId}/deprecate`,
    { reason },
    config,
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// In-memory mock following the same contract (NEXT_PUBLIC_FIRMWARE_MOCK=true).
// ---------------------------------------------------------------------------

function mockError(status: number, code: string): never {
  const error = new axios.AxiosError(code, String(status));
  error.response = { status, data: { code, message: code }, statusText: code, headers: {}, config: {} as never };
  throw error;
}

function compareVersions(first: string, second: string): number {
  const a = first.split(".").map(Number);
  const b = second.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const mock = (() => {
  const day = 24 * 60 * 60 * 1000;
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * day).toISOString();
  const hash = (seed: string) => Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[(seed.charCodeAt(i % seed.length) + i * 7) % 16]).join("");
  const release = (
    firmwareId: number,
    modelId: number,
    modelName: string,
    version: string,
    status: FirmwareStatus,
    daysAgo: number,
    installedDeviceCount: number,
    changelog: string,
  ): FirmwareRelease => ({
    firmwareId,
    modelId,
    modelName,
    version,
    status,
    changelog,
    fileSizeBytes: 1_180_000 + firmwareId * 3_217,
    sha256: hash(`${modelId}-${version}`),
    uploadedBy: "admin@lumintra.vn",
    uploadedAt: iso(daysAgo),
    deprecatedAt: status === "DEPRECATED" ? iso(daysAgo - 1) : null,
    deprecatedBy: status === "DEPRECATED" ? "admin@lumintra.vn" : null,
    deprecationReason: status === "DEPRECATED" ? "Màn hình nhấp nháy khi bật xi-nhan trên một số xe." : null,
    installedDeviceCount,
  });
  let nextId = 6;
  const store: FirmwareRelease[] = [
    release(1, 1, "Mirage Matrix 64x32", "1.0.0", "SUPERSEDED", 40, 3, "Bản phát hành đầu tiên."),
    release(2, 1, "Mirage Matrix 64x32", "1.1.0", "SUPERSEDED", 21, 12, "Thêm hiệu ứng Marquee và sửa lỗi kết nối BLE."),
    release(3, 1, "Mirage Matrix 64x32", "1.2.0", "DEPRECATED", 9, 4, "Hỗ trợ tín hiệu CAN cho xi-nhan."),
    release(4, 1, "Mirage Matrix 64x32", "1.2.1", "ACTIVE", 3, 7, "Sửa lỗi nhấp nháy của 1.2.0, tối ưu độ sáng ban đêm."),
    release(5, 2, "Mirage Mini 32x32", "1.0.0", "ACTIVE", 15, 5, "Bản phát hành đầu tiên cho Mini."),
  ];
  const delay = () => new Promise((resolve) => setTimeout(resolve, 350));

  return {
    async list(params: Required<Pick<FirmwareListParams, "page" | "size">> & FirmwareListParams): Promise<FirmwarePage> {
      await delay();
      const filtered = store
        .filter((item) => (params.modelId ? item.modelId === params.modelId : true))
        .filter((item) => (params.status ? item.status === params.status : true))
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      const start = params.page * params.size;
      return {
        items: filtered.slice(start, start + params.size).map((item) => ({ ...item })),
        page: params.page,
        size: params.size,
        totalElements: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / params.size)),
      };
    },
    async upload(input: UploadFirmwareInput, onProgress?: (percent: number) => void): Promise<UploadFirmwareResult> {
      for (const percent of [15, 40, 70, 100]) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        onProgress?.(percent);
      }
      const first = new Uint8Array(await input.file.slice(0, 1).arrayBuffer())[0];
      if (input.file.size === 0 || first !== 0xe9) mockError(400, "INVALID_FIRMWARE_BINARY");
      const sameModel = store.filter((item) => item.modelId === input.modelId);
      if (sameModel.some((item) => compareVersions(item.version, input.version) >= 0)) {
        mockError(409, "FIRMWARE_VERSION_CONFLICT");
      }
      const previous = sameModel.find((item) => item.status === "ACTIVE");
      if (previous) previous.status = "SUPERSEDED";
      const digest = await crypto.subtle.digest("SHA-256", await input.file.arrayBuffer());
      const created: FirmwareRelease = {
        ...release(nextId++, input.modelId, sameModel[0]?.modelName ?? `LED model #${input.modelId}`, input.version, "ACTIVE", 0, 0, input.changelog),
        fileSizeBytes: input.file.size,
        sha256: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""),
      };
      store.push(created);
      return { ...created, supersededFirmwareId: previous?.firmwareId ?? null };
    },
    async deprecate(firmwareId: number, reason: string): Promise<DeprecateFirmwareResult> {
      await delay();
      const target = store.find((item) => item.firmwareId === firmwareId);
      if (!target) mockError(404, "FIRMWARE_NOT_FOUND");
      if (target.status === "DEPRECATED") mockError(409, "FIRMWARE_ALREADY_DEPRECATED");
      const wasActive = target.status === "ACTIVE";
      Object.assign(target, {
        status: "DEPRECATED" as const,
        deprecatedAt: new Date().toISOString(),
        deprecatedBy: "admin@lumintra.vn",
        deprecationReason: reason,
      });
      let promoted: FirmwareRelease | null = null;
      if (wasActive) {
        promoted =
          store
            .filter((item) => item.modelId === target.modelId && item.status === "SUPERSEDED")
            .sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
        if (promoted) promoted.status = "ACTIVE";
      }
      return {
        deprecated: { ...target },
        newActiveFirmware: promoted ? { ...promoted } : null,
        affectedDeviceCount: target.installedDeviceCount,
      };
    },
  };
})();
