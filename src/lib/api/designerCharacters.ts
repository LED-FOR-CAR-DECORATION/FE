import axios from "axios";
import { ApiError } from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "./client";

const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

const CHARACTERS_STORAGE_KEY = "mirage_designer_characters_v1";
const VERSIONS_STORAGE_KEY = "mirage_designer_character_versions_v1";

export interface CurrentVersionSummary {
  versionId: number;
  versionNumber: number;
  previewGifUrl: string;
}

export interface DesignerCharacterItem {
  characterId: number;
  characterName: string;
  description: string | null;
  totalVersions: number;
  currentVersion: CurrentVersionSummary | null;
  createdAt: string;
}

export interface CreateCharacterRequest {
  characterName: string;
  description?: string;
}

export interface UpdateCharacterRequest {
  characterName: string;
  description?: string;
}

export interface CreateCharacterResponse {
  characterId: number;
  characterName: string;
  description: string | null;
  creatorEmployeeId: number;
  createdAt: string;
}

export interface UpdateCharacterResponse {
  characterId: number;
  characterName: string;
  description: string | null;
  updatedAt: string;
}

export interface CharacterVersionItem {
  versionId: number;
  versionNumber: number;
  previewGifUrl: string;
  frameCount: number;
  frameDelayMs: number;
  byteSize: number;
  isCurrent: boolean;
  isListedOnStore: boolean;
  productId: number | null;
  productStatus: string | null;
  createdAt: string;
}

export interface CreateCharacterVersionPayload {
  previewGifUrl: string;
  frameCount: number;
  frameDelayMs: number;
  byteSize: number;
  isCurrent?: boolean;
}

export interface CreateCharacterVersionResponse {
  versionId: number;
  characterId: number;
  versionNumber: number;
  previewGifUrl: string;
  isCurrent: boolean;
  isListedOnStore: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface ApiEnvelope<T> {
  data?: T;
  meta?: unknown;
}

interface SignedUploadUrlResponse {
  signedUploadUrl: string;
  publicUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface UploadedDesignerAsset {
  publicUrl: string;
  previewUrl?: string;
  usedFallback: boolean;
}

interface MockStoredCharacter {
  characterId: number;
  characterName: string;
  description: string | null;
  createdAt: string;
}

interface MockStoredVersion extends CharacterVersionItem {
  characterId: number;
}

function isNetworkOrMissingConfigError(error: unknown): boolean {
  if (error instanceof ApiError) return false;
  if (axios.isAxiosError(error)) {
    return !error.response;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("econnrefused") ||
      msg.includes("thiếu cấu hình next_public_api_url")
    );
  }
  return false;
}

function normalizePaginationMeta(
  rawMeta: unknown,
  fallbackPage: number,
  fallbackSize: number,
  itemCount: number,
): PaginationMeta {
  const meta = (
    rawMeta && typeof rawMeta === "object" ? rawMeta : {}
  ) as Partial<PaginationMeta>;
  const page = typeof meta.page === "number" ? meta.page : fallbackPage;
  const size = typeof meta.size === "number" ? meta.size : fallbackSize;
  const totalElements =
    typeof meta.totalElements === "number" ? meta.totalElements : itemCount;
  const totalPages =
    typeof meta.totalPages === "number"
      ? meta.totalPages
      : Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
  const hasPrevious =
    typeof meta.hasPrevious === "boolean" ? meta.hasPrevious : page > 0;
  const hasNext =
    typeof meta.hasNext === "boolean" ? meta.hasNext : page + 1 < totalPages;

  return {
    page,
    size,
    totalElements,
    totalPages,
    hasNext,
    hasPrevious,
  };
}

function readMockCharacters(): MockStoredCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockStoredCharacter[]) : [];
  } catch {
    return [];
  }
}

function writeMockCharacters(items: MockStoredCharacter[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(items));
}

function readMockVersions(): MockStoredVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VERSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockStoredVersion[]) : [];
  } catch {
    return [];
  }
}

function writeMockVersions(items: MockStoredVersion[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(items));
}

export function readFileAsDataUrl(file: File): Promise<string | undefined> {
  if (typeof window === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function formatDesignerApiError(
  error: unknown,
  fallbackMessage = "Thao tác thất bại. Vui lòng thử lại.",
): string {
  if (error instanceof ApiError) {
    const body =
      error.body && typeof error.body === "object"
        ? (error.body as {
            code?: unknown;
            message?: unknown;
            details?: Array<{ field?: string; message?: string; reason?: string }>;
          })
        : undefined;

    const code = typeof body?.code === "string" ? body.code : "";
    const serverMessage = typeof body?.message === "string" ? body.message : "";
    const firstDetail = Array.isArray(body?.details) && body.details.length > 0
      ? body.details[0]?.message || body.details[0]?.reason
      : undefined;

    if (error.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    if (error.status === 403) {
      return "Chỉ tài khoản Nhà thiết kế (DESIGNER) sở hữu nhân vật mới có quyền thực hiện thao tác này.";
    }
    if (error.status === 404) {
      return serverMessage || "Không tìm thấy nhân vật hoặc phiên bản yêu cầu.";
    }
    if (error.status === 409) {
      if (
        code === "CANNOT_DELETE_LISTED_CHARACTER" ||
        code === "VERSION_ALREADY_LINKED_TO_PRODUCT"
      ) {
        return "Không thể xóa vì phiên bản của nhân vật đã được Manager đưa lên cửa hàng.";
      }
      return serverMessage || "Dữ liệu đang được sử dụng trên cửa hàng, không thể thực hiện.";
    }
    if (error.status === 400) {
      return firstDetail || serverMessage || "Dữ liệu gửi lên không hợp lệ.";
    }
    if (serverMessage) return serverMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export async function fetchMyCharacters(params: {
  query?: string;
  page?: number;
  size?: number;
} = {}): Promise<{ items: DesignerCharacterItem[]; meta: PaginationMeta }> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const trimmedQuery = params.query?.trim();

  const runMock = () => {
    const characters = readMockCharacters();
    const versions = readMockVersions();
    const filtered = characters.filter((char) => {
      if (!trimmedQuery) return true;
      const needle = trimmedQuery.toLowerCase();
      return (
        char.characterName.toLowerCase().includes(needle) ||
        (char.description ?? "").toLowerCase().includes(needle)
      );
    });
    const sorted = [...filtered].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const start = page * size;
    const paged = sorted.slice(start, start + size);
    const mapped: DesignerCharacterItem[] = paged.map((char) => {
      const charVersions = versions
        .filter((v) => v.characterId === char.characterId)
        .sort((a, b) => b.versionNumber - a.versionNumber);
      const active = charVersions.find((v) => v.isCurrent) ?? charVersions[0];
      return {
        characterId: char.characterId,
        characterName: char.characterName,
        description: char.description,
        totalVersions: charVersions.length,
        currentVersion: active
          ? {
              versionId: active.versionId,
              versionNumber: active.versionNumber,
              previewGifUrl: active.previewGifUrl,
            }
          : null,
        createdAt: char.createdAt,
      };
    });
    const totalElements = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
    return {
      items: mapped,
      meta: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
        hasPrevious: page > 0,
      },
    };
  };

  if (USE_MOCK_AUTH) {
    return runMock();
  }

  try {
    const res = await request<ApiEnvelope<DesignerCharacterItem[]>>(OpenAPI, {
      method: "GET",
      url: "/api/management/designer/characters/my",
      query: {
        query: trimmedQuery ? trimmedQuery : undefined,
        page,
        size,
      },
    });
    const items = res.data ?? [];
    return {
      items,
      meta: normalizePaginationMeta(res.meta, page, size, items.length),
    };
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return runMock();
    }
    throw error;
  }
}

export async function createDesignerCharacter(
  payload: CreateCharacterRequest,
): Promise<CreateCharacterResponse> {
  const cleanPayload: CreateCharacterRequest = {
    characterName: payload.characterName.trim(),
    description: payload.description?.trim() || undefined,
  };

  const runMock = (): CreateCharacterResponse => {
    const existing = readMockCharacters();
    const nextId = existing.reduce((max, item) => Math.max(max, item.characterId), 0) + 1;
    const created: MockStoredCharacter = {
      characterId: nextId,
      characterName: cleanPayload.characterName,
      description: cleanPayload.description ?? null,
      createdAt: new Date().toISOString(),
    };
    writeMockCharacters([created, ...existing]);
    return {
      ...created,
      creatorEmployeeId: 1,
    };
  };

  if (USE_MOCK_AUTH) {
    return runMock();
  }

  try {
    const res = await request<ApiEnvelope<CreateCharacterResponse>>(OpenAPI, {
      method: "POST",
      url: "/api/management/characters",
      body: cleanPayload,
      mediaType: "application/json",
    });
    if (!res.data) {
      throw new Error("Không nhận được dữ liệu nhân vật sau khi tạo.");
    }
    return res.data;
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return runMock();
    }
    throw error;
  }
}

export async function updateDesignerCharacter(
  characterId: number,
  payload: UpdateCharacterRequest,
): Promise<UpdateCharacterResponse> {
  const cleanPayload: UpdateCharacterRequest = {
    characterName: payload.characterName.trim(),
    description: payload.description?.trim() || undefined,
  };

  const runMock = (): UpdateCharacterResponse => {
    const existing = readMockCharacters();
    const target = existing.find((item) => item.characterId === characterId);
    if (!target) {
      throw new Error(`Không tìm thấy nhân vật #${characterId}.`);
    }
    const updated: MockStoredCharacter = {
      ...target,
      characterName: cleanPayload.characterName,
      description: cleanPayload.description ?? null,
    };
    writeMockCharacters(
      existing.map((item) => (item.characterId === characterId ? updated : item)),
    );
    return {
      characterId: updated.characterId,
      characterName: updated.characterName,
      description: updated.description,
      updatedAt: new Date().toISOString(),
    };
  };

  if (USE_MOCK_AUTH) {
    return runMock();
  }

  try {
    const res = await request<ApiEnvelope<UpdateCharacterResponse>>(OpenAPI, {
      method: "PUT",
      url: "/api/management/characters/{id}",
      path: { id: characterId },
      body: cleanPayload,
      mediaType: "application/json",
    });
    if (!res.data) {
      throw new Error("Không nhận được dữ liệu sau khi cập nhật nhân vật.");
    }
    return res.data;
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return runMock();
    }
    throw error;
  }
}

export async function deleteDesignerCharacter(characterId: number): Promise<void> {
  const runMock = (): void => {
    const versions = readMockVersions();
    const hasListed = versions.some(
      (v) => v.characterId === characterId && v.isListedOnStore,
    );
    if (hasListed) {
      throw new Error(
        "Không thể xóa nhân vật vì có phiên bản đã được Manager đưa lên cửa hàng.",
      );
    }
    writeMockCharacters(
      readMockCharacters().filter((item) => item.characterId !== characterId),
    );
    writeMockVersions(versions.filter((v) => v.characterId !== characterId));
  };

  if (USE_MOCK_AUTH) {
    runMock();
    return;
  }

  try {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: "/api/management/characters/{id}",
      path: { id: characterId },
    });
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      runMock();
      return;
    }
    throw error;
  }
}

export async function fetchCharacterVersions(
  characterId: number,
): Promise<CharacterVersionItem[]> {
  const runMock = (): CharacterVersionItem[] => {
    return readMockVersions()
      .filter((v) => v.characterId === characterId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  };

  if (USE_MOCK_AUTH) {
    return runMock();
  }

  try {
    const res = await request<ApiEnvelope<CharacterVersionItem[]>>(OpenAPI, {
      method: "GET",
      url: "/api/management/characters/{id}/versions",
      path: { id: characterId },
    });
    return res.data ?? [];
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return runMock();
    }
    throw error;
  }
}

export async function createCharacterVersion(
  characterId: number,
  payload: CreateCharacterVersionPayload,
): Promise<CreateCharacterVersionResponse> {
  const isCurrent = payload.isCurrent ?? true;
  const cleanPayload: CreateCharacterVersionPayload = {
    previewGifUrl: payload.previewGifUrl.trim(),
    frameCount: payload.frameCount,
    frameDelayMs: payload.frameDelayMs,
    byteSize: payload.byteSize,
    isCurrent,
  };

  const runMock = (): CreateCharacterVersionResponse => {
    const allVersions = readMockVersions();
    const charVersions = allVersions.filter((v) => v.characterId === characterId);
    const nextVersionNumber =
      charVersions.reduce((max, item) => Math.max(max, item.versionNumber), 0) + 1;
    const nextVersionId =
      allVersions.reduce((max, item) => Math.max(max, item.versionId), 0) + 1;
    const createdAt = new Date().toISOString();

    const updatedAll = allVersions.map((v) =>
      v.characterId === characterId && isCurrent ? { ...v, isCurrent: false } : v,
    );

    const nextVersion: MockStoredVersion = {
      characterId,
      versionId: nextVersionId,
      versionNumber: nextVersionNumber,
      previewGifUrl: cleanPayload.previewGifUrl,
      frameCount: cleanPayload.frameCount,
      frameDelayMs: cleanPayload.frameDelayMs,
      byteSize: cleanPayload.byteSize,
      isCurrent,
      isListedOnStore: false,
      productId: null,
      productStatus: null,
      createdAt,
    };

    writeMockVersions([nextVersion, ...updatedAll]);
    return {
      versionId: nextVersion.versionId,
      characterId,
      versionNumber: nextVersion.versionNumber,
      previewGifUrl: nextVersion.previewGifUrl,
      isCurrent: nextVersion.isCurrent,
      isListedOnStore: false,
      createdAt,
    };
  };

  if (USE_MOCK_AUTH) {
    return runMock();
  }

  try {
    const res = await request<ApiEnvelope<CreateCharacterVersionResponse>>(OpenAPI, {
      method: "POST",
      url: "/api/management/characters/{id}/versions",
      path: { id: characterId },
      body: cleanPayload,
      mediaType: "application/json",
    });
    if (!res.data) {
      throw new Error("Không nhận được dữ liệu phiên bản sau khi đăng tải.");
    }
    return res.data;
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return runMock();
    }
    throw error;
  }
}

export async function deleteCharacterVersion(
  characterId: number,
  versionId: number,
): Promise<void> {
  const runMock = (): void => {
    const versions = readMockVersions();
    const target = versions.find(
      (v) => v.characterId === characterId && v.versionId === versionId,
    );
    if (!target) {
      throw new Error(`Không tìm thấy phiên bản #${versionId}.`);
    }
    if (target.isListedOnStore) {
      throw new Error(
        "Không thể xóa phiên bản vì phiên bản này đã được Manager đưa lên cửa hàng.",
      );
    }
    writeMockVersions(
      versions.filter(
        (v) => !(v.characterId === characterId && v.versionId === versionId),
      ),
    );
  };

  if (USE_MOCK_AUTH) {
    runMock();
    return;
  }

  try {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: "/api/management/characters/{characterId}/versions/{versionId}",
      path: { characterId, versionId },
    });
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      runMock();
      return;
    }
    throw error;
  }
}

export async function uploadDesignerAssetFile(
  file: File,
  purpose: "CHARACTER_ASSET" | "COMMISSION_DRAFT",
  targetId?: number,
): Promise<UploadedDesignerAsset> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ file ảnh định dạng GIF, PNG, JPG hoặc WEBP.");
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("Kích thước file phải từ 1 byte đến tối đa 10MB.");
  }

  const previewUrl = await readFileAsDataUrl(file);
  const fallbackUrl = `https://cdn.lumintra.com/${
    purpose === "CHARACTER_ASSET" ? "characters" : "commissions"
  }/${Date.now()}-${encodeURIComponent(file.name)}`;

  if (USE_MOCK_AUTH) {
    return {
      publicUrl: fallbackUrl,
      previewUrl,
      usedFallback: true,
    };
  }

  try {
    const res = await request<ApiEnvelope<SignedUploadUrlResponse>>(OpenAPI, {
      method: "POST",
      url: "/api/media/upload-url",
      body: {
        fileName: file.name.slice(0, 255),
        contentType: file.type,
        fileSize: file.size,
        purpose,
        targetId,
      },
      mediaType: "application/json",
    });

    const signedData = res.data;
    if (!signedData?.signedUploadUrl || !signedData?.publicUrl) {
      throw new Error("Máy chủ không trả về liên kết tải tệp hợp lệ.");
    }

    const putResponse = await fetch(signedData.signedUploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!putResponse.ok) {
      throw new Error(`Tải tệp lên kho lưu trữ thất bại (HTTP ${putResponse.status}).`);
    }

    return {
      publicUrl: signedData.publicUrl,
      previewUrl,
      usedFallback: false,
    };
  } catch (error) {
    if (isNetworkOrMissingConfigError(error)) {
      return {
        publicUrl: fallbackUrl,
        previewUrl,
        usedFallback: true,
      };
    }
    throw error;
  }
}

