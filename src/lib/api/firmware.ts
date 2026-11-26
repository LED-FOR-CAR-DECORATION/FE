/**
 * Admin firmware release API: DEV-11 list, DEV-12 upload, DEV-13 deprecate, plus the
 * DEV-01 LED model list (which carries each model's ACTIVE firmware summary).
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

/** `activeFirmware` of a DEV-01 LED model item; null when the model has no ACTIVE release. */
export interface ActiveFirmwareSummary {
  firmwareId: number;
  version: string;
  uploadedAt: string;
  installedDeviceCount: number;
}

export interface FirmwareModel {
  modelId: number;
  modelName: string;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DEPRECATED";
  activeFirmware: ActiveFirmwareSummary | null;
}

const BASE_PATH = "/api/management/admin/firmware";
/** DEV-01 caps `size` at 100. Past 100 models, switch to its `keyword` search and paging. */
const MODEL_PAGE_SIZE = 100;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FIRMWARE_BINARY: "Tệp không phải firmware ESP32 hợp lệ (sai byte 0xE9, rỗng hoặc vượt dung lượng cho phép).",
  FIRMWARE_VERSION_CONFLICT: "Phiên bản đã tồn tại hoặc không lớn hơn mọi phiên bản trước đó của mẫu LED này, kể cả bản đã thu hồi.",
  LED_MODEL_NOT_FOUND: "Không tìm thấy mẫu LED đã chọn.",
  FIRMWARE_NOT_FOUND: "Không tìm thấy bản firmware này.",
  FIRMWARE_ALREADY_DEPRECATED: "Bản firmware này đã bị thu hồi trước đó.",
  PAYLOAD_TOO_LARGE: "Tệp firmware vượt quá giới hạn tải lên của máy chủ.",
};

/** Turns an axios/backend error into a Vietnamese message for the screen. */
export function firmwareErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data as { code?: string; message?: string } | undefined;
    if (body?.code && ERROR_MESSAGES[body.code]) return ERROR_MESSAGES[body.code];
    if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Chỉ Quản trị viên mới được quản lý firmware.";
    if (status === 413) return ERROR_MESSAGES.PAYLOAD_TOO_LARGE;
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

/**
 * LED models with their ACTIVE firmware summary (DEV-01). Unlike fetchManagedLedModels this
 * throws on failure, so the screen can tell "no models" from "could not load".
 */
export async function fetchFirmwareModels(): Promise<FirmwareModel[]> {
  const config = await authConfig();
  const { data } = await axios.get<{ data?: FirmwareModel[] }>("/api/management/admin/led-models", {
    ...config,
    params: { page: 0, size: MODEL_PAGE_SIZE },
  });
  return (data.data ?? []).map(({ modelId, modelName, status, activeFirmware }) => ({
    modelId,
    modelName,
    status,
    activeFirmware: activeFirmware ?? null,
  }));
}

export async function fetchFirmwareReleases(params: FirmwareListParams = {}): Promise<FirmwarePage> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
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
  const config = await authConfig();
  const { data } = await axios.patch<{ data: DeprecateFirmwareResult }>(
    `${BASE_PATH}/${firmwareId}/deprecate`,
    { reason },
    config,
  );
  return data.data;
}
