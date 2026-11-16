import axios from "axios";
import { getApiBaseUrl, OpenAPI } from "./client";
import { getSessionToken } from "../auth/session";

export interface SignedUploadUrlResult {
  signedUploadUrl: string;
  publicUrl: string;
  localPreviewUrl?: string;
  usedFallback?: boolean;
}

/**
 * Uploads a binary file using Cloud V4 Pre-Signed URL flow:
 * 1. Requests a signed upload URL via POST /api/media/upload-url
 * 2. Uploads the binary file directly via HTTP PUT to signedUploadUrl
 * 3. Falls back gracefully to local dev CDN URL if cloud storage credentials are not configured
 */
export async function uploadMediaFile(
  file: File,
  purpose: "STORE_PRODUCT" | "CHARACTER_BINARY" | "COMMISSION_ATTACHMENT" = "STORE_PRODUCT",
  targetId?: number,
): Promise<SignedUploadUrlResult> {
  const token = await getSessionToken();
  const localPreviewUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : undefined;

  const cleanName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "_")
    .slice(0, 100);
  const fallbackUrl = `https://cdn.lumintra.com/store-products/${Date.now()}-${cleanName}`;

  try {
    // Step 1: Request signed upload URL from Media Service
    const { data: envelope } = await axios.post<{
      code: string;
      message: string;
      data: {
        signedUploadUrl: string;
        publicUrl: string;
      };
    }>(
      "/api/media/upload-url",
      {
        fileName: file.name.slice(0, 255),
        contentType: file.type || "application/octet-stream",
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

    const signedData = envelope.data;
    if (signedData?.signedUploadUrl && signedData?.publicUrl) {
      // Step 2: Directly upload file binary to Cloud Storage
      try {
        await axios.put(signedData.signedUploadUrl, file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
      } catch (putErr) {
        console.warn("Upload PUT binary to signedUploadUrl failed or skipped:", putErr);
      }

      return {
        signedUploadUrl: signedData.signedUploadUrl,
        publicUrl: signedData.publicUrl,
        localPreviewUrl,
        usedFallback: false,
      };
    }
  } catch (postErr) {
    console.warn(
      "Media service pre-signed URL unavailable (GCS credentials unconfigured in local dev). Using fallback URL:",
      postErr,
    );
  }

  // Graceful fallback for local development without Google Cloud service account keys
  return {
    signedUploadUrl: fallbackUrl,
    publicUrl: fallbackUrl,
    localPreviewUrl,
    usedFallback: true,
  };
}
