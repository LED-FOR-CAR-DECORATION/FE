import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export type MediaPurposeType =
  | "STORE_PRODUCT"
  | "CHARACTER_ASSET"
  | "COMMISSION_REFERENCE"
  | "COMMISSION_CHAT"
  | "COMMISSION_DRAFT"
  | "WARRANTY_EVIDENCE";

export interface SignedUploadUrlResult {
  signedUploadUrl: string;
  /** Chỉ có với purpose public (CHARACTER_ASSET, STORE_PRODUCT); purpose private trả về "" */
  publicUrl: string;
  /** Với purpose private (COMMISSION_*, WARRANTY_EVIDENCE) phải gửi objectKey này cho endpoint phía sau */
  objectKey?: string;
  uploadHeaders?: Record<string, string>;
  expiresAt?: string;
  localPreviewUrl?: string;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function buildSignedPutHeaders(
  signedUploadUrl: string,
  contentType: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };

  try {
    const parsed = new URL(signedUploadUrl);
    const signedHeaders = (
      parsed.searchParams.get("X-Goog-SignedHeaders") ?? ""
    ).toLowerCase();

    if (signedHeaders.includes("cache-control")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }
    if (signedHeaders.includes("x-goog-content-length-range")) {
      headers["x-goog-content-length-range"] = "0,10485760";
    }
  } catch {
    // Keep Content-Type only if URL parsing fails
  }

  return headers;
}

/**
 * Uploads an image file following the Lumintra Media Service V4 Signed URL flow:
 * 1. Validate MIME type (JPEG/PNG/WEBP/GIF) & file size (1B - 10MB)
 * 2. POST /api/media/upload-url -> get { signedUploadUrl, publicUrl, objectKey, uploadHeaders, expiresAt }
 * 3. PUT file binary directly to signedUploadUrl, sending every uploadHeaders entry verbatim
 * 4. Public purposes (CHARACTER_ASSET, STORE_PRODUCT): save publicUrl.
 *    Private purposes (COMMISSION_REFERENCE, COMMISSION_CHAT, COMMISSION_DRAFT, WARRANTY_EVIDENCE):
 *    publicUrl is null → send objectKey downstream; BE returns short-lived signed view URLs on read.
 */
export async function uploadMediaFile(
  file: File,
  purpose: MediaPurposeType = "STORE_PRODUCT",
  targetId?: number,
): Promise<SignedUploadUrlResult> {
  const contentType = (file.type || "").trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
    throw new Error(
      "Định dạng ảnh không hợp lệ. Chỉ hỗ trợ PNG, JPG/JPEG, WEBP hoặc GIF.",
    );
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Dung lượng ảnh phải từ 1 byte đến tối đa 10MB.");
  }

  const token = await getSessionToken();

  // Step 1: Request signed upload URL from Media Service
  let signedData: {
    signedUploadUrl: string;
    publicUrl: string;
    objectKey?: string;
    uploadHeaders?: Record<string, string>;
    expiresAt?: string;
  } | undefined;

  try {
    const { data: envelope } = await axios.post<{
      code: string;
      message: string;
      data: {
        signedUploadUrl: string;
        publicUrl: string;
        objectKey?: string;
        uploadHeaders?: Record<string, string>;
        expiresAt?: string;
      };
    }>(
      "/api/media/upload-url",
      {
        fileName: file.name.slice(0, 255),
        contentType,
        fileSize: file.size,
        purpose,
        targetId,
      },
      {
        baseURL: getApiBaseUrl(),
        withCredentials: OpenAPI.WITH_CREDENTIALS,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );
    signedData = envelope?.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message;
    if (status === 401) {
      throw new Error("Phiên đăng nhập hết hạn (401). Vui lòng đăng nhập lại.");
    }
    if (status === 403) {
      throw new Error("Tài khoản không có quyền upload ảnh cho mục đích này (403).");
    }
    if (status === 500) {
      throw new Error(
        "Backend Media Service lỗi 500 khi ký URL upload .",
      );
    }
    throw new Error(
      serverMsg || `Không thể xin URL upload từ Media Service (${status ?? "lỗi mạng"}).`,
    );
  }

  const privatePurpose = ["COMMISSION_REFERENCE", "COMMISSION_CHAT", "COMMISSION_DRAFT", "WARRANTY_EVIDENCE"].includes(purpose);
  if (!signedData?.signedUploadUrl || (privatePurpose ? !signedData.objectKey : !signedData.publicUrl)) {
    throw new Error("Media Service không trả về signedUploadUrl hoặc publicUrl hợp lệ.");
  }

  // Step 2: PUT binary file directly to Cloud Storage signedUploadUrl
  if (privatePurpose && !signedData.uploadHeaders) {
    throw new Error("Máy chủ chưa trả về thông tin tải ảnh riêng tư. Vui lòng thử lại.");
  }
  const putHeaders = signedData.uploadHeaders ?? buildSignedPutHeaders(signedData.signedUploadUrl, contentType);
  const putResponse = await fetch(signedData.signedUploadUrl, {
    method: "PUT",
    headers: putHeaders,
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(
      `Tải tệp ảnh lên Cloud Storage thất bại (HTTP ${putResponse.status}).`,
    );
  }

  return {
    signedUploadUrl: signedData.signedUploadUrl,
    publicUrl: signedData.publicUrl ?? "",
    objectKey: signedData.objectKey,
    uploadHeaders: signedData.uploadHeaders,
    expiresAt: signedData.expiresAt,
    localPreviewUrl: typeof window !== "undefined" ? URL.createObjectURL(file) : undefined,
  };
}
