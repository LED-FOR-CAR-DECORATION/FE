import { ApiError } from "@/api_client";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "./client";
import { buildSignedPutHeaders, resolveImageMimeAndExtension } from "./media";
import { getQueryClient } from "@/lib/query/client";

/** Báo cache danh sách nhân vật designer (features/designer/designer-characters-cache.ts) là đã cũ. */
function markDesignerCharactersChanged(): void {
  if (typeof window === "undefined") return;
  void getQueryClient().invalidateQueries({ queryKey: ["designer", "characters"] });
}

export type CharacterType = "STORE" | "COMMISSION";

export function isStoreCharacterType(characterType?: CharacterType | null): boolean {
  return (characterType ?? "STORE") === "STORE";
}

export interface CurrentVersionSummary {
  versionId: number;
  versionNumber: number;
  previewGifUrl: string;
}

export interface DesignerCharacterItem {
  characterId: number;
  characterName: string;
  description: string | null;
  characterType?: CharacterType;
  commissionId?: number | null;
  totalVersions: number;
  currentVersion: CurrentVersionSummary | null;
  createdAt: string;
}

export interface CreateCharacterRequest {
  characterName: string;
  description?: string;
  characterType?: CharacterType;
  commissionId?: number;
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
  characterType?: CharacterType;
  commissionId?: number | null;
  createdAt: string;
}

export interface UpdateCharacterResponse {
  characterId: number;
  characterName: string;
  description: string | null;
  characterType?: CharacterType;
  commissionId?: number | null;
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
  uploadHeaders?: Record<string, string>;
  expiresAt: string;
}

export interface UploadedDesignerAsset {
  publicUrl: string;
  previewUrl?: string;
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
      if (code === "CHARACTER_TYPE_NOT_ALLOWED_FOR_STORE") {
        return "Nhân vật thuộc loại Commission không được phép đăng bán lên cửa hàng.";
      }
      if (code === "CHARACTER_TYPE_NOT_ALLOWED_FOR_COMMISSION") {
        return "Nhân vật này không hợp lệ để nộp vào Commission.";
      }
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
  characterType?: CharacterType;
  commissionId?: number;
  page?: number;
  size?: number;
} = {}): Promise<{ items: DesignerCharacterItem[]; meta: PaginationMeta }> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const trimmedQuery = params.query?.trim();

  const res = await request<ApiEnvelope<DesignerCharacterItem[]>>(OpenAPI, {
    method: "GET",
    url: "/api/management/designer/characters/my",
    query: {
      query: trimmedQuery ? trimmedQuery : undefined,
      characterType: params.characterType,
      commissionId: params.commissionId,
      page,
      size,
    },
  });
  const items = (res.data ?? []).map((item) => ({
    ...item,
    characterType: item.characterType ?? "STORE",
    commissionId: item.commissionId ?? null,
  }));
  return {
    items,
    meta: normalizePaginationMeta(res.meta, page, size, items.length),
  };
}

export async function createDesignerCharacter(
  payload: CreateCharacterRequest,
): Promise<CreateCharacterResponse> {
  const characterType = payload.characterType ?? "STORE";
  const cleanPayload: CreateCharacterRequest = {
    characterName: payload.characterName.trim(),
    description: payload.description?.trim() || undefined,
    characterType,
    commissionId:
      characterType === "COMMISSION" && payload.commissionId != null
        ? payload.commissionId
        : undefined,
  };

  const res = await request<ApiEnvelope<CreateCharacterResponse>>(OpenAPI, {
    method: "POST",
    url: "/api/management/characters",
    body: cleanPayload,
    mediaType: "application/json",
  });
  if (!res.data) {
    throw new Error("Không nhận được dữ liệu nhân vật sau khi tạo.");
  }
  markDesignerCharactersChanged();
  return res.data;
}

export async function updateDesignerCharacter(
  characterId: number,
  payload: UpdateCharacterRequest,
): Promise<UpdateCharacterResponse> {
  const cleanPayload: UpdateCharacterRequest = {
    characterName: payload.characterName.trim(),
    description: payload.description?.trim() || undefined,
  };

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
  markDesignerCharactersChanged();
  return res.data;
}

export async function deleteDesignerCharacter(characterId: number): Promise<void> {
  await request<void>(OpenAPI, {
    method: "DELETE",
    url: "/api/management/characters/{id}",
    path: { id: characterId },
  });
  markDesignerCharactersChanged();
}

export async function fetchCharacterVersions(
  characterId: number,
): Promise<CharacterVersionItem[]> {
  const res = await request<ApiEnvelope<CharacterVersionItem[]>>(OpenAPI, {
    method: "GET",
    url: "/api/management/characters/{id}/versions",
    path: { id: characterId },
  });
  return res.data ?? [];
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
  markDesignerCharactersChanged();
  return res.data;
}

export async function deleteCharacterVersion(
  characterId: number,
  versionId: number,
): Promise<void> {
  await request<void>(OpenAPI, {
    method: "DELETE",
    url: "/api/management/characters/{characterId}/versions/{versionId}",
    path: { characterId, versionId },
  });
  markDesignerCharactersChanged();
}

export async function uploadDesignerAssetFile(
  file: File,
  // Chỉ dùng cho purpose public. COMMISSION_DRAFT là media private (publicUrl = null) → dùng uploadMediaFile trong ./media và gửi objectKey.
  purpose: "CHARACTER_ASSET",
  targetId?: number,
): Promise<UploadedDesignerAsset> {
  const resolved = resolveImageMimeAndExtension(file.type, file.name);
  if (!resolved) {
    throw new Error("Chỉ hỗ trợ file ảnh định dạng GIF, PNG, JPG hoặc WEBP.");
  }
  const contentType = resolved.mimeType;
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("Kích thước file phải từ 1 byte đến tối đa 10MB.");
  }

  const previewUrl = await readFileAsDataUrl(file);

  const res = await request<ApiEnvelope<SignedUploadUrlResponse>>(OpenAPI, {
    method: "POST",
    url: "/api/media/upload-url",
    body: {
      fileName: file.name.slice(0, 255),
      contentType,
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

  // BE trả uploadHeaders (nằm trong chữ ký) → phải gửi nguyên văn khi PUT
  const putHeaders: Record<string, string> = signedData.uploadHeaders
    ? { ...signedData.uploadHeaders }
    : buildSignedPutHeaders(signedData.signedUploadUrl, contentType);
  if (!putHeaders["Content-Type"]) {
    putHeaders["Content-Type"] = contentType;
  }

  const putResponse = await fetch(signedData.signedUploadUrl, {
    method: "PUT",
    headers: putHeaders,
    body: file.slice(0, file.size, putHeaders["Content-Type"]),
  });

  if (!putResponse.ok) {
    console.error("[designerCharacters.uploadDesignerAssetFile] PUT failed", {
      purpose,
      targetId,
      objectKey: signedData.objectKey,
      status: putResponse.status,
      contentType: putHeaders["Content-Type"],
    });
    throw new Error(`Tải tệp lên kho lưu trữ thất bại (HTTP ${putResponse.status}).`);
  }

  return {
    publicUrl: signedData.publicUrl,
    previewUrl,
  };
}

