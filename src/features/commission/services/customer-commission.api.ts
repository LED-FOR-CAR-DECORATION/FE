import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import type { PublicCommissionPricingResponse } from "@/api_client/models/PublicCommissionPricingResponse";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { uploadMediaFile } from "@/lib/api/media";
import type { PaymentSessionResponse } from "@/api_client/models/PaymentSessionResponse";
import type { CommissionMessage } from "@/features/commission-chat/services/commission-messages.api";
import { ENTITLEMENTS_CHANGED_EVENT } from "@/features/character/services/entitlement.service";

type CommissionSubmission = {
  title: string;
  description: string;
  tierCode: string;
  openPaymentImmediately: boolean;
  selectedOptions: { configId: number; optionIds?: number[]; quantity?: number; textValue?: string }[];
  attachments: { imageUrl: string }[];
};

export function getCommissionPricing() {
  return request<{ data: PublicCommissionPricingResponse }>(OpenAPI, {
    method: "GET",
    url: "/api/commissions/pricing",
  });
}

export function submitCommission(body: CommissionSubmission) {
  return request<{ data: CustomerCommissionDetailResponse }>(OpenAPI, {
    method: "POST",
    url: "/api/commissions",
    mediaType: "application/json",
    body,
  });
}

export function getCustomerCommission(id: number) {
  return request<{ data: CustomerCommissionDetailResponse & { estimatedDeliveryAt?: string | null } }>(OpenAPI, {
    method: "GET", url: "/api/commissions/{id}", path: { id },
  });
}

export async function uploadCommissionReference(file: File) {
  const uploaded = await uploadMediaFile(file, "COMMISSION_REFERENCE");
  if (uploaded.localPreviewUrl) URL.revokeObjectURL(uploaded.localPreviewUrl);
  if (!uploaded.objectKey) throw new Error("Không nhận được mã ảnh tham khảo.");
  return { imageUrl: uploaded.objectKey };
}

/** CMS-18: khách chấp nhận bản xem trước mới nhất → COMPLETED. */
export async function approveDeliverableCard(id: number) {
  const response = await request<{ data: {
    commissionId: number; commissionStatus: string; approvedSubmissionId: number; versionNumber: number;
    completedAt?: string | null; systemMessage?: CommissionMessage | null;
  } }>(OpenAPI, { method: "POST", url: "/api/commissions/{id}/deliverable-card/approve", path: { id } });
  if (response.data.commissionStatus === "COMPLETED" && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENTITLEMENTS_CHANGED_EVENT));
  }
  return response;
}

/** CMS-20: miễn phí → AWAITING_ESTIMATE; có phí → AWAITING_EXTRA_PAYMENT, sau thanh toán mới chờ designer dự kiến thời gian. */
export function confirmRevisionCard(id: number, messageId: number) {
  return request<{ data: {
    commissionId: number; status: string; revisionsUsed: number; extraRevisionFee: number;
    paymentSession?: PaymentSessionResponse | null;
  } }>(OpenAPI, {
    method: "POST", url: "/api/commissions/{id}/revision-card/confirm", path: { id },
    mediaType: "application/json", body: { messageId },
  });
}

/** CMS-22: khách hủy phiên thanh toán phí chỉnh sửa đang chờ → PREVIEW_DELIVERED (trả về 204). */
export function cancelRevisionCheckout(id: number) {
  return request<void>(OpenAPI, { method: "POST", url: "/api/commissions/{id}/revision-card/cancel", path: { id } });
}
