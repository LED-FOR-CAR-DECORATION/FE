import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { uploadMediaFile } from "@/lib/api/media";

/** CMS-11 / CMS-12 — lịch sử và gửi tin nhắn trong phòng chat Commission. */

export type CommissionMessageType = "TEXT" | "IMAGE" | "DELIVERABLE_CARD" | "EXTRA_FEE_CARD" | "SYSTEM";
export type CommissionSenderRole = "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | "SYSTEM";

export interface CommissionMessage {
  messageId: number;
  commissionId: number;
  senderId: number | null;
  senderRole: CommissionSenderRole | string;
  messageType: CommissionMessageType | string;
  content: string | null;
  mediaUrl: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface SendCommissionMessageBody {
  messageType: "TEXT" | "IMAGE";
  content?: string;
  mediaUrl?: string | null;
}

export const MAX_MESSAGE_LENGTH = 2000;

/** Trạng thái cho phép GỬI tin (status.isChatActive() ở BE). */
export const CHAT_ACTIVE_STATUSES = new Set([
  "PAID",
  "IN_PROGRESS",
  "INTERNAL_REVIEW",
  "INTERNAL_REVISION_REQUIRED",
  "PREVIEW_DELIVERED",
  "AWAITING_EXTRA_PAYMENT",
  "AWAITING_ESTIMATE",
]);

/** Trạng thái cho phép XEM lịch sử (chat active hoặc COMPLETED). */
export function canReadHistory(status?: string | null) {
  return Boolean(status && (CHAT_ACTIVE_STATUSES.has(status) || status === "COMPLETED"));
}

export function listCommissionMessages(commissionId: number) {
  return request<{ data: CommissionMessage[] }>(OpenAPI, {
    method: "GET",
    url: "/api/commissions/{id}/messages",
    path: { id: commissionId },
  });
}

export function sendCommissionMessage(commissionId: number, body: SendCommissionMessageBody) {
  return request<{ data: CommissionMessage }>(OpenAPI, {
    method: "POST",
    url: "/api/commissions/{id}/messages",
    path: { id: commissionId },
    mediaType: "application/json",
    body,
  });
}

/** Upload ảnh chat qua MED-01 (purpose = COMMISSION_CHAT), trả về publicUrl để gửi kèm messageType IMAGE. */
export async function uploadCommissionChatImage(commissionId: number, file: File) {
  const uploaded = await uploadMediaFile(file, "COMMISSION_CHAT", commissionId);
  if (uploaded.localPreviewUrl) URL.revokeObjectURL(uploaded.localPreviewUrl);
  if (!uploaded.objectKey) throw new Error("Không nhận được mã ảnh chat.");
  return uploaded.objectKey;
}

/** Gộp + khử trùng lặp theo messageId, sắp xếp createdAt ASC (REST và STOMP có thể trả cùng một tin). */
export function mergeMessages(current: CommissionMessage[], incoming: CommissionMessage[]) {
  const byId = new Map<number, CommissionMessage>();
  for (const message of current) byId.set(message.messageId, message);
  for (const message of incoming) byId.set(message.messageId, message);
  return [...byId.values()].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return diff !== 0 ? diff : a.messageId - b.messageId;
  });
}

export function parseMetadata(metadataJson: string | null): Record<string, unknown> | null {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
