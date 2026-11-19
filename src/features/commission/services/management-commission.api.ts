import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import type { CommissionMessage } from "@/features/commission-chat/services/commission-messages.api";

const endpoint = "/api/management/commissions";

export type CommissionQueueItem = {
  commissionId: number;
  title: string;
  status: string;
  customerName?: string | null;
  targetMatrixDimensions?: string | null;
  totalPrice?: number;
  assignedStaffName?: string | null;
  assignedDesignerName?: string | null;
};

export type CommissionManagementDetail = CommissionQueueItem & {
  description?: string | null;
  attachments?: { attachmentId: number; imageUrl: string; caption?: string | null }[];
  customerPhone?: string | null;
  tierCode?: string | null;
  initialPrice?: number;
  extraRevisionFee?: number;
  revisionsUsed?: number;
  maxRevisions?: number;
  chatActive?: boolean;
  slaDueAt?: string | null;
  createdAt?: string | null;
  autoCompleteAt?: string | null;
  submissions?: CommissionSubmissionItem[];
};

export type CommissionSubmissionItem = {
  submissionId: number;
  versionNumber: number;
  imageUrl: string;
  designerNote?: string | null;
  designerName?: string | null;
  status: string;
  staffReviewNote?: string | null;
  reviewerStaffName?: string | null;
  reviewedAt?: string | null;
  deliveredAt?: string | null;
};

export type DesignerOption = { designerId: number; fullName: string };

export function getCommissionQueue(page: number, assigned: boolean) {
  return request<{ data: CommissionQueueItem[]; meta?: { hasNext: boolean } }>(OpenAPI, {
    method: "GET",
    url: assigned ? endpoint + "/assigned" : endpoint,
    query: { page, size: 20 },
  });
}

export function getManagementCommission(id: number) {
  return request<{ data: CommissionManagementDetail }>(OpenAPI, {
    method: "GET", url: endpoint + "/{id}", path: { id },
  });
}

export function listCommissionDesigners() {
  return request<{ data: DesignerOption[] }>(OpenAPI, { method: "GET", url: endpoint + "/designers" });
}

export function approveCommission(id: number) {
  return request(OpenAPI, { method: "POST", url: endpoint + "/{id}/approve", path: { id } });
}

export function assignCommissionDesigner(id: number, designerId: number) {
  return request(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/assign", path: { id }, mediaType: "application/json", body: { designerId },
  });
}

/** CMS-17: duyệt bản nháp mới nhất đang PENDING_STAFF_REVIEW, đăng Deliverable Card vào chat, INTERNAL_REVIEW → PREVIEW_DELIVERED. */
export function postDeliverableCard(id: number) {
  return request<{ data: { commissionId: number; commissionStatus: string; approvedSubmissionId: number; versionNumber: number; autoCompleteAt?: string | null } }>(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/deliverable-card", path: { id },
  });
}

/** CMS-16: trả bản nháp về designer kèm ghi chú nội bộ, INTERNAL_REVIEW → INTERNAL_REVISION_REQUIRED. */
export function rejectCommissionDraft(id: number, body: { submissionId?: number; reviewNote: string }) {
  return request(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/reviews", path: { id }, mediaType: "application/json", body,
  });
}

/** CMS-19: staff phụ trách gửi thẻ yêu cầu chỉnh sửa (EXTRA_FEE_CARD) khi commission ở PREVIEW_DELIVERED. */
export function postRevisionCard(id: number, brief: string) {
  return request<{ data: CommissionMessage }>(OpenAPI, {
    method: "POST", url: "/api/management/commissions/{id}/revision-card", path: { id },
    mediaType: "application/json", body: { brief },
  });
}
