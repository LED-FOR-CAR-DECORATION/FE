import { request } from "@/api_client/core/request";
import { OpenAPI } from "@/lib/api/client";
import type { CommissionMessage } from "@/features/commission-chat/services/commission-messages.api";

const endpoint = "/api/management/commissions";

export type CommissionQueueItem = {
  commissionId: number;
  customerId?: number;
  title: string;
  status: string;
  customerName?: string | null;
  customerEmail?: string | null;
  tierCode?: string | null;
  targetMatrixDimensions?: string | null;
  initialPrice?: number;
  extraRevisionFee?: number;
  totalPrice?: number;
  revisionsUsed?: number;
  maxRevisions?: number;
  assignedStaffName?: string | null;
  assignedStaffId?: number | null;
  assignedDesignerName?: string | null;
  assignedDesignerId?: number | null;
  isSlaOverdue?: boolean;
  quoteExpiresAt?: string | null;
  slaDueAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CommissionManagementDetail = CommissionQueueItem & {
  description?: string | null;
  attachments?: { attachmentId: number; imageUrl: string; caption?: string | null }[];
  customerPhone?: string | null;
  revisionsUsed?: number;
  maxRevisions?: number;
  chatActive?: boolean;
  autoCompleteAt?: string | null;
  activePaymentCode?: string | null;
  approvedSubmissionId?: number | null;
  rejectionReason?: string | null;
  submissions?: CommissionSubmissionItem[];
  revisionRequests?: CommissionRevisionRequest[];
};

export type CommissionRevisionRequest = {
  revisionRequestId: number;
  messageId: number;
  revisionNumber: number;
  description: string;
  usesFreeQuota: boolean;
  revisionFee: number;
  status: string;
  estimatedHours?: number | null;
  estimateSource?: string | null;
  designerDueAt?: string | null;
  customerDueAt?: string | null;
};

export type CommissionSubmissionItem = {
  submissionId: number;
  designerId?: number;
  versionNumber: number;
  imageUrl: string;
  designerNote?: string | null;
  characterVersionId?: number | null;
  revisionRequestId?: number | null;
  designerName?: string | null;
  status: string;
  staffReviewNote?: string | null;
  reviewerStaffName?: string | null;
  reviewedAt?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
};

export type CommissionQueueMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type CommissionQueueQueryOptions = {
  page?: number;
  size?: number;
  status?: string;
  sortDirection?: "ASC" | "DESC";
  assigned?: boolean;
};

export type DesignerOption = { designerId: number; fullName: string };

export type DesignerQueryOptions = {
  search?: string;
  page?: number;
  size?: number;
};

export function getCommissionQueue(
  pageOrOptions: number | CommissionQueueQueryOptions,
  assignedLegacy = false,
) {
  const opts: CommissionQueueQueryOptions =
    typeof pageOrOptions === "number"
      ? { page: pageOrOptions, assigned: assignedLegacy }
      : pageOrOptions;
  const page = opts.page ?? 0;
  const size = opts.size ?? 20;
  const assigned = Boolean(opts.assigned);
  return request<{ data: CommissionQueueItem[]; meta?: CommissionQueueMeta }>(OpenAPI, {
    method: "GET",
    url: assigned ? endpoint + "/assigned" : endpoint,
    query: {
      page,
      size,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.sortDirection ? { sortDirection: opts.sortDirection } : {}),
    },
  });
}

export function getManagementCommission(id: number) {
  return request<{ data: CommissionManagementDetail }>(OpenAPI, {
    method: "GET", url: endpoint + "/{id}", path: { id },
  });
}

export function listCommissionDesigners(options?: DesignerQueryOptions) {
  return request<{ data: DesignerOption[]; meta?: CommissionQueueMeta }>(OpenAPI, {
    method: "GET",
    url: endpoint + "/designers",
    ...(options
      ? {
          query: {
            ...(options.search?.trim() ? { search: options.search.trim() } : {}),
            ...(options.page !== undefined ? { page: options.page } : {}),
            ...(options.size !== undefined ? { size: options.size } : {}),
          },
        }
      : {}),
  });
}

export function approveCommission(id: number) {
  return request(OpenAPI, { method: "POST", url: endpoint + "/{id}/approve", path: { id } });
}

export function rejectCommission(id: number, rejectionReason: string) {
  return request(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/reject", path: { id },
    mediaType: "application/json", body: { rejectionReason },
  });
}

export function assignCommissionDesigner(id: number, designerId: number) {
  return request(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/assign", path: { id }, mediaType: "application/json", body: { designerId },
  });
}

export function estimateCommissionRevision(id: number, estimatedHours: number) {
  return request(OpenAPI, {
    method: "PATCH", url: endpoint + "/{id}/estimate", path: { id },
    mediaType: "application/json", body: { estimatedHours },
  });
}

export function reassignCommission(id: number, body: { staffId?: number; designerId?: number; reason: string }) {
  return request(OpenAPI, {
    method: "PATCH", url: endpoint + "/{id}/reassign", path: { id }, mediaType: "application/json", body,
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

/** CMS-15: designer được giao nộp bản nháp từ phiên bản nhân vật COMMISSION (ảnh upload qua MED-01 purpose COMMISSION_DRAFT) → INTERNAL_REVIEW. */
export function uploadCommissionDraft(
  id: number,
  body: { imageUrl: string; designerNote?: string; characterVersionId: number },
) {
  return request<{ data: {
    submissionId: number; commissionId: number; versionNumber: number; imageUrl: string;
    designerNote?: string | null; characterVersionId?: number | null; submissionStatus: string; commissionStatus: string; createdAt?: string | null;
  } }>(OpenAPI, {
    method: "POST", url: endpoint + "/{id}/drafts", path: { id }, mediaType: "application/json", body,
  });
}
