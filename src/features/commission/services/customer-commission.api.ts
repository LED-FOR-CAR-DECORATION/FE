import axios from "axios";
import type { CustomerCommissionDetailResponse } from "@/api_client/models/CustomerCommissionDetailResponse";
import type { PublicCommissionPricingResponse } from "@/api_client/models/PublicCommissionPricingResponse";
import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import { buildSignedPutHeaders } from "@/lib/api/media";
import type { PaymentSessionResponse } from "@/api_client/models/PaymentSessionResponse";
import type { CommissionMessage } from "@/features/commission-chat/services/commission-messages.api";

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

export async function uploadCommissionReference(file: File) {
  const { data } = await request<{ data: { signedUploadUrl: string; publicUrl: string } }>(OpenAPI, {
    method: "POST",
    url: "/api/media/upload-url",
    mediaType: "application/json",
    body: { purpose: "COMMISSION_REFERENCE", fileName: file.name, fileSize: file.size, contentType: file.type },
  });
  await axios.put(data.signedUploadUrl, file, {
    headers: buildSignedPutHeaders(data.signedUploadUrl, file.type),
  });
  return { imageUrl: data.publicUrl };
}

/** CMS-18: khách chấp nhận bản xem trước mới nhất → COMPLETED. */
export function approveDeliverableCard(id: number) {
  return request<{ data: {
    commissionId: number; commissionStatus: string; approvedSubmissionId: number; versionNumber: number;
    completedAt?: string | null; systemMessage?: CommissionMessage | null;
  } }>(OpenAPI, { method: "POST", url: "/api/commissions/{id}/deliverable-card/approve", path: { id } });
}

/** CMS-20: khách xác nhận thẻ yêu cầu chỉnh sửa mới nhất. Còn lượt miễn phí → CUSTOMER_REVISION_REQUESTED; hết lượt → AWAITING_EXTRA_PAYMENT kèm phiên thanh toán. */
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
